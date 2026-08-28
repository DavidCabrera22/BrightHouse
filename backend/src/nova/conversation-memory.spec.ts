import {
  StoredMessage,
  splitHistory,
  toTranscript,
} from './conversation-memory';

const T0 = new Date('2026-01-01T00:00:00Z').getTime();

function msgs(n: number, tipo = 'user'): StoredMessage[] {
  return Array.from({ length: n }, (_, i) => ({
    sender_type: tipo,
    content: `m${i}`,
    created_at: new Date(T0 + i * 60_000),
  }));
}

describe('splitHistory', () => {
  it('con menos mensajes que la ventana, todos van textuales', () => {
    const { window, toSummarize } = splitHistory(msgs(5), 40, null);
    expect(window).toHaveLength(5);
    expect(toSummarize).toEqual([]);
  });

  it('recorta a la ventana y deja el resto para resumir', () => {
    const { window, toSummarize } = splitHistory(msgs(50), 40, null);
    expect(window).toHaveLength(40);
    expect(toSummarize).toHaveLength(10);
    // La ventana son los mas recientes, en orden.
    expect(window[0].content).toBe('m10');
    expect(window[39].content).toBe('m49');
    expect(toSummarize[0].content).toBe('m0');
  });

  it('no vuelve a resumir lo que ya está en el resumen', () => {
    const todos = msgs(50);
    // Ya se resumió hasta m4 inclusive.
    const { toSummarize } = splitHistory(todos, 40, todos[4].created_at);
    expect(toSummarize.map((m) => m.content)).toEqual(['m5', 'm6', 'm7', 'm8', 'm9']);
  });

  it('no deja nada por resumir si el resumen ya cubre todo lo viejo', () => {
    const todos = msgs(50);
    const { toSummarize } = splitHistory(todos, 40, todos[9].created_at);
    expect(toSummarize).toEqual([]);
  });

  it('acepta una fecha que viene como cadena desde la base', () => {
    const todos = msgs(50);
    const comoCadena = todos[4].created_at.toISOString() as unknown as Date;
    const { toSummarize } = splitHistory(todos, 40, comoCadena);
    expect(toSummarize).toHaveLength(5);
  });

  it('con historial vacío no falla', () => {
    expect(splitHistory([], 40, null)).toEqual({ toSummarize: [], window: [] });
  });

  it('una ventana de cero manda todo a resumir', () => {
    const { window, toSummarize } = splitHistory(msgs(3), 0, null);
    expect(window).toEqual([]);
    expect(toSummarize).toHaveLength(3);
  });
});

describe('toTranscript', () => {
  it('nombra a cada interlocutor como lo ve el prospecto', () => {
    const t = toTranscript([
      { sender_type: 'user', content: 'Hola', created_at: new Date(T0) },
      { sender_type: 'bot', content: '¿En qué te ayudo?', created_at: new Date(T0) },
      { sender_type: 'agent', content: 'Yo sigo desde aquí', created_at: new Date(T0) },
    ]);
    expect(t).toBe('Prospecto: Hola\nNova: ¿En qué te ayudo?\nAsesor: Yo sigo desde aquí');
  });
});
