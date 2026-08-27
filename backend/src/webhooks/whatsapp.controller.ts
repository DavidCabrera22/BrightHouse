import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConversationsService } from '../conversations/conversations.service';
import { LeadsService } from '../leads/leads.service';
import { NovaService, ChatMessage } from '../nova/nova.service';
import { parseNovaCommand } from '../nova/nova-commands';
import { shouldAutoResume, DEFAULT_RESUME_HOURS } from '../nova/nova-pause';
import { WhapiService } from './whapi.service';
import { TenantsService } from '../tenants/tenants.service';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';

@Public()
@ApiTags('Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly leadsService: LeadsService,
    private readonly novaService: NovaService,
    private readonly whapiService: WhapiService,
    private readonly tenantsService: TenantsService,
    private readonly configService: ConfigService,
  ) {}

  /** GET — Whapi/WhatsApp webhook verification challenge */
  @Get()
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('WhatsApp webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ message: 'Forbidden' });
  }

  /** POST — Receive incoming WhatsApp messages (?tenant=slug for multi-tenant routing) */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receive(@Body() body: any, @Query('tenant') tenantSlug?: string) {
    try {
      // ── 1. Resolver tenant ────────────────────────────────────────────────
      let tenantId: string | undefined;
      let whapiToken: string | undefined;
      let projectId: string | undefined;
      let buildingSlug = tenantSlug ?? '';

      if (tenantSlug) {
        const tenant = await this.tenantsService.findBySlug(tenantSlug);
        if (tenant) {
          tenantId = tenant.id;
          whapiToken = tenant.whapi_token;
          projectId = tenant.default_project_id;
          buildingSlug = tenant.slug;
        } else {
          this.logger.warn(`Webhook received for unknown tenant slug: ${tenantSlug}`);
        }
      }

      if (!whapiToken) whapiToken = this.configService.get<string>('WHAPI_TOKEN');
      if (!projectId) projectId = this.configService.get<string>('DEFAULT_PROJECT_ID');
      if (!buildingSlug) {
        buildingSlug = this.configService.get<string>('DEFAULT_BUILDING_SLUG') ?? 'oasis-park';
      }

      const resumeHours = Number(
        this.configService.get<string>('NOVA_RESUME_HOURS') ?? DEFAULT_RESUME_HOURS,
      );

      // ── 2. Extraer mensajes (salientes incluidos) ─────────────────────────
      const messages = this.extractMessages(body);

      for (const { from, messageId, text, profileName, fromMe } of messages) {
        // ── 3. Mensaje del asesor: comando o toma de control ────────────────
        if (fromMe) {
          await this.handleAgentMessage({
            phone: from,
            messageId,
            text,
            tenantId,
            whapiToken,
            buildingSlug,
          });
          continue;
        }

        this.logger.log(
          `Incoming WhatsApp from ${from} [tenant:${tenantSlug ?? 'default'}]: "${text}"`,
        );

        // ── 4. Conversación, lead y mensaje entrante ────────────────────────
        const conv = await this.conversationsService.findOrCreateByPhone(
          from, 'whatsapp', profileName, tenantId,
        );
        const isNewConversation = !conv.lead_id;

        if (isNewConversation && projectId) {
          const { lead, created } = await this.leadsService.findOrCreateByPhone(
            from,
            projectId,
            profileName !== from ? profileName : undefined,
          );
          if (created) {
            this.logger.log(`Lead creado automáticamente: ${lead.id} para ${from}`);
          }
          await this.conversationsService.updateConversation(conv.id, { lead_id: lead.id });
        }

        await this.conversationsService.ingestWhatsAppMessage({
          from,
          messageId,
          body: text,
          profileName,
          timestamp: String(Date.now()),
        });

        const allMessages = await this.conversationsService.getMessages(conv.id);
        const history: ChatMessage[] = allMessages
          .slice(-21, -1)
          .map((m) => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content,
          }));

        // ── 5. Pausa y ventana de reactivación ──────────────────────────────
        const freshConv = await this.conversationsService.findConversationById(conv.id);
        if (freshConv.nova_paused) {
          if (shouldAutoResume(freshConv, new Date(), resumeHours)) {
            await this.conversationsService.resumeNova(conv.id);
            this.logger.log(
              `Nova retoma ${from} — ${resumeHours}h sin actividad del asesor`,
            );
          } else {
            this.logger.log(`Nova pausada para ${from} — asesor tiene el control`);
            continue;
          }
        }

        // ── 6. Responder ────────────────────────────────────────────────────
        const novaReply = await this.novaService.generateResponse(text, history, {
          buildingSlug,
          projectId,
        });

        if (!novaReply) {
          this.logger.warn(
            `Nova no respondió a ${from}: sin perfil utilizable para "${buildingSlug}"`,
          );
          continue;
        }

        await this.conversationsService.addMessage(conv.id, {
          content: novaReply,
          sender_type: 'bot',
          sender_name: 'Nova',
        });

        await this.whapiService.sendText(from, novaReply, whapiToken);
        this.logger.log(`Nova replied to ${from}: "${novaReply.substring(0, 80)}..."`);

        // ── 7. Avance del lead ──────────────────────────────────────────────
        const freshConv2 = await this.conversationsService.findConversationById(conv.id);
        if (freshConv2.lead_id && allMessages.length <= 2) {
          await this.leadsService.updateFromNova(freshConv2.lead_id, { status: 'contacted' });
          this.logger.log(`Lead ${freshConv2.lead_id} → contacted`);
        }

        if (allMessages.length >= 4 && allMessages.length % 4 === 0) {
          this.enrichLeadAsync(conv.id, [...history, { role: 'user', content: text }]);
        }
      }
    } catch (err) {
      this.logger.error('Error processing WhatsApp webhook', err);
    }

    return { status: 'ok' };
  }

  /**
   * Mensaje escrito desde el WhatsApp del negocio. O es un comando de control, o
   * es el asesor atendiendo — y en ese caso Nova se calla en ese chat.
   */
  private async handleAgentMessage(params: {
    phone: string;
    messageId: string;
    text: string;
    tenantId?: string;
    whapiToken?: string;
    buildingSlug: string;
  }): Promise<void> {
    const { phone, messageId, text, tenantId, whapiToken, buildingSlug } = params;

    const conv = await this.conversationsService.findOrCreateByPhone(
      phone, 'whatsapp', undefined, tenantId,
    );

    const command = parseNovaCommand(text);

    if (command === 'pause') {
      await this.conversationsService.pauseNova(conv.id, 'whatsapp');
      this.logger.log(`#pausa — Nova silenciada en ${phone}`);
      await this.whapiService.deleteMessage(messageId, whapiToken);
      return;
    }

    if (command === 'resume') {
      await this.conversationsService.resumeNova(conv.id);
      this.logger.log(`#nova — Nova retoma ${phone}`);
      await this.whapiService.deleteMessage(messageId, whapiToken);
      return;
    }

    if (command === 'status') {
      const fresh = await this.conversationsService.findConversationById(conv.id);
      const estado = fresh.nova_paused
        ? `Nova está PAUSADA (por ${fresh.nova_paused_by ?? 'origen desconocido'}${
            fresh.nova_paused_at
              ? ` desde ${new Date(fresh.nova_paused_at).toLocaleString('es-CO')}`
              : ''
          })`
        : 'Nova está ACTIVA';
      await this.whapiService.deleteMessage(messageId, whapiToken);
      await this.whapiService.sendText(
        phone,
        `${estado}. Edificio: ${buildingSlug}.`,
        whapiToken,
      );
      return;
    }

    // No es comando: el asesor está atendiendo. Se guarda y Nova se calla.
    await this.conversationsService.addMessage(conv.id, {
      content: text,
      sender_type: 'agent',
      sender_name: 'Asesor',
      whatsapp_message_id: messageId,
    });
    await this.conversationsService.pauseNova(conv.id, 'whatsapp');
    this.logger.log(`Asesor escribió a ${phone} — Nova pausada`);
  }

  /** Fire-and-forget: extract lead info and auto-advance pipeline status */
  private async enrichLeadAsync(convId: string, history: ChatMessage[]) {
    try {
      const extraction = await this.novaService.extractLeadInfo(history);
      if (Object.keys(extraction).length === 0) return;

      const conv = await this.conversationsService.findConversationById(convId);
      if (!conv.lead_id) return;

      // Nova pidió escalar: se calla y queda marcada para el asesor.
      if (extraction.needs_human) {
        await this.conversationsService.pauseNova(convId, 'nova');
        this.logger.log(`Conversación ${convId} escalada a asesor humano`);
      }

      // ── Determine next status based on extraction ──────────────────────────
      let nextStatus: string | undefined;

      // Check if a visit was mentioned in the last messages
      const recentText = history
        .slice(-6)
        .map((m) => m.content.toLowerCase())
        .join(' ');

      const visitKeywords = ['visita', 'sala de ventas', 'agendar', 'lunes', 'martes',
        'miércoles', 'jueves', 'viernes', 'sábado', 'mañana', 'pasado mañana',
        'esta semana', 'próxima semana', 'te confirmo', 'voy a ir', 'puedo ir'];

      const visitMentioned = visitKeywords.some((kw) => recentText.includes(kw));

      if (visitMentioned) {
        nextStatus = 'pending'; // Visit scheduled
      } else if (
        (extraction.ai_score !== undefined && extraction.ai_score >= 60) ||
        extraction.priority === 'high'
      ) {
        nextStatus = 'qualified';
      }

      await this.leadsService.updateFromNova(conv.lead_id, {
        name: extraction.name,
        interested_in: extraction.financing
          ? `${extraction.interested_in || ''} | ${extraction.financing}`.replace(/^\s*\|\s*/, '').trim()
          : extraction.interested_in,
        ai_score: extraction.ai_score,
        priority: extraction.priority,
        status: nextStatus,
      });

      this.logger.log(
        `Lead ${conv.lead_id} enriquecido — score: ${extraction.ai_score ?? '?'}, status: ${nextStatus ?? 'sin cambio'}`,
      );
    } catch (err) {
      this.logger.warn('Error enriqueciendo lead:', err?.message);
    }
  }

  private extractMessages(body: any): Array<{
    from: string;
    messageId: string;
    text: string;
    profileName: string;
    fromMe: boolean;
  }> {
    const result: Array<{
      from: string;
      messageId: string;
      text: string;
      profileName: string;
      fromMe: boolean;
    }> = [];

    // Whapi format
    if (body?.messages) {
      const contacts: Record<string, string> = {};
      for (const c of body?.contacts || []) {
        contacts[c.id] = c.name || c.id;
      }
      for (const msg of body.messages) {
        if (msg.type !== 'text') continue;

        // En los salientes, `from` es el número del negocio: el interlocutor
        // está en `chat_id`. Es el teléfono con el que buscamos la conversación.
        const counterpart = msg.from_me
          ? String(msg.chat_id ?? '').replace(/@.*$/, '')
          : msg.from;
        if (!counterpart) continue;

        result.push({
          from: counterpart,
          messageId: msg.id,
          text: msg.text?.body || '',
          profileName: contacts[counterpart] || counterpart,
          fromMe: Boolean(msg.from_me),
        });
      }
      return result;
    }

    // Meta Cloud API format — no entrega los salientes del agente.
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages?.length) return result;

    for (const message of value.messages) {
      if (message.type !== 'text') continue;
      result.push({
        from: message.from,
        messageId: message.id,
        text: message.text?.body || '',
        profileName: value.contacts?.[0]?.profile?.name || message.from,
        fromMe: false,
      });
    }

    return result;
  }
}
