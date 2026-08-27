import { DataSource } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { TenantScopeService } from './tenant-scope.service';
import { buildTenantContext, TenantContext } from './tenant-context';
import { getTenantPath, isTenantOwned, listTenantOwnedEntities } from './tenant-paths';

import { AuditLog } from '../../audit-logs/entities/audit-log.entity';
import { Automation } from '../../automations/entities/automation.entity';
import { AutomationRun } from '../../automations/entities/automation-run.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { Client } from '../../clients/entities/client.entity';
import { Commission } from '../../commissions/entities/commission.entity';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { Message } from '../../conversations/entities/message.entity';
import { DigitalSignature } from '../../digital-signatures/entities/digital-signature.entity';
import { Document } from '../../documents/entities/document.entity';
import { Lead } from '../../leads/entities/lead.entity';
import { Project } from '../../projects/entities/project.entity';
import { Quote } from '../../quotes/entities/quote.entity';
import { QuoteInstallment } from '../../quotes/entities/quote-installment.entity';
import { Sale } from '../../sales/entities/sale.entity';
import { Unit } from '../../units/entities/unit.entity';
import { UnitStatusHistory } from '../../unit-status-history/entities/unit-status-history.entity';
import { User } from '../../users/entities/user.entity';

/**
 * These build real TypeORM SQL without opening a connection, so the assertions
 * describe the query that would actually hit Postgres - not a mock of it.
 */

const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const tenantCtx: TenantContext = {
  userId: 'user-1',
  role: 'Admin',
  tenantId: TENANT_A,
  isSuperAdmin: false,
};

const superAdminCtx: TenantContext = {
  userId: 'user-0',
  role: 'SuperAdmin',
  tenantId: null,
  isSuperAdmin: true,
};

/** Entities that are intentionally global rather than tenant-owned. */
const GLOBAL_ENTITIES = ['Role', 'UnitStatus', 'Tenant'];

/** Every tenant-owned entity, with the table its tenant_id ultimately lives on. */
const TENANT_OWNED: [Function, string][] = [
  [Project, 'projects'],
  [User, 'users'],
  [Conversation, 'conversations'],
  [Unit, 'projects'],
  [Automation, 'projects'],
  [AutomationRun, 'projects'],
  [Lead, 'projects'],
  [Client, 'projects'],
  [Campaign, 'projects'],
  [Document, 'projects'],
  [Message, 'conversations'],
  [AuditLog, 'users'],
  [Sale, 'projects'],
  [DigitalSignature, 'projects'],
  [UnitStatusHistory, 'projects'],
  [Commission, 'projects'],
  [Quote, 'projects'],
  [QuoteInstallment, 'projects'],
];

describe('tenant isolation', () => {
  let dataSource: DataSource;
  let scope: TenantScopeService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    });
    // Builds entity metadata only - no database connection is opened.
    await (dataSource as any).buildMetadatas();
    scope = new TenantScopeService(dataSource);
  });

  describe('buildTenantContext', () => {
    it('rejects a non-SuperAdmin with no tenant instead of granting global access', () => {
      expect(() => buildTenantContext({ userId: 'u', role: 'Admin', tenant_id: null })).toThrow(
        ForbiddenException,
      );
    });

    it('rejects an Agent with no tenant', () => {
      expect(() => buildTenantContext({ userId: 'u', role: 'Agent' })).toThrow(ForbiddenException);
    });

    it('pins a normal user to its own tenant', () => {
      const ctx = buildTenantContext({ userId: 'u', role: 'Admin', tenant_id: TENANT_A });
      expect(ctx.tenantId).toBe(TENANT_A);
      expect(ctx.isSuperAdmin).toBe(false);
    });

    it('treats SuperAdmin as global', () => {
      const ctx = buildTenantContext({ userId: 'u', role: 'SuperAdmin', tenant_id: null });
      expect(ctx.isSuperAdmin).toBe(true);
      expect(ctx.tenantId).toBeNull();
    });

    it('does not let a stale tenant_id narrow a SuperAdmin token', () => {
      const ctx = buildTenantContext({ userId: 'u', role: 'SuperAdmin', tenant_id: TENANT_A });
      expect(ctx.tenantId).toBeNull();
    });
  });

  describe('scoped queries', () => {
    it.each(TENANT_OWNED)('%p filters on the owning tenant_id', (entity: any, ownerTable: string) => {
      const sql = scope.scoped(entity, 'entity', tenantCtx).getQuery();
      const path = getTenantPath(entity);

      if (path.length > 0) {
        const lastAlias = `__tenant_${path.length - 1}`;
        expect(sql).toContain(`"${ownerTable}" "${lastAlias}"`);
        expect(sql).toContain(`"${lastAlias}"."tenant_id" = :__tenantId`);
      } else {
        expect(sql).toContain('"entity"."tenant_id" = :__tenantId');
      }
    });

    it.each(TENANT_OWNED)('%p binds the caller tenant id', (entity: any) => {
      const params = scope.scoped(entity, 'entity', tenantCtx).getParameters();
      expect(params.__tenantId).toBe(TENANT_A);
    });

    it('joins the full chain for a deeply nested entity', () => {
      const sql = scope.scoped(Commission, 'entity', tenantCtx).getQuery();
      expect(sql).toContain('INNER JOIN "sales" "__tenant_0"');
      expect(sql).toContain('INNER JOIN "units" "__tenant_1"');
      expect(sql).toContain('INNER JOIN "projects" "__tenant_2"');
      expect(sql).toContain('"__tenant_2"."tenant_id" = :__tenantId');
    });

    it('leaves SuperAdmin queries unfiltered', () => {
      for (const [entity] of TENANT_OWNED) {
        const sql = scope.scoped(entity as any, 'entity', superAdminCtx).getQuery();
        expect(sql).not.toContain('__tenantId');
      }
    });

    it('keeps the tenant predicate when a caller adds its own filters', () => {
      const sql = scope
        .scoped(Unit, 'unit', tenantCtx)
        .andWhere('unit.project_id = :projectId', { projectId: 'p1' })
        .getQuery();

      expect(sql).toContain('"__tenant_0"."tenant_id" = :__tenantId');
      expect(sql).toContain('"unit"."project_id" = :projectId');
      // The caller filter is ANDed onto the tenant predicate, never replacing it.
      expect(sql).toMatch(/WHERE "__tenant_0"."tenant_id" = :__tenantId AND/);
    });

    it('uses aliases that cannot collide with a caller join of the same table', () => {
      const sql = scope
        .scoped(Unit, 'unit', tenantCtx)
        .leftJoinAndSelect('unit.project', 'project')
        .getQuery();

      expect(sql).toContain('"__tenant_0"');
      expect(sql).toContain('"project"');
    });
  });

  describe('tenant path registry', () => {
    it('registers every entity that is not explicitly global', () => {
      const unregistered = dataSource.entityMetadatas
        .map((m) => m.target as Function)
        .filter((target) => typeof target === 'function')
        .filter((target) => !GLOBAL_ENTITIES.includes(target.name))
        .filter((target) => !isTenantOwned(target))
        .map((target) => target.name);

      expect(unregistered).toEqual([]);
    });

    it('throws rather than returning an unscoped query for an unknown entity', () => {
      class Unregistered {}
      expect(() => getTenantPath(Unregistered)).toThrow(/No tenant path registered/);
    });

    // TENANT_OWNED se mantiene a mano y duplica el registro. Sin esto, una
    // entidad registrada pero ausente de la lista pierde en silencio sus
    // aserciones de SQL: la prueba de arriba la da por buena y nadie se entera.
    it('cubre en TENANT_OWNED todas las entidades del registro', () => {
      const covered = TENANT_OWNED.map(([entity]) => (entity as Function).name);
      const missing = listTenantOwnedEntities()
        .map((entity) => entity.name)
        .filter((name) => !covered.includes(name));

      expect(missing).toEqual([]);
    });
  });
});
