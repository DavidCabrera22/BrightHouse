import { buildProspectBlock, describeElapsed } from './prospect-context';

const AHORA = new Date('2026-08-28T12:00:00Z');
const haceMs = (ms: number) => new Date(AHORA.getTime() - ms);
const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

describe('describeElapsed', () => {
  it.each([
    [10 * MINUTO, 'hace unos minutos'],
    [1 * HORA, 'hace una hora'],
    [5 * HORA, 'hace 5 horas'],
    [1 * DIA, 'ayer'],
    [4 * DIA, 'hace 4 días'],
    [35 * DIA, 'hace un mes'],
    [95 * DIA, 'hace 3 meses'],
    [500 * DIA, 'hace más de un año'],
  ])('%d ms -> "%s"', (ms, esperado) => {
    expect(describeElapsed(haceMs(ms as number), AHORA)).toBe(esperado);
  });

  it('acepta una fecha que viene como cadena desde la base', () => {
    const comoCadena = haceMs(4 * DIA).toISOString() as unknown as Date;
    expect(describeElapsed(comoCadena, AHORA)).toBe('hace 4 días');
  });
});

describe('buildProspectBlock', () => {
  it('no aporta nada para un prospecto nuevo que escribe ahora', () => {
    expect(
      buildProspectBlock({ lastMessageAt: haceMs(2 * MINUTO) }, AHORA),
    ).toBeNull();
  });

  it('no aporta nada si no se sabe nada y no hay historia', () => {
    expect(buildProspectBlock({}, AHORA)).toBeNull();
  });

  it('lista lo que el CRM ya sabe y prohíbe repreguntarlo', () => {
    const b = buildProspectBlock(
      {
        name: 'Jorge Cabrera',
        email: 'jorge@gmail.com',
        interested_in: 'para vivir con mi familia',
        lastMessageAt: haceMs(10 * MINUTO),
      },
      AHORA,
    )!;
    expect(b).toContain('Jorge Cabrera');
    expect(b).toContain('jorge@gmail.com');
    expect(b).toContain('para vivir con mi familia');
    expect(b).toMatch(/NO se lo vuelvas a preguntar/);
  });

  it('en una conversación activa NO le dice que retome', () => {
    const b = buildProspectBlock(
      { name: 'Jorge', lastMessageAt: haceMs(30 * MINUTO) },
      AHORA,
    )!;
    expect(b).not.toMatch(/último mensaje fue/);
  });

  it('tras un silencio largo le pide saludar de nuevo, por su nombre', () => {
    const b = buildProspectBlock(
      { name: 'Jorge', lastMessageAt: haceMs(95 * DIA) },
      AHORA,
    )!;
    expect(b).toMatch(/último mensaje fue hace 3 meses/);
    expect(b).toMatch(/por su nombre/);
    expect(b).toMatch(/no retomes la conversación a media frase/i);
  });

  it('tras un silencio largo sin nombre, no inventa la mención al nombre', () => {
    const b = buildProspectBlock({ lastMessageAt: haceMs(95 * DIA) }, AHORA)!;
    expect(b).toMatch(/último mensaje fue hace 3 meses/);
    expect(b).not.toMatch(/por su nombre/);
  });

  it('el umbral para "vuelve" son 24 horas', () => {
    expect(
      buildProspectBlock({ lastMessageAt: haceMs(23 * HORA) }, AHORA),
    ).toBeNull();
    expect(
      buildProspectBlock({ lastMessageAt: haceMs(25 * HORA) }, AHORA),
    ).toMatch(/último mensaje fue/);
  });
});

describe('buildProspectBlock — resumen de lo conversado', () => {
  it('incluye el resumen y aclara que ya ocurrió', () => {
    const b = buildProspectBlock(
      {
        name: 'Jorge',
        conversationSummary: 'Su esposa trabaja en Barranquilla y quieren mudarse en 2027.',
        lastMessageAt: haceMs(95 * DIA),
      },
      AHORA,
    )!;
    expect(b).toContain('Su esposa trabaja en Barranquilla');
    expect(b).toMatch(/no las repitas ni las cuestiones/);
  });

  it('un resumen basta para que el bloque exista, sin más datos', () => {
    const b = buildProspectBlock(
      { conversationSummary: 'Busca dos alcobas.', lastMessageAt: haceMs(5 * MINUTO) },
      AHORA,
    );
    expect(b).toContain('Busca dos alcobas.');
  });

  it('un resumen vacío o en blanco no genera bloque', () => {
    expect(
      buildProspectBlock({ conversationSummary: '   ', lastMessageAt: haceMs(MINUTO) }, AHORA),
    ).toBeNull();
  });
});
