import { buildVisitNote, formatVisitLabel, statusAfterVisit } from './visit-note';

describe('formatVisitLabel', () => {
  it('formatea lo que manda un input datetime-local sin depender de zonas horarias', () => {
    expect(formatVisitLabel('2026-08-30T15:00')).toBe('30/08/2026 a las 15:00');
  });

  it('acepta también una fecha ISO completa', () => {
    expect(formatVisitLabel('2026-08-30T15:00:00.000Z')).toBe('30/08/2026 a las 15:00');
  });

  it('devuelve el texto crudo si no reconoce el formato', () => {
    expect(formatVisitLabel('el jueves')).toBe('el jueves');
  });
});

describe('buildVisitNote', () => {
  it('deja la fecha en el cuerpo de la nota', () => {
    expect(buildVisitNote('2026-08-30T15:00')).toContain('30/08/2026 a las 15:00');
  });

  it('añade el comentario del asesor cuando lo hay', () => {
    expect(buildVisitNote('2026-08-30T15:00', 'Viene con la esposa')).toContain(
      'Viene con la esposa',
    );
  });
});

describe('statusAfterVisit', () => {
  it('adelanta a "pending" un lead nuevo o ya contactado', () => {
    expect(statusAfterVisit('new')).toBe('pending');
    expect(statusAfterVisit('contacted')).toBe('pending');
  });

  it('no retrocede a un lead que ya está más adelante en el embudo', () => {
    // Agendar una visita con alguien en negociación no puede devolverlo a
    // "pendiente": el estado del embudo solo avanza.
    expect(statusAfterVisit('qualified')).toBeUndefined();
    expect(statusAfterVisit('negotiation')).toBeUndefined();
    expect(statusAfterVisit('won')).toBeUndefined();
  });

  it('no toca un lead sin estado conocido', () => {
    expect(statusAfterVisit(undefined)).toBeUndefined();
    expect(statusAfterVisit('lost')).toBeUndefined();
  });
});
