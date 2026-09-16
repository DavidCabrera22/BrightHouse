import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

const ALPES = '29922df8-f0cf-4519-9879-95025e67daff';
const ELEGANZZA = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const AJENO = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const sofia = {
  id: 'user-sofia',
  email: 'sofia@example.com',
  name: 'Sofía',
  role: { name: 'Agent' },
  tenant_id: ALPES,
  project_id: 'project-alpes',
};

describe('AuthService tenant switching', () => {
  let sign: jest.Mock;
  let users: { tenantsFor: jest.Mock; findByIdForSession: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    sign = jest.fn().mockReturnValue('token');
    users = {
      tenantsFor: jest.fn().mockResolvedValue([
        { id: ALPES, name: 'Alpes Vista', slug: 'alpes-vista' },
        { id: ELEGANZZA, name: 'Eleganzza', slug: 'eleganzza' },
      ]),
      findByIdForSession: jest.fn().mockResolvedValue(sofia),
    };
    service = new AuthService(users as any, { sign } as any);
  });

  it('login usa el tenant principal y devuelve los tenants disponibles', async () => {
    const session = await service.login(sofia);
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: ALPES, project_id: 'project-alpes' }));
    expect(session.tenants).toHaveLength(2);
  });

  it('emite un token para un tenant adicional al que pertenece', async () => {
    const session = await service.switchTenant(sofia.id, ELEGANZZA);
    expect(session.tenant_id).toBe(ELEGANZZA);
    // El proyecto del tenant principal no viaja al otro tenant.
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: ELEGANZZA, project_id: null }));
  });

  it('rechaza un tenant al que no pertenece', async () => {
    await expect(service.switchTenant(sofia.id, AJENO)).rejects.toThrow(ForbiddenException);
    expect(sign).not.toHaveBeenCalled();
  });

  it('no deja que un SuperAdmin se ancle a un tenant', async () => {
    users.findByIdForSession.mockResolvedValue({ ...sofia, role: { name: 'SuperAdmin' } });
    await expect(service.switchTenant(sofia.id, ALPES)).rejects.toThrow(BadRequestException);
  });
});
