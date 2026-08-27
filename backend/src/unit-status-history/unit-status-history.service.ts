import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitStatusHistory } from './entities/unit-status-history.entity';
import { Unit } from '../units/entities/unit.entity';
import { CreateUnitStatusHistoryDto } from './dto/create-unit-status-history.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class UnitStatusHistoryService {
  constructor(
    @InjectRepository(UnitStatusHistory)
    private readonly historyRepository: Repository<UnitStatusHistory>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /**
   * System-level create, written by the unit status pipeline after the unit
   * has been verified. Request-driven creates must use `createForTenant`.
   */
  create(createDto: CreateUnitStatusHistoryDto) {
    const history = this.historyRepository.create(createDto);
    return this.historyRepository.save(history);
  }

  async createForTenant(createDto: CreateUnitStatusHistoryDto, ctx: TenantContext) {
    await this.tenantScope.assertReference(Unit, createDto.unit_id, ctx);
    return this.create(createDto);
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(UnitStatusHistory, 'history', ctx)
      .leftJoinAndSelect('history.unit', 'unit')
      .leftJoinAndSelect('history.previous_status', 'previous_status')
      .leftJoinAndSelect('history.new_status', 'new_status')
      .leftJoinAndSelect('history.changed_by_user', 'changed_by_user')
      .getMany();
  }

  async findByUnit(unitId: string, ctx: TenantContext) {
    return this.tenantScope
      .scoped(UnitStatusHistory, 'history', ctx)
      .leftJoinAndSelect('history.previous_status', 'previous_status')
      .leftJoinAndSelect('history.new_status', 'new_status')
      .leftJoinAndSelect('history.changed_by_user', 'changed_by_user')
      .andWhere('history.unit_id = :unitId', { unitId })
      .orderBy('history.change_date', 'DESC')
      .getMany();
  }
}
