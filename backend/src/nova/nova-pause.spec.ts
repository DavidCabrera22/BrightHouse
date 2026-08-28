import { shouldAutoResume, PauseState } from './nova-pause';

const HOURS = 12;
const AHORA = new Date('2026-08-27T20:00:00Z');

function pausedHoursAgo(hours: number, by: string): PauseState {
  return {
    nova_paused: true,
    nova_paused_at: new Date(AHORA.getTime() - hours * 3600_000),
    nova_paused_by: by,
  };
}

describe('shouldAutoResume', () => {
  it('no reactiva una conversación que no está pausada', () => {
    const conv: PauseState = {
      nova_paused: false,
      nova_paused_at: null,
      nova_paused_by: null,
    };
    expect(shouldAutoResume(conv, AHORA, HOURS)).toBe(false);
  });

  it('no reactiva dentro de la ventana', () => {
    expect(shouldAutoResume(pausedHoursAgo(3, 'whatsapp'), AHORA, HOURS)).toBe(
      false,
    );
  });

  it('reactiva pasada la ventana', () => {
    expect(shouldAutoResume(pausedHoursAgo(13, 'whatsapp'), AHORA, HOURS)).toBe(
      true,
    );
  });

  it('reactiva justo en el límite', () => {
    expect(shouldAutoResume(pausedHoursAgo(12, 'whatsapp'), AHORA, HOURS)).toBe(
      true,
    );
  });

  it('reactiva también las pausadas desde el CRM', () => {
    expect(shouldAutoResume(pausedHoursAgo(20, 'crm'), AHORA, HOURS)).toBe(true);
  });

  it('no hay excepciones: cualquier pausa se reactiva pasada la ventana', () => {
    // Antes las conversaciones escaladas por Nova quedaban mudas para siempre.
    // Nova ya no se pausa sola, y si quedara una fila vieja marcada así,
    // también debe volver: el silencio permanente es peor que el bot.
    expect(shouldAutoResume(pausedHoursAgo(99, 'nova'), AHORA, HOURS)).toBe(
      true,
    );
  });

  it('no reactiva si la pausa es vieja y no tiene sello de tiempo', () => {
    // Filas pausadas antes de esta migración: las reactiva una persona.
    const conv: PauseState = {
      nova_paused: true,
      nova_paused_at: null,
      nova_paused_by: null,
    };
    expect(shouldAutoResume(conv, AHORA, HOURS)).toBe(false);
  });
});
