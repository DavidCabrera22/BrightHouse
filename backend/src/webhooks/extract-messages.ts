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

const PHONE_SUFFIX = '@s.whatsapp.net';

/**
 * WhatsApp identifica a algunos contactos por LID (Linked Identity) en vez de
 * por teléfono, y entonces `chat_id` termina en `@lid`. No se puede reducir a
 * un número: el LID completo *es* la dirección, y hay que conservarlo tal cual
 * para poder responderle.
 */
const LID_SUFFIX = '@lid';

/**
 * Devuelve el identificador del interlocutor a partir del `chat_id`, o `null`
 * si el chat no es una conversación 1:1 (grupos `@g.us`, estados, historias).
 *
 * `chat_id` es la fuente de verdad, no `from`: en los mensajes salientes `from`
 * es el número del negocio, y en los contactos por LID `from` trae el LID sin
 * que se pueda distinguir de un teléfono.
 */
function counterpartFrom(chatId: string): string | null {
  if (!chatId) return null;
  if (chatId.endsWith(PHONE_SUFFIX)) {
    const phone = chatId.slice(0, -PHONE_SUFFIX.length);
    return phone || null;
  }
  if (chatId.endsWith(LID_SUFFIX)) return chatId;
  return null;
}

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

      // `chat_id` manda en ambos sentidos: es la dirección a la que se responde.
      const chatId = String(msg.chat_id ?? '');
      let counterpart = chatId ? counterpartFrom(chatId) : null;

      // Si el payload no trae `chat_id`, en un entrante `from` sí es el
      // interlocutor. En un saliente no sirve: ahí `from` es el número del
      // negocio. El respaldo solo aplica cuando `chat_id` falta por completo —
      // si está y es un grupo, el mensaje se descarta, que es lo correcto.
      if (!counterpart && !chatId && !fromMe && msg.from) {
        counterpart = String(msg.from);
      }
      if (!counterpart) continue;

      // El propio mensaje trae el nombre del contacto; el arreglo `contacts`
      // no siempre lo incluye, y nunca lo trae para los contactos por LID.
      const profileName = msg.from_name || contacts[counterpart] || counterpart;

      if (fromMe) {
        const source = String(msg.source ?? '');
        if (!source) {
          outgoingWithoutSource++;
          continue;
        }
        if (!AGENT_SOURCES.has(source)) continue;

        // Un saliente que no es texto igual cuenta: una nota de voz del asesor
        // también significa que tomó el control.
        messages.push({
          from: counterpart,
          messageId: msg.id,
          text: msg.text?.body || '',
          profileName,
          fromMe: true,
          type,
        });
        continue;
      }

      // Un entrante que no es texto no le sirve a Nova.
      if (type !== 'text') continue;

      messages.push({
        from: counterpart,
        messageId: msg.id,
        text: msg.text?.body || '',
        profileName,
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
