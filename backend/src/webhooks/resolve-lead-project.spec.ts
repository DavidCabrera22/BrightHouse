import { resolveLeadProject } from './resolve-lead-project';

const ALPES = { id: 'tenant-alpes', slug: 'alpes-vista', default_project_id: null };
const OASIS_PROJECT = { id: 'proj-oasis', tenant_id: 'tenant-brighthouse' };

describe('resolveLeadProject', () => {
  it('sin tenant resuelto usa el proyecto del entorno (montaje de un solo edificio)', () => {
    expect(
      resolveLeadProject({ tenant: null, envProjectId: 'proj-oasis' }),
    ).toEqual({ projectId: 'proj-oasis' });
  });

  it('con tenant resuelto usa su default_project_id', () => {
    expect(
      resolveLeadProject({
        tenant: { ...ALPES, default_project_id: 'proj-alpes' },
        configuredProject: { id: 'proj-alpes', tenant_id: 'tenant-alpes' },
        envProjectId: 'proj-oasis',
      }),
    ).toEqual({ projectId: 'proj-alpes' });
  });

  it('NO cae al proyecto del entorno cuando el tenant no tiene default_project_id', () => {
    // Este es el fallo real: el tenant de Alpes Vista existe pero sin proyecto,
    // y el respaldo del entorno registraba al prospecto en Oasis Park.
    const r = resolveLeadProject({ tenant: ALPES, envProjectId: 'proj-oasis' });

    expect(r.projectId).toBeUndefined();
    expect(r.problem).toContain('alpes-vista');
  });

  it('rechaza un default_project_id que apunta a un proyecto de otro tenant', () => {
    const r = resolveLeadProject({
      tenant: { ...ALPES, default_project_id: 'proj-oasis' },
      configuredProject: OASIS_PROJECT,
      envProjectId: 'proj-oasis',
    });

    expect(r.projectId).toBeUndefined();
    expect(r.problem).toContain('otro tenant');
  });

  it('rechaza un default_project_id que apunta a un proyecto inexistente', () => {
    const r = resolveLeadProject({
      tenant: { ...ALPES, default_project_id: 'proj-borrado' },
      configuredProject: null,
    });

    expect(r.projectId).toBeUndefined();
    expect(r.problem).toContain('proj-borrado');
  });

  it('un proyecto sin tenant tampoco sirve: no pertenece a nadie', () => {
    const r = resolveLeadProject({
      tenant: { ...ALPES, default_project_id: 'proj-huerfano' },
      configuredProject: { id: 'proj-huerfano', tenant_id: null },
    });

    expect(r.projectId).toBeUndefined();
    expect(r.problem).toBeDefined();
  });

  it('sin tenant y sin proyecto en el entorno no hay proyecto, pero tampoco es un error de config del tenant', () => {
    expect(resolveLeadProject({ tenant: null })).toEqual({ projectId: undefined });
  });
});
