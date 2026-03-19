import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhapiService {
  private readonly logger = new Logger(WhapiService.name);
  private readonly apiUrl: string;
  private readonly token: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WHAPI_API_URL') || 'https://gate.whapi.cloud';
    this.token = this.configService.get<string>('WHAPI_TOKEN') || '';
  }

  async sendText(to: string, text: string): Promise<boolean> {
    if (!this.token) {
      this.logger.warn('WHAPI_TOKEN not set — skipping outbound message');
      return false;
    }

    // Whapi expects phone in format: 521XXXXXXXXXX or country code + number
    // Ensure it doesn't start with + and append @s.whatsapp.net for chat_id
    const chatId = to.replace(/^\+/, '') + '@s.whatsapp.net';

    try {
      const res = await fetch(`${this.apiUrl}/messages/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ to: chatId, body: text }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Whapi error ${res.status}: ${body}`);
        return false;
      }

      this.logger.log(`Message sent to ${to} via Whapi`);
      return true;
    } catch (err) {
      this.logger.error('Failed to send Whapi message', err);
      return false;
    }
  }
}
