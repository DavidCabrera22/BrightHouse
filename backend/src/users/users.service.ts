import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
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

    const { password, ...userData } = createUserDto;
    const salt = await bcrypt.genSalt();
    const password_hash = await bcrypt.hash(password, salt);

    const user = this.userRepository.create({
      ...userData,
      password_hash,
      // Never client-controlled: a user always lands in the creator's tenant.
      tenant_id: ctx.isSuperAdmin ? (createUserDto.tenant_id ?? null) : ctx.tenantId,
    });

    return this.userRepository.save(user);
  }

  findAll(ctx: TenantContext): Promise<User[]> {
    return this.tenantScope
      .scoped(User, 'user', ctx)
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('user.project', 'project')
      .getMany();
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
    return user;
  }

  /** Login path - runs before a tenant context exists, so it stays unscoped. */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password_hash', 'role_id', 'project_id', 'tenant_id', 'status', 'name'],
      relations: ['role'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, ctx: TenantContext): Promise<User> {
    const user = await this.findOne(id, ctx);

    await this.assertCanAssignRole(updateUserDto.role_id, ctx);
    await this.tenantScope.assertProjectInTenant(updateUserDto.project_id, ctx);

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      user.password_hash = await bcrypt.hash(updateUserDto.password, salt);
    }
    // Always dropped, including an empty string, so it never lands on the entity.
    delete updateUserDto.password;

    // tenant_id is never moved by a tenant Admin.
    const { tenant_id, ...safe } = updateUserDto as any;
    Object.assign(user, safe);
    if (ctx.isSuperAdmin && tenant_id !== undefined) {
      user.tenant_id = tenant_id;
    }

    return this.userRepository.save(user);
  }

  async remove(id: string, ctx: TenantContext): Promise<void> {
    const user = await this.findOne(id, ctx);
    await this.userRepository.remove(user);
  }
}
