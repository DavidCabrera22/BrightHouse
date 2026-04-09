import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
  ) {}

  create(createSaleDto: CreateSaleDto) {
    const sale = this.saleRepository.create(createSaleDto);
    return this.saleRepository.save(sale);
  }

  findAll(tenantId?: string) {
    const qb = this.saleRepository.createQueryBuilder('sale')
      .leftJoinAndSelect('sale.unit', 'unit')
      .leftJoinAndSelect('unit.project', 'project')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.agent', 'agent');
    if (tenantId) qb.where('project.tenant_id = :tenantId', { tenantId });
    return qb.getMany();
  }

  async findOne(id: string) {
    const sale = await this.saleRepository.findOne({ 
      where: { id },
      relations: ['unit', 'client', 'agent'] 
    });
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`);
    }
    return sale;
  }

  async findByUnit(unitId: string) {
    return this.saleRepository.findOne({ 
      where: { unit_id: unitId },
      order: { sale_date: 'DESC' },
      relations: ['unit', 'client', 'agent'] 
    });
  }

  async update(id: string, updateSaleDto: UpdateSaleDto) {
    const sale = await this.findOne(id);
    Object.assign(sale, updateSaleDto);
    return this.saleRepository.save(sale);
  }

  async remove(id: string) {
    const sale = await this.findOne(id);
    return this.saleRepository.remove(sale);
  }
}
