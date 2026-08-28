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

  async sendText(to: string, text: string, tokenOverride?: string): Promise<boolean> {
    const token = tokenOverride || this.token;
    if (!token) {
      this.logger.warn('WHAPI_TOKEN not set — skipping outbound message');
      return false;
    }

    // Un teléfono suelto se convierte en chat_id; un identificador que ya trae
    // dominio (`...@lid` para los contactos por LID de WhatsApp) se manda tal
    // cual. Concatenarle el sufijo produciría `<lid>@lid@s.whatsapp.net`, que
    // Whapi rechaza — y el prospecto se queda sin respuesta.
    const chatId = to.includes('@')
      ? to
      : to.replace(/^\+/, '') + '@s.whatsapp.net';

    try {
      const res = await fetch(`${this.apiUrl}/messages/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

  /**
   * Borra un mensaje propio del chat. Se usa para que el comando del asesor
   * (`#pausa`, `#nova`) no le quede visible al cliente.
   *
   * Un fallo aquí no es grave: el comando ya surtió efecto, lo único que se
   * pierde es que el cliente lo vea.
   */
  async deleteMessage(messageId: string, tokenOverride?: string): Promise<boolean> {
    const token = tokenOverride || this.token;
    if (!token) {
      this.logger.warn('WHAPI_TOKEN not set — no se puede borrar el mensaje');
      return false;
    }

    try {
      const res = await fetch(`${this.apiUrl}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`No se pudo borrar el mensaje ${messageId}: ${res.status} ${body}`);
        return false;
      }

      return true;
    } catch (err) {
      this.logger.warn(`Fallo borrando el mensaje ${messageId}`, err);
      return false;
    }
  }
}
