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
import { WhapiService } from './whapi.service';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Webhooks')
@Controller('webhooks/whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly leadsService: LeadsService,
    private readonly novaService: NovaService,
    private readonly whapiService: WhapiService,
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

  /** POST — Receive incoming WhatsApp messages */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receive(@Body() body: any) {
    try {
      const messages = this.extractMessages(body);

      for (const { from, messageId, text, profileName } of messages) {
        this.logger.log(`Incoming WhatsApp from ${from}: "${text}"`);

        // 1. Find or create conversation
        const conv = await this.conversationsService.findOrCreateByPhone(from, 'whatsapp', profileName);
        const isNewConversation = !conv.lead_id;

        // 2. Auto-create lead on first contact
        if (isNewConversation) {
          const projectId = this.configService.get<string>('DEFAULT_PROJECT_ID');
          if (projectId) {
            const { lead, created } = await this.leadsService.findOrCreateByPhone(
              from,
              projectId,
              profileName !== from ? profileName : undefined,
            );
            if (created) {
              this.logger.log(`Lead creado automáticamente: ${lead.id} para ${from}`);
            }
            // Link lead to conversation
            await this.conversationsService.updateConversation(conv.id, { lead_id: lead.id });
          }
        }

        // 3. Save incoming message
        await this.conversationsService.ingestWhatsAppMessage({
          from,
          messageId,
          body: text,
          profileName,
          timestamp: String(Date.now()),
        });

        // 4. Get conversation history
        const allMessages = await this.conversationsService.getMessages(conv.id);
        const history: ChatMessage[] = allMessages
          .slice(-21, -1)
          .map((m) => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content,
          }));

        // 5. Skip Nova if paused (agent has taken control)
        const freshConv = await this.conversationsService.findConversationById(conv.id);
        if (freshConv.nova_paused) {
          this.logger.log(`Nova pausada para ${from} — asesor tiene el control`);
          continue;
        }

        // 6. Generate Nova response
        const novaReply = await this.novaService.generateResponse(text, history);

        // 7. Save Nova's response
        await this.conversationsService.addMessage(conv.id, {
          content: novaReply,
          sender_type: 'bot',
          sender_name: 'Nova',
        });

        // 8. Send via Whapi
        await this.whapiService.sendText(from, novaReply);

        this.logger.log(`Nova replied to ${from}: "${novaReply.substring(0, 80)}..."`);

        // 9. Auto-advance lead to "contacted" on Nova's first reply
        const freshConv2 = await this.conversationsService.findConversationById(conv.id);
        if (freshConv2.lead_id) {
          const msgCount = allMessages.length;
          if (msgCount <= 2) {
            // First exchange — mark as contacted
            await this.leadsService.updateFromNova(freshConv2.lead_id, { status: 'contacted' });
            this.logger.log(`Lead ${freshConv2.lead_id} → contacted (primer contacto Nova)`);
          }
        }

        // 10. Extract lead info every 4 exchanges and auto-advance status
        if (allMessages.length >= 4 && allMessages.length % 4 === 0) {
          this.enrichLeadAsync(conv.id, from, [...history, { role: 'user', content: text }]);
        }
      }
    } catch (err) {
      this.logger.error('Error processing WhatsApp webhook', err);
    }

    return { status: 'ok' };
  }

  /** Fire-and-forget: extract lead info and auto-advance pipeline status */
  private async enrichLeadAsync(convId: string, phone: string, history: ChatMessage[]) {
    try {
      const extraction = await this.novaService.extractLeadInfo(history);
      if (Object.keys(extraction).length === 0) return;

      const conv = await this.conversationsService.findOrCreateByPhone(phone, 'whatsapp');
      if (!conv.lead_id) return;

      // ── Determine next status based on extraction ──────────────────────────
      let nextStatus: string | undefined;

      // Check if a visit was mentioned in the last messages
      const recentText = history
        .slice(-6)
        .map(m => m.content.toLowerCase())
        .join(' ');

      const visitKeywords = ['visita', 'sala de ventas', 'agendar', 'lunes', 'martes',
        'miércoles', 'jueves', 'viernes', 'sábado', 'mañana', 'pasado mañana',
        'esta semana', 'próxima semana', 'te confirmo', 'voy a ir', 'puedo ir'];

      const visitMentioned = visitKeywords.some(kw => recentText.includes(kw));

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
  }> {
    const result: Array<{ from: string; messageId: string; text: string; profileName: string }> = [];

    // Whapi format
    if (body?.messages) {
      const contacts: Record<string, string> = {};
      for (const c of body?.contacts || []) {
        contacts[c.id] = c.name || c.id;
      }
      for (const msg of body.messages) {
        if (msg.from_me) continue;
        if (msg.type !== 'text') continue;
        result.push({
          from: msg.from,
          messageId: msg.id,
          text: msg.text?.body || '',
          profileName: contacts[msg.from] || msg.from,
        });
      }
      return result;
    }

    // Meta Cloud API format
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages?.length) return result;

    for (const message of value.messages) {
      if (message.type !== 'text') continue;
      result.push({
        from: message.from,
        messageId: message.id,
        text: message.text?.body || '',
        profileName: value.contacts?.[0]?.profile?.name || message.from,
      });
    }

    return result;
  }
}
