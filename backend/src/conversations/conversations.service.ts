import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly tenantScope: TenantScopeService,
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
    await this.conversationRepo.update(conversationId, {
      last_message: dto.content.substring(0, 200),
      last_message_at: new Date(),
      unread_count: dto.sender_type === 'user' ? conv.unread_count + 1 : conv.unread_count,
    });

    return saved;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversation_id: conversationId },
      order: { created_at: 'ASC' },
    });
  }

  async markAsRead(conversationId: string): Promise<void> {
    await this.messageRepo.update(
      { conversation_id: conversationId, is_read: false, sender_type: 'user' },
      { is_read: true },
    );
    await this.conversationRepo.update(conversationId, { unread_count: 0 });
  }

  /**
   * Silencia a Nova en esta conversación y sella quién y cuándo. El sello de
   * tiempo es la base de la ventana de reactivación automática.
   */
  async pauseNova(
    conversationId: string,
    by: 'whatsapp' | 'crm' | 'nova',
  ): Promise<void> {
    await this.conversationRepo.update(conversationId, {
      nova_paused: true,
      nova_paused_at: new Date(),
      nova_paused_by: by,
      // Un asesor que entra al chat ya está atendiendo: la señal de escalamiento
      // deja de aplicar. Salvo cuando es la propia Nova la que escala.
      needs_human: by === 'nova',
    });
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
    return this.addMessage(conversationId, dto);
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
  }): Promise<Message> {
    const conv = await this.findOrCreateByPhone(payload.from, 'whatsapp', payload.profileName);

    // Avoid duplicate ingestion
    const existing = await this.messageRepo.findOne({
      where: { whatsapp_message_id: payload.messageId },
    });
    if (existing) return existing;

    return this.addMessage(conv.id, {
      content: payload.body,
      sender_type: 'user',
      sender_name: payload.profileName || payload.from,
      whatsapp_message_id: payload.messageId,
      metadata: { timestamp: payload.timestamp },
    });
  }
}
