/**
 * Normaliza el cuerpo del webhook de WhatsApp a una lista plana de mensajes.
 *
 * Está aparte del controlador y sin dependencias de NestJS porque es la pieza
 * más delicada del webhook: decide qué mensaje cuenta como "el asesor tomó el
 * control", y equivocarse ahí silencia la conversación equivocada.
 */

export interface ExtractedMessage {
  /** Teléfono del interlocutor (el cliente), nunca el del negocio. */
  from: string;
  messageId: string;
  /** Vacío si el mensaje no es de texto. */
  text: string;
  profileName: string;
  /** Lo escribió una persona desde el WhatsApp del negocio. */
  fromMe: boolean;
  /** `text`, `voice`, `image`, … Lo necesita quien decide si hay comando. */
  type: string;
}

/**
 * Orígenes que corresponden a una persona escribiendo desde el WhatsApp del
 * negocio.
 *
 * Whapi reenvía por este mismo webhook los mensajes que nosotros enviamos por
 * su API, también con `from_me: true`. Sin este filtro, la respuesta de Nova
 * vuelve como si fuera el asesor y Nova se pausa a sí misma después de cada
 * respuesta. `api` es Nova, `system` son eventos de la propia WhatsApp.
 */
const AGENT_SOURCES = new Set(['mobile', 'web', 'desktop']);

/** Los chats 1:1 terminan así; los grupos en `@g.us` y los estados en `@broadcast`. */
const DIRECT_CHAT_SUFFIX = '@s.whatsapp.net';

export interface ExtractResult {
  messages: ExtractedMessage[];
  /**
   * Mensajes salientes descartados por no traer `source`. Si esto crece, el
   * control desde WhatsApp no está funcionando y hay que revisar la versión de
   * la API de Whapi — se descartan a propósito: confundir un eco de Nova con el
   * asesor es peor que perder la toma de control.
   */
  outgoingWithoutSource: number;
}

export function extractMessages(body: any): ExtractResult {
  const messages: ExtractedMessage[] = [];
  let outgoingWithoutSource = 0;

  // ── Formato Whapi ────────────────────────────────────────────────────────
  if (body?.messages) {
    const contacts: Record<string, string> = {};
    for (const c of body?.contacts || []) {
      contacts[c.id] = c.name || c.id;
    }

    for (const msg of body.messages) {
      const fromMe = Boolean(msg.from_me);
      const type = String(msg.type ?? '');

      if (fromMe) {
        const source = String(msg.source ?? '');
        if (!source) {
          outgoingWithoutSource++;
          continue;
        }
        if (!AGENT_SOURCES.has(source)) continue;

        // En los salientes, `from` es el número del negocio: el interlocutor
        // está en `chat_id`. Solo nos sirven los chats 1:1.
        const chatId = String(msg.chat_id ?? '');
        if (!chatId.endsWith(DIRECT_CHAT_SUFFIX)) continue;

        const counterpart = chatId.slice(0, -DIRECT_CHAT_SUFFIX.length);
        if (!counterpart) continue;

        // Un saliente que no es texto igual cuenta: una nota de voz del asesor
        // también significa que tomó el control.
        messages.push({
          from: counterpart,
          messageId: msg.id,
          text: msg.text?.body || '',
          profileName: contacts[counterpart] || counterpart,
          fromMe: true,
          type,
        });
        continue;
      }

      // Un entrante que no es texto no le sirve a Nova.
      if (type !== 'text') continue;
      if (!msg.from) continue;

      messages.push({
        from: msg.from,
        messageId: msg.id,
        text: msg.text?.body || '',
        profileName: contacts[msg.from] || msg.from,
        fromMe: false,
        type,
      });
    }

    return { messages, outgoingWithoutSource };
  }

  // ── Formato Meta Cloud API — no entrega los salientes del agente ──────────
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  if (!value?.messages?.length) return { messages, outgoingWithoutSource };

  for (const message of value.messages) {
    if (message.type !== 'text') continue;
    messages.push({
      from: message.from,
      messageId: message.id,
      text: message.text?.body || '',
      profileName: value.contacts?.[0]?.profile?.name || message.from,
      fromMe: false,
      type: 'text',
    });
  }

  return { messages, outgoingWithoutSource };
}
