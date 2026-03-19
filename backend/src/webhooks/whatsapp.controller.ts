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

  /** POST — Receive incoming WhatsApp messages (Whapi format) */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receive(@Body() body: any) {
    try {
      // ── Support both Whapi and Meta Cloud API payload shapes ──────────────
      const messages = this.extractMessages(body);

      for (const { from, messageId, text, profileName } of messages) {
        this.logger.log(`Incoming WhatsApp from ${from}: "${text}"`);

        // 1. Save incoming message to DB
        const savedMsg = await this.conversationsService.ingestWhatsAppMessage({
          from,
          messageId,
          body: text,
          profileName,
          timestamp: String(Date.now()),
        });

        // 2. Get conversation + history for context
        const conv = await this.conversationsService.findOrCreateByPhone(from, 'whatsapp', profileName);
        const allMessages = await this.conversationsService.getMessages(conv.id);

        // Build conversation history for Claude (last 10 exchanges)
        const history: ChatMessage[] = allMessages
          .slice(-21, -1) // last 10 exchanges before the new message
          .map((m) => ({
            role: m.sender_type === 'user' ? 'user' : 'assistant',
            content: m.content,
          }));

        // 3. Generate Nova response
        const novaReply = await this.novaService.generateResponse(text, history);

        // 4. Save Nova's response to DB
        await this.conversationsService.addMessage(conv.id, {
          content: novaReply,
          sender_type: 'bot',
          sender_name: 'Nova',
        });

        // 5. Send response via Whapi
        await this.whapiService.sendText(from, novaReply);

        this.logger.log(`Nova replied to ${from}: "${novaReply.substring(0, 80)}..."`);
      }
    } catch (err) {
      this.logger.error('Error processing WhatsApp webhook', err);
    }

    // Always return 200
    return { status: 'ok' };
  }

  /**
   * Extract messages from either Whapi or Meta Cloud API payload.
   * Returns normalized array of { from, messageId, text, profileName }.
   */
  private extractMessages(body: any): Array<{
    from: string;
    messageId: string;
    text: string;
    profileName: string;
  }> {
    const result: Array<{ from: string; messageId: string; text: string; profileName: string }> = [];

    // ── Whapi format ──────────────────────────────────────────────────────────
    // { messages: [{ id, from, type, text: { body } }], contacts: [...] }
    if (body?.messages) {
      const contacts: Record<string, string> = {};
      for (const c of body?.contacts || []) {
        contacts[c.id] = c.name || c.id;
      }

      for (const msg of body.messages) {
        if (msg.from_me) continue; // Skip outbound messages
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

    // ── Meta Cloud API format ─────────────────────────────────────────────────
    // { entry: [{ changes: [{ value: { messages: [...], contacts: [...] } }] }] }
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

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
