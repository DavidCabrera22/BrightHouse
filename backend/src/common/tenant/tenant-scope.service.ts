import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DataSource, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { TenantContext } from './tenant-context';
import { getTenantPath } from './tenant-paths';
import { Project } from '../../projects/entities/project.entity';

type EntityClass<T> = new (...args: any[]) => T;

/**
 * Single place where tenant isolation is enforced.
 *
 * Services must go through this instead of hitting repositories directly for
 * tenant-owned data, so that `findOne`/`update`/`remove` are scoped too - not
 * just `findAll`. An unscoped `findOne(id)` is an IDOR: the UUID is the only
 * thing standing between one tenant and another tenant's row.
 */
@Injectable()
export class TenantScopeService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Adds the tenant predicate to a query builder the caller already built,
   * joining through the entity's tenant path. No-op for SuperAdmin.
   */
  apply<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    entity: EntityClass<T>,
    ctx: TenantContext,
  ): SelectQueryBuilder<T> {
    if (ctx.isSuperAdmin) return qb;

    let alias = qb.alias;
    // Prefixed aliases so they never collide with joins the caller added.
    getTenantPath(entity).forEach((relation, i) => {
      const next = `__tenant_${i}`;
      qb.innerJoin(`${alias}.${relation}`, next);
      alias = next;
    });

    return qb.andWhere(`${alias}.tenant_id = :__tenantId`, { __tenantId: ctx.tenantId });
  }

  /** A query builder already scoped to the caller's tenant. */
  scoped<T extends ObjectLiteral>(
    entity: EntityClass<T>,
    alias: string,
    ctx: TenantContext,
  ): SelectQueryBuilder<T> {
    const qb = this.dataSource.getRepository(entity).createQueryBuilder(alias);
    return this.apply(qb, entity, ctx);
  }

  /** True when the row exists and belongs to the caller's tenant. */
  async canAccess<T extends ObjectLiteral>(
    entity: EntityClass<T>,
    id: string,
    ctx: TenantContext,
  ): Promise<boolean> {
    if (!id) return false;
    const found = await this.scoped(entity, 'entity', ctx)
      .andWhere('entity.id = :id', { id })
      .getExists();
    return found;
  }

  /**
   * Guards a read/update/delete of a single row.
   *
   * Raises NotFound rather than Forbidden on a foreign row: telling a caller
   * "that exists but is not yours" leaks which UUIDs are real across tenants.
   */
  async assertAccess<T extends ObjectLiteral>(
    entity: EntityClass<T>,
    id: string,
    ctx: TenantContext,
  ): Promise<void> {
    if (!(await this.canAccess(entity, id, ctx))) {
      throw new NotFoundException(`${entity.name} with ID ${id} not found`);
    }
  }

  /**
   * Guards a create/update payload that carries a client-supplied project_id.
   * Without this, a caller can scope a row into another tenant on write even
   * though every read is filtered.
   */
  async assertProjectInTenant(projectId: string | undefined, ctx: TenantContext): Promise<void> {
    if (ctx.isSuperAdmin || projectId === undefined) return;
    if (!projectId) {
      throw new ForbiddenException('project_id is required');
    }
    const owned = await this.dataSource
      .getRepository(Project)
      .createQueryBuilder('project')
      .where('project.id = :projectId', { projectId })
      .andWhere('project.tenant_id = :tenantId', { tenantId: ctx.tenantId })
      .getExists();

    if (!owned) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }
  }

  /**
   * Guards a client-supplied foreign key that points at a tenant-owned row
   * (unit_id, document_id, lead_id, ...). Skipped when the value is undefined.
   */
  async assertReference<T extends ObjectLiteral>(
    entity: EntityClass<T>,
    id: string | undefined | null,
    ctx: TenantContext,
  ): Promise<void> {
    if (ctx.isSuperAdmin || id === undefined || id === null) return;
    await this.assertAccess(entity, id, ctx);
  }
}
