import { resolveBuildingSlug } from './resolve-building-slug';

describe('resolveBuildingSlug', () => {
  it('con el tenant resuelto, responde como su edificio', () => {
    const r = resolveBuildingSlug({ tenant: { slug: 'alpes-vista' }, requestedSlug: 'alpes-vista' });
    expect(r.slug).toBe('alpes-vista');
    expect(r.problem).toBeUndefined();
  });

  it('el slug sale del tenant guardado, no del que venga en la URL', () => {
    // La base es la fuente de verdad: si la URL trae una variante, manda el tenant.
    const r = resolveBuildingSlug({ tenant: { slug: 'alpes-vista' }, requestedSlug: 'AlpesVista' });
    expect(r.slug).toBe('alpes-vista');
  });

  it('sin ?tenant= NO responde, y dice qué hay que configurar', () => {
    // Este es el fallo que costó dos prospectos: sin el parámetro se respondía
    // como "oasis-park" por defecto y se le negaba a la gente el proyecto por
    // el que preguntaba, ofreciéndole otro edificio a otro precio.
    const r = resolveBuildingSlug({ tenant: null });
    expect(r.slug).toBeUndefined();
    expect(r.problem).toMatch(/sin \?tenant=/i);
  });

  it('con un slug que no existe tampoco adivina', () => {
    const r = resolveBuildingSlug({ tenant: null, requestedSlug: 'edificio-fantasma' });
    expect(r.slug).toBeUndefined();
    expect(r.problem).toContain('edificio-fantasma');
  });

  it('nunca cae a un edificio por defecto', () => {
    for (const requestedSlug of [undefined, '', 'lo-que-sea']) {
      expect(resolveBuildingSlug({ tenant: null, requestedSlug }).slug).toBeUndefined();
    }
  });
});
