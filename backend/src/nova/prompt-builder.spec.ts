import { buildSystemPrompt } from './prompt-builder';
import { OASIS_PARK } from './buildings/oasis-park.building';
import { ALPES_VISTA } from './buildings/alpes-vista.building';

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

  it('siempre incluye las reglas globales de formato y de traspaso a asesor', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toMatch(/dos párrafos/i);
    expect(prompt).toMatch(/ofrecer un asesor humano|conectarte con uno de nuestros asesores/i);
  });

  it('le ordena seguir atendiendo aunque ofrezca un asesor', () => {
    // Nova ya no se pausa sola: si dejara de responder, el prospecto quedaría
    // sin nadie hasta que un humano abriera el CRM.
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toMatch(/NO dejes de atenderlo/);
    expect(prompt).not.toMatch(/Deja de responder/);
  });
});

describe('buildSystemPrompt — prelanzamiento', () => {
  const prompt = buildSystemPrompt(ALPES_VISTA, null);

  it('deja claro desde el principio que el proyecto está en prelanzamiento', () => {
    expect(prompt).toMatch(/PRELANZAMIENTO/);
  });

  it('incluye el nombre y la ubicación', () => {
    expect(prompt).toContain('Alpes Vista');
    expect(prompt).toContain('sector Los Alpes, Cartagena');
  });

  it('lista lo único que Nova puede afirmar', () => {
    expect(prompt).toContain('Vivienda de Interés Social');
    expect(prompt).toMatch(/Lo único que puedes afirmar/);
  });

  it('pide los datos que hay que capturar', () => {
    expect(prompt).toContain('Nombre completo');
    expect(prompt).toContain('Correo electrónico');
  });

  it('prohíbe dar fechas y precios', () => {
    expect(prompt).toMatch(/NUNCA des una fecha de lanzamiento/);
    expect(prompt).toMatch(/NUNCA menciones precios/);
  });

  it('NO habla de inventario: no hay unidades cargadas', () => {
    expect(prompt).not.toMatch(/Inventario disponible/i);
  });

  it('NO invita a la sala de ventas: todavía no existe', () => {
    expect(prompt).not.toMatch(/sala de ventas, queda|visita rápida de 30 minutos/i);
  });

  it('ignora el inventario aunque se lo pasen', () => {
    // Un proyecto en prelanzamiento no tiene unidades; si por configuración
    // llegara un resumen, no debe filtrarse al prompt.
    const conInventario = buildSystemPrompt(ALPES_VISTA, '40 unidades disponibles');
    expect(conInventario).not.toContain('40 unidades disponibles');
  });

  it('no promete que un asesor llame: todavía no hay equipo comercial', () => {
    expect(prompt).toMatch(/NUNCA digas que un asesor va\s*\na llamar/);
  });

  it('conserva las reglas globales de formato', () => {
    expect(prompt).toMatch(/dos párrafos/i);
  });
});

describe('buildSystemPrompt — identidad del asistente', () => {
  it('en Alpes Vista se llama Sofía y nunca menciona a Nova', () => {
    const prompt = buildSystemPrompt(ALPES_VISTA, null);
    expect(prompt).toContain('Sofía');
    // El nombre viejo no puede quedar en ningún rincón del prompt: basta que
    // aparezca en una regla de formato para que el modelo lo adopte.
    expect(prompt).not.toContain('Nova');
  });

  it('los edificios sin nombre propio siguen siendo Nova', () => {
    const prompt = buildSystemPrompt(OASIS_PARK, null);
    expect(prompt).toContain('Nova');
    expect(prompt).not.toContain('Sofía');
  });

  it('se presenta como asesora de BrightHouse, no como asistente virtual', () => {
    for (const profile of [OASIS_PARK, ALPES_VISTA]) {
      const prompt = buildSystemPrompt(profile, null);
      expect(prompt).toMatch(/asesora de BrightHouse/);
      expect(prompt).not.toMatch(/asistente virtual/i);
    }
  });

  it('la regla del prefijo prohibido usa el nombre que lleva el asistente', () => {
    expect(buildSystemPrompt(ALPES_VISTA, null)).toContain('"Sofía:"');
    expect(buildSystemPrompt(OASIS_PARK, null)).toContain('"Nova:"');
  });
});
