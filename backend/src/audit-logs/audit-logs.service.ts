import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

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

  findAll() {
    return this.auditLogRepository.find({ relations: ['user'], order: { timestamp: 'DESC' } });
  }

  findByEntity(entity: string, entityId: string) {
    return this.auditLogRepository.find({ 
      where: { entity, entity_id: entityId },
      relations: ['user'],
      order: { timestamp: 'DESC' }
    });
  }
}
