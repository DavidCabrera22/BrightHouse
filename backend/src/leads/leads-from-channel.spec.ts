import { LeadsService } from './leads.service';
import { TenantContext, TenantScopeService } from '../common/tenant';

/** Repositorio en memoria: solo `findOne`, `create` y `save`, que es lo que usan estas rutas. */
function fakeRepo(seed: any[] = []) {
  const rows = [...seed];
  return {
    rows,
    findOne: jest.fn(async ({ where }: any) =>
      rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
    ),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (data: any) => {
      const row = { id: `lead-${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    }),
  };
}

const config = { get: () => 'test-key' } as any;
const events = { emit: jest.fn() } as any;
const ctx: TenantContext = { tenantId: 'tenant-alpes', isSuperAdmin: false } as TenantContext;

describe('LeadsService — leads que entran por un canal', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let scope: { assertProjectInTenant: jest.Mock };
  let service: LeadsService;

  beforeEach(() => {
    repo = fakeRepo([
      {
        id: 'lead-oasis',
        phone: '573001112233',
        project_id: 'proj-oasis',
        name: 'Jorge',
        status: 'new',
      },
    ]);
    scope = { assertProjectInTenant: jest.fn() };
    service = new LeadsService(
      repo as any,
      config,
      scope as unknown as TenantScopeService,
      events,
    );
  });

  describe('findOrCreateByPhone', () => {
    it('no reutiliza el lead de otro proyecto: el mismo teléfono puede escribirle a dos edificios', async () => {
      const { lead, created } = await service.findOrCreateByPhone(
        '573001112233',
        'proj-alpes',
      );

      expect(created).toBe(true);
      expect(lead.project_id).toBe('proj-alpes');
      expect(lead.id).not.toBe('lead-oasis');
    });

    it('reutiliza el lead cuando ya existe en ese mismo proyecto', async () => {
      const { lead, created } = await service.findOrCreateByPhone(
        '573001112233',
        'proj-oasis',
      );

      expect(created).toBe(false);
      expect(lead.id).toBe('lead-oasis');
    });
  });

  describe('createFromConversation', () => {
    it('valida el proyecto contra el tenant de quien pulsa el botón', async () => {
      await service.createFromConversation(
        { project_id: 'proj-alpes', name: 'Jorge Cabrera', phone: '573009998877', source: 'whatsapp' },
        ctx,
      );

      expect(scope.assertProjectInTenant).toHaveBeenCalledWith('proj-alpes', ctx);
    });

    it('no duplica: si ya hay un lead con ese teléfono en el proyecto, devuelve ese', async () => {
      const lead = await service.createFromConversation(
        { project_id: 'proj-oasis', name: 'Jorge', phone: '573001112233', source: 'whatsapp' },
        ctx,
      );

      expect(lead.id).toBe('lead-oasis');
      expect(repo.rows).toHaveLength(1);
    });

    it('crea el lead con los datos de la conversación', async () => {
      const lead = await service.createFromConversation(
        {
          project_id: 'proj-alpes',
          name: 'Jorge Cabrera',
          phone: '573009998877',
          email: 'jorge@example.com',
          source: 'whatsapp',
        },
        ctx,
      );

      expect(lead).toMatchObject({
        project_id: 'proj-alpes',
        name: 'Jorge Cabrera',
        phone: '573009998877',
        email: 'jorge@example.com',
        source: 'whatsapp',
      });
      expect(lead.ai_score).toBeGreaterThan(0);
    });
  });
});

describe('LeadsService — a quién queda el lead que crea el bot', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let service: LeadsService;

  beforeEach(() => {
    repo = fakeRepo([
      { id: 'lead-viejo', phone: '573001112233', project_id: 'proj-alpes', name: 'Jorge' },
    ]);
    service = new LeadsService(
      repo as any,
      { get: () => 'test-key' } as any,
      { assertProjectInTenant: jest.fn() } as any,
      { emit: jest.fn() } as any,
    );
  });

  it('queda a nombre del asesor que atiende el chatbot', async () => {
    const { lead } = await service.findOrCreateByPhone(
      '573009998877',
      'proj-alpes',
      'Nuevo prospecto',
      'sofia',
    );

    expect(lead.assigned_agent_id).toBe('sofia');
  });

  it('sin asesor configurado el lead entra sin asignar, como hasta ahora', async () => {
    const { lead } = await service.findOrCreateByPhone('573009998877', 'proj-alpes');

    expect(lead.assigned_agent_id).toBeUndefined();
  });

  it('no le roba un lead que ya existe a quien lo tenga', async () => {
    // El bot solo decide el dueño al crear. Si un asesor ya tomó ese lead, un
    // mensaje nuevo del prospecto no puede cambiárselo de manos.
    repo.rows[0].assigned_agent_id = 'diana';

    const { lead, created } = await service.findOrCreateByPhone(
      '573001112233',
      'proj-alpes',
      undefined,
      'sofia',
    );

    expect(created).toBe(false);
    expect(lead.assigned_agent_id).toBe('diana');
  });
});
