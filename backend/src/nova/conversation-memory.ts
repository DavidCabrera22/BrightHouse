/**
 * Cómo se reparte el historial de una conversación entre lo que se le manda
 * textual al modelo y lo que se guarda resumido.
 *
 * Mandar la conversación entera crece sin límite: cada mensaje reenvía todo lo
 * anterior, así que el costo y la latencia suben con la antigüedad del cliente.
 * Recortar a los últimos N, en cambio, hace que Nova olvide lo que el prospecto
 * contó de sí mismo. La salida es quedarse con los últimos N textuales y plegar
 * lo demás en un resumen acumulativo: memoria sin techo, costo acotado.
 */
import { DEFAULT_ASSISTANT_NAME } from './buildings/building-profile';

export interface StoredMessage {
  sender_type: string;
  content: string;
  created_at: Date;
}

/**
 * Cuántos mensajes viajan textuales. Cuarenta son unos días de conversación
 * de WhatsApp, donde la gente escribe frases sueltas y no párrafos.
 */
export const DEFAULT_HISTORY_WINDOW = 40;

export interface HistorySplit {
  /** Ya salieron de la ventana y todavía no están en el resumen. */
  toSummarize: StoredMessage[];
  /** Los que van textuales al prompt, en orden cronológico. */
  window: StoredMessage[];
}

/**
 * @param messages         Todos los mensajes de la conversación, del más viejo
 *                         al más nuevo, SIN incluir el que se está atendiendo.
 * @param windowSize       Cuántos van textuales.
 * @param summarizedUntil  Fecha del último mensaje ya cubierto por el resumen,
 *                         o `null` si nunca se ha resumido nada.
 */
export function splitHistory(
  messages: StoredMessage[],
  windowSize: number,
  summarizedUntil: Date | null,
): HistorySplit {
  const size = Math.max(0, windowSize);
  const corte = Math.max(0, messages.length - size);

  const window = messages.slice(corte);
  const older = messages.slice(0, corte);

  const limite = summarizedUntil ? new Date(summarizedUntil).getTime() : null;
  const toSummarize =
    limite === null
      ? older
      : older.filter((m) => new Date(m.created_at).getTime() > limite);

  return { toSummarize, window };
}

/**
 * Transcripción legible para pedirle un resumen al modelo. Nombra a los
 * interlocutores como los ve el prospecto, no por el tipo interno de remitente.
 */
export function toTranscript(
  messages: StoredMessage[],
  assistantName: string = DEFAULT_ASSISTANT_NAME,
): string {
  return messages
    .map((m) => {
      const quien =
        m.sender_type === 'user'
          ? 'Prospecto'
          : m.sender_type === 'agent'
            ? 'Asesor'
            : assistantName;
      return `${quien}: ${m.content}`;
    })
    .join('\n');
}
