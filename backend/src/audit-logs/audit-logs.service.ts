import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /** System-level write. The tenant is implied by the acting user. */
  async log(userId: string, action: string, entity: string, entityId: string, oldData?: any, newData?: any) {
    const log = this.auditLogRepository.create({
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData,
    });
    return this.auditLogRepository.save(log);
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(AuditLog, 'log', ctx)
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.timestamp', 'DESC')
      .getMany();
  }

  findByEntity(entity: string, entityId: string, ctx: TenantContext) {
    return this.tenantScope
      .scoped(AuditLog, 'log', ctx)
      .leftJoinAndSelect('log.user', 'user')
      .andWhere('log.entity = :entity', { entity })
      .andWhere('log.entity_id = :entityId', { entityId })
      .orderBy('log.timestamp', 'DESC')
      .getMany();
  }
}
