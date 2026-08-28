import {
  BadGatewayException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { ScheduleVisitDto } from './dto/schedule-visit.dto';
import { ConvertToLeadDto } from './dto/convert-to-lead.dto';
import { buildVisitNote, statusAfterVisit } from './visit-note';
import { LeadsService } from '../leads/leads.service';
import { Lead } from '../leads/entities/lead.entity';
import { TenantsService } from '../tenants/tenants.service';
import { WhapiService } from '../webhooks/whapi.service';
import { InstagramService } from '../webhooks/instagram.service';
import { TenantContext, TenantScopeService } from '../common/tenant';

/** Nota interna del equipo: se ve en el CRM y nunca sale hacia el cliente. */
export const NOTE_SENDER_TYPE = 'note';

/** Canales por los que el CRM sabe entregar. El resto solo se guarda. */
const OUTBOUND_CHANNELS = ['whatsapp', 'instagram'];

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly tenantScope: TenantScopeService,
    private readonly leadsService: LeadsService,
    private readonly tenantsService: TenantsService,
    private readonly whapiService: WhapiService,
    private readonly instagramService: InstagramService,
  ) {}

  async createConversation(dto: CreateConversationDto): Promise<Conversation> {
    const conv = this.conversationRepo.create(dto);
    return this.conversationRepo.save(conv);
  }

  async findAllConversations(ctx: TenantContext): Promise<Conversation[]> {
    return this.tenantScope
      .scoped(Conversation, 'conversation', ctx)
      .leftJoinAndSelect('conversation.lead', 'lead')
      .leftJoinAndSelect('conversation.assigned_agent', 'assigned_agent')
      .orderBy('conversation.last_message_at', 'DESC')
      .addOrderBy('conversation.created_at', 'DESC')
      .getMany();
  }

  async findConversationById(id: string): Promise<Conversation> {
    const conv = await this.conversationRepo.findOne({
      where: { id },
      relations: ['lead', 'assigned_agent', 'messages'],
    });
    if (!conv) throw new NotFoundException(`Conversation ${id} not found`);
    return conv;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    await this.conversationRepo.update(id, updates);
    return this.findConversationById(id);
  }

  async findOrCreateByPhone(phone: string, channel = 'whatsapp', contactName?: string, tenantId?: string): Promise<Conversation> {
    const where: any = { contact_phone: phone, channel };
    if (tenantId) where.tenant_id = tenantId;

    let conv = await this.conversationRepo.findOne({
      where,
      order: { created_at: 'DESC' },
    });
    if (!conv) {
      conv = this.conversationRepo.create({
        contact_phone: phone,
        contact_name: contactName || phone,
        channel,
        whatsapp_waid: phone,
        status: 'open',
        tenant_id: tenantId ?? null,
      });
      conv = await this.conversationRepo.save(conv);
    }
    return conv;
  }

  async addMessage(conversationId: string, dto: CreateMessageDto): Promise<Message> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException(`Conversation ${conversationId} not found`);

    const msg = this.messageRepo.create({ ...dto, conversation_id: conversationId });
    const saved = await this.messageRepo.save(msg);

    // Update conversation snapshot
    const snapshot: Partial<Conversation> = {
      last_message: dto.content.substring(0, 200),
      last_message_at: new Date(),
      unread_count: dto.sender_type === 'user' ? conv.unread_count + 1 : conv.unread_count,
    };

    // La ventana de reactivación se mide desde la última actividad del asesor,
    // no desde la pausa. Por WhatsApp cada mensaje suyo pasa por `pauseNova` y
    // resella; desde el CRM llega por aquí, y sin esto Nova reaparecería 12h
    // después del botón aunque el asesor siguiera escribiendo.
    if (dto.sender_type === 'agent' && conv.nova_paused) {
      snapshot.nova_paused_at = new Date();
    }

    await this.conversationRepo.update(conversationId, snapshot);

    return saved;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * El historial que ve Nova: sin las notas internas. Una nota del asesor
   * ("el cliente pidió descuento") entraría en el prompt como si la hubiera
   * dicho Nova, y acabaría repitiéndosela al prospecto.
   */
  async getMessagesForNova(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversation_id: conversationId, sender_type: Not(NOTE_SENDER_TYPE) },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Guarda una nota interna. No toca `last_message` ni `unread_count`: no es un
   * mensaje de la conversación, y mover `last_message_at` le haría creer a Nova
   * que el prospecto lleva menos tiempo en silencio del que lleva.
   */
  private async saveNote(
    conversationId: string,
    content: string,
    author: string,
    metadata?: object,
  ): Promise<Message> {
    const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
    if (!conv) throw new NotFoundException(`Conversation ${conversationId} not found`);

    return this.messageRepo.save(
      this.messageRepo.create({
        conversation_id: conversationId,
        content,
        sender_type: NOTE_SENDER_TYPE,
        sender_name: author,
        is_read: true,
        metadata,
      }),
    );
  }

  async markAsRead(conversationId: string): Promise<void> {
    await this.messageRepo.update(
      { conversation_id: conversationId, is_read: false, sender_type: 'user' },
      { is_read: true },
    );
    await this.conversationRepo.update(conversationId, { unread_count: 0 });
  }

  /**
   * Unifica una conversación que quedó bajo un identificador antiguo con la
   * del identificador actual del mismo contacto.
   *
   * Pasa cuando un prospecto escribe siendo un desconocido —WhatsApp lo
   * identifica solo por su LID— y más tarde el asesor lo guarda en la agenda:
   * desde ese momento el LID resuelve a su teléfono y, sin esto, sus mensajes
   * nuevos abrirían una segunda conversación. Quedarían dos memorias de la
   * misma persona, y pausar una no silenciaría la otra.
   *
   * Los mensajes se mueven, nunca se borran.
   */
  async mergeConversationIdentity(
    oldKey: string,
    newKey: string,
    tenantId?: string,
  ): Promise<void> {
    if (!oldKey || !newKey || oldKey === newKey) return;

    const where: any = { contact_phone: oldKey, channel: 'whatsapp' };
    if (tenantId) where.tenant_id = tenantId;

    const vieja = await this.conversationRepo.findOne({ where });
    if (!vieja) return;

    const destinoWhere: any = { contact_phone: newKey, channel: 'whatsapp' };
    if (tenantId) destinoWhere.tenant_id = tenantId;
    const destino = await this.conversationRepo.findOne({ where: destinoWhere });

    if (!destino) {
      // No hay con qué fusionar: basta con reetiquetarla, y así conserva su
      // historial, su estado de pausa y su resumen.
      await this.conversationRepo.update(vieja.id, {
        contact_phone: newKey,
        whatsapp_waid: newKey,
      });
      return;
    }

    await this.messageRepo.update(
      { conversation_id: vieja.id },
      { conversation_id: destino.id },
    );
    await this.conversationRepo.delete(vieja.id);
  }

  /**
   * Silencia a Nova en esta conversación y sella quién y cuándo. El sello de
   * tiempo es la base de la ventana de reactivación automática.
   */
  async pauseNova(
    conversationId: string,
    by: 'whatsapp' | 'crm',
  ): Promise<void> {
    await this.conversationRepo.update(conversationId, {
      nova_paused: true,
      nova_paused_at: new Date(),
      nova_paused_by: by,
      // Un asesor que entra al chat ya está atendiendo: la señal de que hace
      // falta una persona deja de aplicar.
      needs_human: false,
    });
  }

  /**
   * Marca que la conversación conviene que la vea un asesor, SIN silenciar a
   * Nova. Nova solo se pausa por decisión de una persona —comando o botón—:
   * callarse sola dejaba al prospecto sin respuesta si nadie miraba el CRM.
   */
  async markNeedsHuman(conversationId: string): Promise<void> {
    await this.conversationRepo.update(conversationId, { needs_human: true });
  }

  /** Devuelve el control a Nova y limpia el estado de pausa. */
  async resumeNova(conversationId: string): Promise<void> {
    await this.conversationRepo.update(conversationId, {
      nova_paused: false,
      nova_paused_at: null,
      nova_paused_by: null,
      needs_human: false,
    });
  }

  // --- Request-facing wrappers -------------------------------------------
  // The methods above are system-level: the webhook controllers resolve the
  // tenant from the inbound payload before calling them. Anything reached
  // from a logged-in CRM request must go through these instead.

  async createConversationForTenant(dto: CreateConversationDto, ctx: TenantContext): Promise<Conversation> {
    const conv = this.conversationRepo.create({
      ...dto,
      tenant_id: ctx.isSuperAdmin ? ((dto as any).tenant_id ?? null) : ctx.tenantId,
    });
    return this.conversationRepo.save(conv);
  }

  async findConversationForTenant(id: string, ctx: TenantContext): Promise<Conversation> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    return this.findConversationById(id);
  }

  async getMessagesForTenant(conversationId: string, ctx: TenantContext): Promise<Message[]> {
    await this.tenantScope.assertAccess(Conversation, conversationId, ctx);
    return this.getMessages(conversationId);
  }

  async addMessageForTenant(conversationId: string, dto: CreateMessageDto, ctx: TenantContext): Promise<Message> {
    await this.tenantScope.assertAccess(Conversation, conversationId, ctx);

    // Lo que escribe el asesor en la bandeja se entrega ANTES de guardarlo.
    // Guardarlo igual lo deja creyendo que el cliente lo leyó, cuando en su
    // WhatsApp no llegó nada: es el mismo criterio con el que Nova solo guarda
    // lo que consiguió enviar. Lo que llega de Nova o del webhook ya salió por
    // su cuenta y no se reenvía.
    if (dto.sender_type === 'agent') {
      const conv = await this.conversationRepo.findOne({ where: { id: conversationId } });
      if (!conv) throw new NotFoundException(`Conversation ${conversationId} not found`);
      await this.deliver(conv, dto.content);
    }

    return this.addMessage(conversationId, dto);
  }

  /**
   * Entrega el mensaje del asesor por el canal de la conversación, con las
   * credenciales del tenant dueño. Un canal sin salida (webchat, email) se
   * guarda sin más; si el canal sí tiene salida y la entrega falla, lanza.
   */
  private async deliver(conv: Conversation, content: string): Promise<void> {
    if (!OUTBOUND_CHANNELS.includes(conv.channel)) return;

    const to = conv.contact_phone || conv.whatsapp_waid;
    if (!to) {
      throw new BadGatewayException(
        'No se pudo entregar el mensaje: esta conversación no tiene un destinatario.',
      );
    }

    const tenant = await this.tenantsService.findByIdOrNull(conv.tenant_id);

    const delivered =
      conv.channel === 'instagram'
        ? await this.instagramService.sendText(
            to,
            content,
            tenant?.instagram_token,
            tenant?.instagram_account_id,
          )
        : await this.whapiService.sendText(to, content, tenant?.whapi_token);

    if (!delivered) {
      throw new BadGatewayException(
        `No se pudo entregar el mensaje por ${conv.channel}. No se guardó: vuelve a intentarlo.`,
      );
    }
  }

  async markAsReadForTenant(conversationId: string, ctx: TenantContext): Promise<void> {
    await this.tenantScope.assertAccess(Conversation, conversationId, ctx);
    return this.markAsRead(conversationId);
  }

  async updateConversationForTenant(id: string, updates: Partial<Conversation>, ctx: TenantContext): Promise<Conversation> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    return this.updateConversation(id, updates);
  }

  async pauseNovaForTenant(id: string, ctx: TenantContext): Promise<Conversation> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    await this.pauseNova(id, 'crm');
    return this.findConversationById(id);
  }

  async resumeNovaForTenant(id: string, ctx: TenantContext): Promise<Conversation> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    await this.resumeNova(id);
    return this.findConversationById(id);
  }

  // ─── Acciones rápidas de la bandeja ────────────────────────────────────────

  async addNoteForTenant(
    id: string,
    dto: CreateNoteDto,
    ctx: TenantContext,
  ): Promise<Message> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    return this.saveNote(id, dto.content.trim(), dto.author?.trim() || 'Asesor');
  }

  /**
   * Agenda una visita: queda como nota interna con la fecha y, si el lead
   * todavía está al principio del embudo, lo adelanta a "pendiente".
   */
  async scheduleVisitForTenant(
    id: string,
    dto: ScheduleVisitDto,
    ctx: TenantContext,
  ): Promise<{ note: Message; lead_status?: string }> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    const conv = await this.findConversationById(id);

    const note = await this.saveNote(
      id,
      buildVisitNote(dto.scheduled_at, dto.notes),
      dto.author?.trim() || 'Asesor',
      { type: 'visit', scheduled_at: dto.scheduled_at },
    );

    let leadStatus: string | undefined;
    if (conv.lead_id) {
      const lead = await this.leadsService.findOne(conv.lead_id, ctx);
      const next = statusAfterVisit(lead.status);
      if (next) {
        await this.leadsService.update(lead.id, { status: next }, ctx);
        leadStatus = next;
      }
    }

    return { note, lead_status: leadStatus };
  }

  /**
   * Convierte la conversación en lead y los deja enlazados. El proyecto lo
   * elige quien pulsa el botón y se valida contra su tenant, que es lo que
   * separa a un edificio de otro.
   */
  async convertToLeadForTenant(
    id: string,
    dto: ConvertToLeadDto,
    ctx: TenantContext,
  ): Promise<Lead> {
    await this.tenantScope.assertAccess(Conversation, id, ctx);
    const conv = await this.findConversationById(id);

    if (conv.lead_id) {
      throw new ConflictException('Esta conversación ya tiene un lead asociado');
    }

    const phone = conv.contact_phone ?? conv.whatsapp_waid ?? '';
    const lead = await this.leadsService.createFromConversation(
      {
        project_id: dto.project_id,
        name: dto.name?.trim() || conv.contact_name || phone,
        phone,
        email: dto.email ?? conv.contact_email,
        source: conv.channel,
      },
      ctx,
    );

    await this.conversationRepo.update(id, { lead_id: lead.id });
    return lead;
  }

  async ingestInstagramMessage(payload: {
    senderId: string;
    messageId: string;
    text: string;
    username?: string;
    timestamp: string;
  }): Promise<Message> {
    const conv = await this.findOrCreateByPhone(payload.senderId, 'instagram', payload.username);

    const existing = await this.messageRepo.findOne({
      where: { whatsapp_message_id: payload.messageId },
    });
    if (existing) return existing;

    return this.addMessage(conv.id, {
      content: payload.text,
      sender_type: 'user',
      sender_name: payload.username || payload.senderId,
      whatsapp_message_id: payload.messageId,
      metadata: { timestamp: payload.timestamp, channel: 'instagram' },
    });
  }

  async ingestWhatsAppMessage(payload: {
    from: string;
    messageId: string;
    body: string;
    profileName?: string;
    timestamp: string;
    /**
     * Conversación ya resuelta por el llamador. Sin esto se busca solo por
     * teléfono y sin tenant: con dos tenants, un prospecto que escribió a
     * ambos números puede terminar con el mensaje en la conversación del
     * edificio equivocado.
     */
    conversationId?: string;
  }): Promise<Message> {
    const convId =
      payload.conversationId ??
      (await this.findOrCreateByPhone(payload.from, 'whatsapp', payload.profileName)).id;

    // Avoid duplicate ingestion
    const existing = await this.messageRepo.findOne({
      where: { whatsapp_message_id: payload.messageId },
    });
    if (existing) return existing;

    return this.addMessage(convId, {
      content: payload.body,
      sender_type: 'user',
      sender_name: payload.profileName || payload.from,
      whatsapp_message_id: payload.messageId,
      metadata: { timestamp: payload.timestamp },
    });
  }
}
