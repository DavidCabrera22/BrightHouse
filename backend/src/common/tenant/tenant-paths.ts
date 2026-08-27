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
 * Relation chain to walk from an entity to the row that carries `tenant_id`.
 * An empty array means the entity holds `tenant_id` itself.
 *
 * Only `projects`, `users` and `conversations` have a tenant_id column; every
 * other tenant-owned table reaches one through these relations, which is why
 * isolation needs no schema change or data backfill on the owned tables.
 *
 * Entities deliberately absent are global, not tenant-owned:
 *   Role, UnitStatus  - shared catalogs
 *   Tenant            - the tenant registry itself (SuperAdmin only)
 */
const TENANT_PATHS = new Map<Function, string[]>([
  [Project, []],
  [User, []],
  [Conversation, []],
  [Unit, ['project']],
  [Automation, ['project']],
  [AutomationRun, ['automation', 'project']],
  [Lead, ['project']],
  [Client, ['project']],
  [Campaign, ['project']],
  [Document, ['project']],
  [Message, ['conversation']],
  [AuditLog, ['user']],
  [Sale, ['unit', 'project']],
  [DigitalSignature, ['document', 'project']],
  [UnitStatusHistory, ['unit', 'project']],
  [Commission, ['sale', 'unit', 'project']],
  [Quote, ['project']],
  [QuoteInstallment, ['quote', 'project']],
]);

/**
 * Relations to join to reach `tenant_id` for an entity.
 * Throws for unregistered entities so a new tenant-owned table cannot be
 * silently exposed by forgetting to declare its path.
 */
export function getTenantPath(entity: Function): string[] {
  const path = TENANT_PATHS.get(entity);
  if (!path) {
    throw new Error(
      `No tenant path registered for entity "${entity.name}". ` +
        'Add it to TENANT_PATHS, or use a global repository if it is not tenant-owned.',
    );
  }
  return path;
}

export function isTenantOwned(entity: Function): boolean {
  return TENANT_PATHS.has(entity);
}

/**
 * Las entidades registradas, para que la prueba pueda comprobar que su propia
 * lista no se quedó atrás respecto de este registro.
 */
export function listTenantOwnedEntities(): Function[] {
  return [...TENANT_PATHS.keys()];
}
