import { buildSystemPrompt } from './prompt-builder';
import { OASIS_PARK } from './buildings/oasis-park.building';

describe('buildSystemPrompt', () => {
  it('incluye el nombre del edificio y la sala de ventas', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('Oasis Park');
    expect(prompt).toContain('Centro Comercial Santa Lucía, Local 13');
  });

  it('formatea el precio en pesos con separadores de miles', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('$238.000.000 COP');
  });

  it('lista cada tipología con su área', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('Tipo A — 60 m²');
    expect(prompt).toContain('Tipo B — 65 m²');
  });

  it('incluye las reglas propias del edificio', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('NUNCA preguntes por el presupuesto');
  });

  it('incluye el bloque de inventario cuando se le pasa', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, '12 unidades disponibles');
    expect(prompt).toContain('12 unidades disponibles');
  });

  it('sin inventario, instruye remitir la disponibilidad al asesor', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toMatch(/no tienes el inventario/i);
    expect(prompt).not.toMatch(/unidades disponibles/i);
  });

  it('siempre incluye las reglas globales de formato y escalamiento', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toMatch(/dos párrafos/i);
    expect(prompt).toMatch(/escalar/i);
  });
});
