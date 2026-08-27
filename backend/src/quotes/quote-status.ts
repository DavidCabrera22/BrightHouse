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

export function assertTransition(from: QuoteStatus, to: QuoteStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
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
 * Las fechas son 'YYYY-MM-DD', que se comparan bien como cadenas.
 */
export function isExpired(
  status: QuoteStatus,
  validUntil: string | null | undefined,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (status !== 'sent' || !validUntil) return false;
  return String(validUntil).slice(0, 10) < today;
}
