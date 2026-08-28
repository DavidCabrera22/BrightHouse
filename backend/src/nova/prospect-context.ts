/**
 * Lo que Nova ya sabe de un prospecto, más allá de los últimos mensajes.
 *
 * El historial que se le pasa al modelo son los últimos 20 mensajes: suficiente
 * para una conversación seguida, inútil para alguien que escribió hace tres
 * meses. Sin esto, Nova le vuelve a preguntar el nombre a alguien que ya está
 * registrado en el CRM con nombre, correo y propósito — que es justo lo que un
 * asesor humano no haría, porque abriría su ficha.
 */

export interface ProspectFacts {
  name?: string | null;
  email?: string | null;
  interested_in?: string | null;
  /** Estado en el pipeline: new, contacted, qualified… */
  status?: string | null;
  /** Cuándo escribió por primera vez. */
  firstContactAt?: Date | null;
  /** Último mensaje ANTES del que se está atendiendo ahora. */
  lastMessageAt?: Date | null;
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;
const MES = 30 * DIA;

/**
 * "hace 3 meses", "hace 2 días"… en el lenguaje impreciso con el que una
 * persona recordaría el paso del tiempo, que es como se va a leer en el chat.
 */
export function describeElapsed(from: Date, now: Date): string {
  const ms = now.getTime() - new Date(from).getTime();
  if (ms < HORA) return 'hace unos minutos';
  if (ms < DIA) {
    const h = Math.floor(ms / HORA);
    return h === 1 ? 'hace una hora' : `hace ${h} horas`;
  }
  if (ms < MES) {
    const d = Math.floor(ms / DIA);
    return d === 1 ? 'ayer' : `hace ${d} días`;
  }
  if (ms < 12 * MES) {
    const m = Math.floor(ms / MES);
    return m === 1 ? 'hace un mes' : `hace ${m} meses`;
  }
  return 'hace más de un año';
}

/**
 * A partir de cuántas horas de silencio se considera que el prospecto "vuelve"
 * y hay que saludarlo de nuevo en vez de continuar la frase anterior.
 */
const SILENCIO_PARA_RETOMAR = 24 * HORA;

/**
 * Arma el bloque de contexto para el prompt, o `null` si no hay nada que
 * aportar — un prospecto nuevo del que no se sabe nada y que está escribiendo
 * ahora mismo no necesita ninguna instrucción extra.
 */
export function buildProspectBlock(
  facts: ProspectFacts,
  now: Date,
): string | null {
  const datos: string[] = [];
  if (facts.name) datos.push(`- Nombre: ${facts.name}`);
  if (facts.email) datos.push(`- Correo: ${facts.email}`);
  if (facts.interested_in) datos.push(`- Lo que busca: ${facts.interested_in}`);
  if (facts.firstContactAt) {
    datos.push(
      `- Escribió por primera vez ${describeElapsed(facts.firstContactAt, now)}`,
    );
  }

  const silencio =
    facts.lastMessageAt &&
    now.getTime() - new Date(facts.lastMessageAt).getTime() >=
      SILENCIO_PARA_RETOMAR
      ? describeElapsed(facts.lastMessageAt, now)
      : null;

  if (datos.length === 0 && !silencio) return null;

  const partes: string[] = ['## Lo que ya sabes de este prospecto'];

  if (datos.length > 0) {
    partes.push(
      'Esto ya está registrado en el CRM. NO se lo vuelvas a preguntar, y úsalo para hablarle de forma personal.',
      datos.join('\n'),
    );
  }

  if (silencio) {
    partes.push(
      `Su último mensaje fue ${silencio}. No retomes la conversación a media frase como si no hubiera pasado el tiempo: salúdalo${
        facts.name ? ` por su nombre` : ''
      }, reconoce que ya habían hablado y retoma desde ahí.`,
    );
  }

  return partes.join('\n\n');
}
