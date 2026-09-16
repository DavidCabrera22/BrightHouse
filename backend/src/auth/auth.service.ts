import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SUPER_ADMIN_ROLE } from '../common/tenant';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    return this.issueSession(user, user.tenant_id ?? null);
  }

  /**
   * Emite un token nuevo con otro tenant activo. El token lleva un solo
   * tenant, así que todo el aislamiento existente sigue igual; lo único que se
   * valida aquí es que el usuario de verdad pertenezca al tenant pedido.
   */
  async switchTenant(userId: string, tenantId: string) {
    const user = await this.usersService.findByIdForSession(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.role?.name === SUPER_ADMIN_ROLE) {
      throw new BadRequestException('A SuperAdmin already sees every tenant');
    }
    return this.issueSession(user, tenantId);
  }

  private async issueSession(user: any, tenantId: string | null) {
    const tenants = await this.usersService.tenantsFor(user.id);
    if (tenantId && !tenants.some((t) => t.id === tenantId)) {
      throw new ForbiddenException('You do not belong to that tenant');
    }

    // project_id es de su tenant principal; en otro tenant no significa nada.
    const projectId = tenantId === user.tenant_id ? user.project_id : null;
    const payload = { email: user.email, sub: user.id, role: user.role?.name, project_id: projectId, tenant_id: tenantId };
    return {
      access_token: this.jwtService.sign(payload),
      role: user.role?.name,
      id: user.id,
      name: user.name,
      email: user.email,
      tenant_id: tenantId,
      tenants,
    };
  }
}
