import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly graphApiUrl = 'https://graph.facebook.com/v19.0';
  private readonly defaultToken: string;
  private readonly defaultPageId: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultToken = this.configService.get<string>('INSTAGRAM_ACCESS_TOKEN') || '';
    this.defaultPageId = this.configService.get<string>('INSTAGRAM_PAGE_ID') || '';
  }

  async sendText(
    recipientId: string,
    text: string,
    tokenOverride?: string,
    pageIdOverride?: string,
  ): Promise<boolean> {
    const token = tokenOverride || this.defaultToken;
    const pageId = pageIdOverride || this.defaultPageId;

    if (!token || !pageId) {
      this.logger.warn('Instagram credentials not set — skipping outbound message');
      return false;
    }

    try {
      const res = await fetch(
        `${this.graphApiUrl}/${pageId}/messages?access_token=${token}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text },
            messaging_type: 'RESPONSE',
          }),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Instagram Graph API error ${res.status}: ${body}`);
        return false;
      }

      this.logger.log(`Instagram DM sent to ${recipientId}`);
      return true;
    } catch (err) {
      this.logger.error('Failed to send Instagram DM', err);
      return false;
    }
  }
}
