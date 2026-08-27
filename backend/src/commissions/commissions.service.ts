import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './entities/commission.entity';
import { Sale } from '../sales/entities/sale.entity';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /**
   * System-level create, triggered by a unit status change. The caller has
   * already verified the unit (and therefore the sale) belongs to the tenant.
   * Request-driven creates must use `createForTenant` instead.
   */
  create(createCommissionDto: CreateCommissionDto) {
    const commission = this.commissionRepository.create(createCommissionDto);
    return this.commissionRepository.save(commission);
  }

  async createForTenant(createCommissionDto: CreateCommissionDto, ctx: TenantContext) {
    await this.tenantScope.assertReference(Sale, createCommissionDto.sale_id, ctx);
    return this.create(createCommissionDto);
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(Commission, 'commission', ctx)
      .leftJoinAndSelect('commission.sale', 'sale')
      .leftJoinAndSelect('sale.unit', 'unit')
      .leftJoinAndSelect('unit.project', 'project')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.agent', 'agent')
      .orderBy('commission.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: string, ctx: TenantContext) {
    const commission = await this.tenantScope
      .scoped(Commission, 'commission', ctx)
      .leftJoinAndSelect('commission.sale', 'sale')
      .leftJoinAndSelect('sale.unit', 'unit')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.agent', 'agent')
      .andWhere('commission.id = :id', { id })
      .getOne();

    if (!commission) {
      throw new NotFoundException(`Commission with ID ${id} not found`);
    }
    return commission;
  }

  async update(id: string, updateCommissionDto: UpdateCommissionDto, ctx: TenantContext) {
    const commission = await this.findOne(id, ctx);
    await this.tenantScope.assertReference(Sale, (updateCommissionDto as any).sale_id, ctx);
    Object.assign(commission, updateCommissionDto);
    return this.commissionRepository.save(commission);
  }

  async remove(id: string, ctx: TenantContext) {
    const commission = await this.findOne(id, ctx);
    return this.commissionRepository.remove(commission);
  }
}
