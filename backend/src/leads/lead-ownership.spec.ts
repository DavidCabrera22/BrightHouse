import { LeadsService } from './leads.service';
import { TenantContext, TenantScopeService } from '../common/tenant';

/**
 * Quién puede decidir de quién es un lead.
 *
 * `PATCH /leads/:id` está abierto a Agent, y el DTO de actualización incluía
 * `assigned_agent_id` sin filtro: cualquier asesora podía pasarse a su nombre
 * la cartera de otra con una sola llamada. Que la interfaz no tuviera un botón
 * para hacerlo no era una restricción, solo una ausencia.
 */
function fakeRepo(seed: any[] = []) {
  const rows = [...seed];
  return {
    rows,
    findOne: jest.fn(async ({ where }: any) =>
      rows.find((r) => Object.entries(where).every(([k, v]) => r[k] === v)) ?? null,
    ),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (data: any) => {
      const i = rows.findIndex((r) => r.id === data.id);
      if (i >= 0) {
        rows[i] = { ...rows[i], ...data };
        return rows[i];
      }
      const row = { id: `lead-${rows.length + 1}`, ...data };
      rows.push(row);
      return row;
    }),
  };
}

const scope = {
  assertProjectInTenant: jest.fn(),
  scoped: jest.fn(),
} as unknown as TenantScopeService;

const ctxFor = (role: string, userId: string): TenantContext => ({
  userId,
  role,
  tenantId: 'tenant-alpes',
  isSuperAdmin: role === 'SuperAdmin',
});

describe('LeadsService — de quién es el lead', () => {
  let repo: ReturnType<typeof fakeRepo>;
  let service: LeadsService;

  beforeEach(() => {
    repo = fakeRepo([
      {
        id: 'lead-de-sofia',
        phone: '573001112233',
        project_id: 'proj-alpes',
        name: 'Prospecto',
        status: 'new',
        assigned_agent_id: 'sofia',
      },
    ]);
    service = new LeadsService(
      repo as any,
      { get: () => 'test-key' } as any,
      scope,
      { emit: jest.fn() } as any,
    );
    // `update` pasa por `findOne`, que va scopeado; aquí se resuelve directo.
    jest.spyOn(service, 'findOne').mockImplementation(async (id: string) => {
      const row = repo.rows.find((r) => r.id === id);
      return row as any;
    });
  });

  describe('al actualizar', () => {
    it('una asesora NO puede pasarse a su nombre el lead de otra', async () => {
      const lead = await service.update(
        'lead-de-sofia',
        { assigned_agent_id: 'diana' } as any,
        ctxFor('Agent', 'diana'),
      );

      expect(lead.assigned_agent_id).toBe('sofia');
    });

    it('pero sí puede trabajar el lead: el resto de campos se actualiza', async () => {
      const lead = await service.update(
        'lead-de-sofia',
        { status: 'contacted', assigned_agent_id: 'diana' } as any,
        ctxFor('Agent', 'diana'),
      );

      expect(lead.status).toBe('contacted');
      expect(lead.assigned_agent_id).toBe('sofia');
    });

    it('un Admin sí reparte la cartera', async () => {
      const lead = await service.update(
        'lead-de-sofia',
        { assigned_agent_id: 'diana' } as any,
        ctxFor('Admin', 'admin-1'),
      );

      expect(lead.assigned_agent_id).toBe('diana');
    });

    it('un SuperAdmin también', async () => {
      const lead = await service.update(
        'lead-de-sofia',
        { assigned_agent_id: 'diana' } as any,
        ctxFor('SuperAdmin', 'super-1'),
      );

      expect(lead.assigned_agent_id).toBe('diana');
    });
  });

  describe('al crear', () => {
    it('el lead que crea una asesora es suyo, aunque pida otro dueño', async () => {
      // El espejo del caso anterior: si no, bastaría con crear para colarse.
      const lead = await service.create(
        { project_id: 'proj-alpes', name: 'Nuevo', phone: '5730100', assigned_agent_id: 'sofia' } as any,
        ctxFor('Agent', 'diana'),
      );

      expect(lead.assigned_agent_id).toBe('diana');
    });

    it('un Admin puede crear el lead a nombre de quien quiera', async () => {
      const lead = await service.create(
        { project_id: 'proj-alpes', name: 'Nuevo', phone: '5730100', assigned_agent_id: 'sofia' } as any,
        ctxFor('Admin', 'admin-1'),
      );

      expect(lead.assigned_agent_id).toBe('sofia');
    });

    it('un Admin que no indica dueño deja el lead sin asignar', async () => {
      const lead = await service.create(
        { project_id: 'proj-alpes', name: 'Nuevo', phone: '5730100' } as any,
        ctxFor('Admin', 'admin-1'),
      );

      expect(lead.assigned_agent_id).toBeUndefined();
    });
  });
});
