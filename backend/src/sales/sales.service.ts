import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { Unit } from '../units/entities/unit.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly tenantScope: TenantScopeService,
  ) {}

  async create(createSaleDto: CreateSaleDto, ctx: TenantContext) {
    await this.tenantScope.assertReference(Unit, createSaleDto.unit_id, ctx);
    await this.tenantScope.assertReference(Client, createSaleDto.client_id, ctx);
    await this.tenantScope.assertReference(User, createSaleDto.agent_id, ctx);
    const sale = this.saleRepository.create(createSaleDto);
    return this.saleRepository.save(sale);
  }

  findAll(ctx: TenantContext) {
    return this.tenantScope
      .scoped(Sale, 'sale', ctx)
      .leftJoinAndSelect('sale.unit', 'unit')
      .leftJoinAndSelect('unit.project', 'project')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.agent', 'agent')
      .getMany();
  }

  async findOne(id: string, ctx: TenantContext) {
    const sale = await this.tenantScope
      .scoped(Sale, 'sale', ctx)
      .leftJoinAndSelect('sale.unit', 'unit')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.agent', 'agent')
      .andWhere('sale.id = :id', { id })
      .getOne();

    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    return sale;
  }

  /**
   * Internal lookup used by the unit status pipeline. The caller has already
   * verified the unit belongs to the tenant, so this stays unscoped.
   */
  async findByUnit(unitId: string) {
    return this.saleRepository.findOne({
      where: { unit_id: unitId },
      order: { sale_date: 'DESC' },
      relations: ['unit', 'client', 'agent'],
    });
  }

  async update(id: string, updateSaleDto: UpdateSaleDto, ctx: TenantContext) {
    const sale = await this.findOne(id, ctx);
    await this.tenantScope.assertReference(Unit, (updateSaleDto as any).unit_id, ctx);
    await this.tenantScope.assertReference(Client, (updateSaleDto as any).client_id, ctx);
    await this.tenantScope.assertReference(User, (updateSaleDto as any).agent_id, ctx);
    Object.assign(sale, updateSaleDto);
    return this.saleRepository.save(sale);
  }

  async remove(id: string, ctx: TenantContext) {
    const sale = await this.findOne(id, ctx);
    return this.saleRepository.remove(sale);
  }
}
