import { BadRequestException } from '@nestjs/common';

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Una cotización enviada ya está en manos del cliente: se cierra, no se reabre. */
const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

/** El negocio opera en Colombia: el día vigente es el de Bogotá, no el del servidor. */
const BUSINESS_TIME_ZONE = 'America/Bogota';

/**
 * Hoy en la zona del negocio, como 'YYYY-MM-DD'.
 *
 * Con `toISOString()` (UTC), entre las 7 de la noche y medianoche en Bogotá el
 * servidor ya está en el día siguiente y una cotización vigente aparecería
 * vencida durante cinco horas cada noche.
 *
 * Se arma con `formatToParts` y no con `format`: `format` devuelve YYYY-MM-DD
 * solo porque el locale `en-CA` ordena así. En un Node con small-icu ese locale
 * cae a `en-US` y devolvería "08/26/2026", que como cadena es menor que
 * cualquier fecha ISO y dejaría toda cotización enviada como vencida, en
 * silencio. `formatToParts` da las partes sin depender del locale.
 */
export function businessToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    // Evita además los sistemas de numeración no latinos (ar-EG y similares).
    numberingSystem: 'latn',
  }).formatToParts(now);

  const part = (type: string) => parts.find((p) => p.type === type).value;

  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function assertTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!(QUOTE_STATUSES as readonly string[]).includes(from)) {
    throw new BadRequestException(`Estado de cotización desconocido: "${from}"`);
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `No se puede pasar una cotización de "${from}" a "${to}"` +
        (allowed.length ? `. Transiciones válidas: ${allowed.join(', ')}` : '. Ya está cerrada'),
    );
  }
}

/** Solo el borrador admite cambios de montos. */
export function isEditable(status: QuoteStatus): boolean {
  return status === 'draft';
}

/**
 * El vencimiento se deriva de la fecha, no se almacena: una fecha pasada ya es
 * toda la información necesaria y así no hace falta un cron que venza filas.
 *
 * Las fechas son 'YYYY-MM-DD', que se comparan bien como cadenas. El caso Date
 * se maneja aparte porque `String(new Date())` daría "Wed Dec 31", que compara
 * como no vencida siempre: un resultado equivocado con aspecto de correcto.
 */
export function isExpired(
  status: QuoteStatus,
  validUntil: string | Date | null | undefined,
  today: string = businessToday(),
): boolean {
  if (status !== 'sent' || !validUntil) return false;

  const until =
    validUntil instanceof Date
      ? validUntil.toISOString().slice(0, 10)
      : String(validUntil).slice(0, 10);

  return until < today;
}
