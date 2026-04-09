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
import { InstagramService } from './instagram.service';
import { TenantsService } from '../tenants/tenants.service';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/public.decorator';

@Public()
@ApiTags('Webhooks')
@Controller('webhooks/instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly leadsService: LeadsService,
    private readonly novaService: NovaService,
    private readonly instagramService: InstagramService,
    private readonly tenantsService: TenantsService,
    private readonly configService: ConfigService,
  ) {}

  /** GET — Meta webhook verification challenge */
  @Get()
  @ApiOperation({ summary: 'Instagram DM webhook verification' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.configService.get<string>('INSTAGRAM_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Instagram webhook verified');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ message: 'Forbidden' });
  }

  /** POST — Receive incoming Instagram DMs (?tenant=slug for multi-tenant) */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receive(@Body() body: any, @Query('tenant') tenantSlug?: string) {
    try {
      // Only process instagram object type
      if (body?.object !== 'instagram') return { status: 'ignored' };

      // Resolve tenant
      let tenantId: string | undefined;
      let instagramToken: string | undefined;
      let instagramPageId: string | undefined;
      let projectId: string | undefined;

      if (tenantSlug) {
        const tenant = await this.tenantsService.findBySlug(tenantSlug);
        if (tenant) {
          tenantId = tenant.id;
          instagramToken = tenant.instagram_token;
          instagramPageId = tenant.instagram_account_id;
          projectId = tenant.default_project_id;
        } else {
          this.logger.warn(`Instagram webhook for unknown tenant: ${tenantSlug}`);
        }
      }

      if (!instagramToken) instagramToken = this.configService.get<string>('INSTAGRAM_ACCESS_TOKEN');
      if (!instagramPageId) instagramPageId = this.configService.get<string>('INSTAGRAM_PAGE_ID');
      if (!projectId) projectId = this.configService.get<string>('DEFAULT_PROJECT_ID');

      const messages = this.extractMessages(body);

      for (const { senderId, messageId, text, username } of messages) {
        this.logger.log(`Instagram DM from ${senderId} [tenant:${tenantSlug ?? 'default'}]: "${text}"`);

        // 1. Find or create conversation (use senderId as contact_phone for Instagram)
        const conv = await this.conversationsService.findOrCreateByPhone(
          senderId,
          'instagram',
          username || senderId,
          tenantId,
        );

        // 2. Auto-create lead on first contact
        if (!conv.lead_id && projectId) {
          const { lead, created } = await this.leadsService.findOrCreateByPhone(
            senderId,
            projectId,
            username && username !== senderId ? username : undefined,
          );
          if (created) {
            this.logger.log(`Lead creado automáticamente: ${lead.id} para Instagram PSID ${senderId}`);
          }
          await this.conversationsService.updateConversation(conv.id, { lead_id: lead.id });
        }

        // 3. Save incoming message (dedup by messageId)
        await this.conversationsService.ingestInstagramMessage({
          senderId,
          messageId,
          text,
          username,
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

        // 5. Skip Nova if paused
        const freshConv = await this.conversationsService.findConversationById(conv.id);
        if (freshConv.nova_paused) {
          this.logger.log(`Nova pausada para ${senderId} — asesor tiene el control`);
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

        // 8. Send via Instagram Graph API
        await this.instagramService.sendText(senderId, novaReply, instagramToken, instagramPageId);

        this.logger.log(`Nova replied to ${senderId} via Instagram: "${novaReply.substring(0, 80)}..."`);

        // 9. Auto-advance lead status on Nova's first reply
        const freshConv2 = await this.conversationsService.findConversationById(conv.id);
        if (freshConv2.lead_id && allMessages.length <= 2) {
          await this.leadsService.updateFromNova(freshConv2.lead_id, { status: 'contacted' });
        }

        // 10. Enrich lead every 4 exchanges
        if (allMessages.length >= 4 && allMessages.length % 4 === 0) {
          this.enrichLeadAsync(conv.id, senderId, [...history, { role: 'user', content: text }], instagramToken, instagramPageId);
        }
      }
    } catch (err) {
      this.logger.error('Error processing Instagram webhook', err);
    }

    return { status: 'ok' };
  }

  private async enrichLeadAsync(
    convId: string,
    senderId: string,
    history: ChatMessage[],
    instagramToken?: string,
    instagramPageId?: string,
  ) {
    try {
      const extraction = await this.novaService.extractLeadInfo(history);
      if (Object.keys(extraction).length === 0) return;

      const conv = await this.conversationsService.findOrCreateByPhone(senderId, 'instagram');
      if (!conv.lead_id) return;

      let nextStatus: string | undefined;
      const recentText = history.slice(-6).map(m => m.content.toLowerCase()).join(' ');
      const visitKeywords = ['visita', 'sala de ventas', 'agendar', 'lunes', 'martes',
        'miércoles', 'jueves', 'viernes', 'sábado', 'mañana', 'esta semana', 'próxima semana'];

      if (visitKeywords.some(kw => recentText.includes(kw))) {
        nextStatus = 'pending';
      } else if ((extraction.ai_score !== undefined && extraction.ai_score >= 60) || extraction.priority === 'high') {
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
    } catch (err) {
      this.logger.warn('Error enriqueciendo lead (Instagram):', err?.message);
    }
  }

  private extractMessages(body: any): Array<{
    senderId: string;
    messageId: string;
    text: string;
    username: string;
  }> {
    const result: Array<{ senderId: string; messageId: string; text: string; username: string }> = [];

    for (const entry of body?.entry || []) {
      for (const event of entry?.messaging || []) {
        // Only process incoming text messages (not echoes from the page itself)
        if (!event?.message?.text) continue;
        if (event.message.is_echo) continue;

        result.push({
          senderId: event.sender?.id || '',
          messageId: event.message?.mid || '',
          text: event.message.text,
          username: event.sender?.username || event.sender?.id || '',
        });
      }
    }

    return result;
  }
}
