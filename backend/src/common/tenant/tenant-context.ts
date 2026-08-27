import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';

export const SUPER_ADMIN_ROLE = 'SuperAdmin';

/** Stable code the frontend matches on, so the message can change freely. */
export const TENANT_NOT_ASSIGNED = 'TENANT_NOT_ASSIGNED';

export interface TenantContext {
  userId: string;
  role: string;
  /** Null only for SuperAdmin. Every other role is pinned to exactly one tenant. */
  tenantId: string | null;
  isSuperAdmin: boolean;
}

/**
 * Builds the tenant context from the JWT payload attached by JwtStrategy.
 *
 * Fails closed on purpose: a non-SuperAdmin account without tenant_id is
 * misconfigured, not a platform operator. Previously a null tenant_id silently
 * meant "see every tenant", so any user seeded before tenants existed had
 * cross-tenant read access. Run `npm run backfill:tenants` to assign one.
 */
export function buildTenantContext(user: any): TenantContext {
  const isSuperAdmin = user?.role === SUPER_ADMIN_ROLE;
  const tenantId = user?.tenant_id ?? null;

  if (!isSuperAdmin && !tenantId) {
    throw new ForbiddenException({
      statusCode: 403,
      code: TENANT_NOT_ASSIGNED,
      message: 'This account is not linked to a tenant. Ask a platform administrator to assign one.',
    });
  }

  return {
    userId: user?.userId,
    role: user?.role,
    tenantId: isSuperAdmin ? null : tenantId,
    isSuperAdmin,
  };
}

/** Injects the caller's TenantContext into a controller handler. */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext =>
    buildTenantContext(ctx.switchToHttp().getRequest().user),
);
