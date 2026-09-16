import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserTenant } from './entities/user-tenant.entity';
import { Tenant } from '../tenants/entities/tenant.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { SUPER_ADMIN_ROLE, TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserTenant)
    private readonly userTenantRepository: Repository<UserTenant>,
    private readonly dataSource: DataSource,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /**
   * Only a SuperAdmin may hand out the SuperAdmin role. Without this a tenant
   * Admin could mint a platform-wide account and read every tenant, which
   * would walk straight around the isolation added everywhere else.
   */
  private async assertCanAssignRole(roleId: string | undefined, ctx: TenantContext) {
    if (!roleId || ctx.isSuperAdmin) return;
    const role = await this.dataSource.getRepository(Role).findOneBy({ id: roleId });
    if (role?.name === SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Only a SuperAdmin can assign the SuperAdmin role');
    }
  }

  async create(createUserDto: CreateUserDto, ctx: TenantContext): Promise<User> {
    const existingUser = await this.userRepository.findOneBy({ email: createUserDto.email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    await this.assertCanAssignRole(createUserDto.role_id, ctx);
    await this.tenantScope.assertProjectInTenant(createUserDto.project_id, ctx);

    const { password, extra_tenant_ids, ...userData } = createUserDto;
    const salt = await bcrypt.genSalt();
    const password_hash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      ...userData,
      password_hash,
      // Never client-controlled: a user always lands in the creator's tenant.
      tenant_id: ctx.isSuperAdmin ? (createUserDto.tenant_id ?? null) : ctx.tenantId,
    });

    const saved = await this.userRepository.save(user);
    if (ctx.isSuperAdmin && extra_tenant_ids !== undefined) {
      await this.setExtraTenants(saved, extra_tenant_ids);
    }
    return saved;
  }

  async findAll(ctx: TenantContext): Promise<User[]> {
    const users = await this.tenantScope
      .scoped(User, 'user', ctx)
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.project', 'project')
      .getMany();
    return ctx.isSuperAdmin ? this.withExtraTenants(users) : users;
  }

  async findOne(id: string, ctx: TenantContext): Promise<User> {
    const user = await this.tenantScope
      .scoped(User, 'user', ctx)
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.project', 'project')
      .andWhere('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    if (ctx.isSuperAdmin) {
      const [withExtras] = await this.withExtraTenants([user]);
      return withExtras;
    }
    return user;
  }

  /**
   * Tenants en los que el usuario puede operar: el principal primero y luego
   * los de user_tenants. Lo usan el login y el cambio de tenant, antes de que
   * exista un contexto, así que no va scoped.
   */
  async tenantsFor(userId: string): Promise<Pick<Tenant, 'id' | 'name' | 'slug'>[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'tenant_id'],
    });
    if (!user) return [];

    const extras = await this.userTenantRepository.find({ where: { user_id: userId } });
    const ids = [user.tenant_id, ...extras.map((m) => m.tenant_id)].filter(
      (id, i, all): id is string => !!id && all.indexOf(id) === i,
    );
    if (ids.length === 0) return [];

    const tenants = await this.dataSource.getRepository(Tenant).find({
      where: { id: In(ids) },
      select: ['id', 'name', 'slug'],
    });
    return ids
      .map((id) => tenants.find((t) => t.id === id))
      .filter((t): t is Tenant => !!t);
  }

  /**
   * Un Admin de tenant solo administra a los usuarios cuyo tenant principal es
   * el suyo. Quien está en su tenant como invitado (vía user_tenants) aparece en
   * su lista, pero cambiarle la contraseña o borrarlo afectaría a otra empresa.
   */
  private assertOwnsUser(user: User, ctx: TenantContext) {
    if (ctx.isSuperAdmin || user.tenant_id === ctx.tenantId) return;
    throw new ForbiddenException(
      'Este usuario pertenece a otra empresa; solo un Super Admin puede modificarlo.',
    );
  }

  private async withExtraTenants(users: User[]): Promise<User[]> {
    if (users.length === 0) return users;
    const memberships = await this.userTenantRepository.find({
      where: { user_id: In(users.map((u) => u.id)) },
    });
    return users.map((u) =>
      Object.assign(u, {
        extra_tenant_ids: memberships.filter((m) => m.user_id === u.id).map((m) => m.tenant_id),
      }),
    );
  }

  /** Reemplaza los tenants adicionales. El principal nunca se guarda como extra. */
  private async setExtraTenants(user: User, tenantIds: string[]) {
    const wanted = [...new Set(tenantIds)].filter((id) => id !== user.tenant_id);
    if (wanted.length > 0) {
      const found = await this.dataSource.getRepository(Tenant).countBy({ id: In(wanted) });
      if (found !== wanted.length) {
        throw new NotFoundException('One of the extra tenants does not exist');
      }
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(UserTenant, { user_id: user.id });
      if (wanted.length > 0) {
        await manager.insert(
          UserTenant,
          wanted.map((tenant_id) => ({ user_id: user.id, tenant_id })),
        );
      }
    });
  }

  /** Login path - runs before a tenant context exists, so it stays unscoped. */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password_hash', 'role_id', 'project_id', 'tenant_id', 'status', 'name'],
      relations: ['role'],
    });
  }

  /** Cambio de tenant: el usuario ya está autenticado, pero su tenant va a cambiar. */
  findByIdForSession(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'role_id', 'project_id', 'tenant_id', 'status', 'name'],
      relations: ['role'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, ctx: TenantContext): Promise<User> {
    const user = await this.findOne(id, ctx);
    this.assertOwnsUser(user, ctx);

    await this.assertCanAssignRole(updateUserDto.role_id, ctx);
    await this.tenantScope.assertProjectInTenant(updateUserDto.project_id, ctx);

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      user.password_hash = await bcrypt.hash(updateUserDto.password, salt);
    }
    // Always dropped, including an empty string, so it never lands on the entity.
    delete updateUserDto.password;

    // tenant_id is never moved by a tenant Admin.
    const { tenant_id, extra_tenant_ids, ...safe } = updateUserDto as any;
    // Viene de findOne para el SuperAdmin; no es columna y no se guarda.
    delete (user as any).extra_tenant_ids;
    Object.assign(user, safe);
    if (ctx.isSuperAdmin && tenant_id !== undefined) {
      user.tenant_id = tenant_id;
    }

    const saved = await this.userRepository.save(user);
    if (ctx.isSuperAdmin && extra_tenant_ids !== undefined) {
      await this.setExtraTenants(saved, extra_tenant_ids);
    } else if (ctx.isSuperAdmin && tenant_id) {
      // Si el principal pasó a ser uno de los extra, no puede quedar duplicado.
      await this.userTenantRepository.delete({ user_id: saved.id, tenant_id });
    }
    return saved;
  }

  async remove(id: string, ctx: TenantContext): Promise<void> {
    const user = await this.findOne(id, ctx);
    this.assertOwnsUser(user, ctx);
    await this.userRepository.remove(user);
  }
}
