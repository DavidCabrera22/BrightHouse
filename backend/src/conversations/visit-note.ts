/**
 * Agendar una visita desde la bandeja deja una nota interna y, si el lead
 * todavía está al principio del embudo, lo adelanta a "pendiente".
 */

/** Estados desde los que agendar una visita significa un avance real. */
const ADVANCES_FROM = ['new', 'contacted'];

export function statusAfterVisit(current?: string | null): string | undefined {
  return current && ADVANCES_FROM.includes(current) ? 'pending' : undefined;
}

/**
 * `30/08/2026 a las 15:00` a partir de lo que manda un `datetime-local`.
 *
 * Se formatea sobre el texto, no sobre un `Date`: el input del navegador no
 * lleva zona horaria, y pasarlo por `Date` haría que la hora mostrada dependa
 * de la zona del servidor — la visita de las 3 p. m. aparecería a las 8 p. m.
 */
export function formatVisitLabel(scheduledAt: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(scheduledAt);
  if (!match) return scheduledAt;

  const [, year, month, day, hour, minute] = match;
  return `${day}/${month}/${year} a las ${hour}:${minute}`;
}

export function buildVisitNote(scheduledAt: string, notes?: string): string {
  const base = `Visita agendada para el ${formatVisitLabel(scheduledAt)}`;
  return notes?.trim() ? `${base} — ${notes.trim()}` : base;
}
