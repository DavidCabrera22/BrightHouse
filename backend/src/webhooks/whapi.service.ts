import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhapiService {
  private readonly logger = new Logger(WhapiService.name);
  private readonly apiUrl: string;
  private readonly token: string;

  /** LID → teléfono. La correspondencia no cambia, así que se cachea. */
  private readonly lidToPhone = new Map<string, string>();

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('WHAPI_API_URL') || 'https://gate.whapi.cloud';
    this.token = this.configService.get<string>('WHAPI_TOKEN') || '';
  }

  /**
   * Traduce un identificador LID al teléfono del contacto.
   *
   * WhatsApp identifica a algunos contactos por LID, y entonces los mensajes
   * entrantes llegan con `chat_id: <lid>@lid` — pero el chat canónico sigue
   * siendo el del número: `GET /chats/<lid>@lid` responde con
   * `id: <telefono>@s.whatsapp.net`. Sin traducirlo, la misma persona genera
   * dos conversaciones: sus mensajes quedan bajo el LID y los que el asesor le
   * escribe bajo el número, de modo que pausar una no silencia la otra.
   *
   * Ante cualquier fallo devuelve lo que recibió: perder la traducción es
   * molesto, pero dejar de atender al prospecto es peor.
   */
  async resolveChatPhone(id: string, tokenOverride?: string): Promise<string> {
    if (!id || !id.endsWith('@lid')) return id;

    const cacheado = this.lidToPhone.get(id);
    if (cacheado) return cacheado;

    const token = tokenOverride || this.token;
    if (!token) return id;

    try {
      const res = await fetch(`${this.apiUrl}/chats/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        this.logger.warn(`No se pudo resolver el LID ${id}: ${res.status}`);
        return id;
      }

      const canonico = String(((await res.json()) as any)?.id ?? '');
      const SUFIJO = '@s.whatsapp.net';
      if (!canonico.endsWith(SUFIJO)) return id;

      const telefono = canonico.slice(0, -SUFIJO.length);
      if (!telefono) return id;

      this.lidToPhone.set(id, telefono);
      this.logger.log(`LID ${id} resuelto a ${telefono}`);
      return telefono;
    } catch (err) {
      this.logger.warn(`Fallo resolviendo el LID ${id}`, err);
      return id;
    }
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
