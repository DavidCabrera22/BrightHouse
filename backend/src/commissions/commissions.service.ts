import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Commission } from './entities/commission.entity';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';

@Injectable()
export class CommissionsService {
  constructor(
    @InjectRepository(Commission)
    private readonly commissionRepository: Repository<Commission>,
  ) {}

  create(createCommissionDto: CreateCommissionDto) {
    const commission = this.commissionRepository.create(createCommissionDto);
    return this.commissionRepository.save(commission);
  }

  findAll(tenantId?: string) {
    const qb = this.commissionRepository.createQueryBuilder('commission')
      .leftJoinAndSelect('commission.sale', 'sale')
      .leftJoinAndSelect('sale.unit', 'unit')
      .leftJoinAndSelect('unit.project', 'project')
      .leftJoinAndSelect('sale.client', 'client')
      .leftJoinAndSelect('sale.agent', 'agent')
      .orderBy('commission.created_at', 'DESC');
    if (tenantId) qb.where('project.tenant_id = :tenantId', { tenantId });
    return qb.getMany();
  }

  async findOne(id: string) {
    const commission = await this.commissionRepository.findOne({
      where: { id },
      relations: ['sale', 'sale.unit', 'sale.client', 'sale.agent'],
    });
    if (!commission) {
      throw new NotFoundException(`Commission with ID ${id} not found`);
    }
    return commission;
  }

  async update(id: string, updateCommissionDto: UpdateCommissionDto) {
    const commission = await this.findOne(id);
    Object.assign(commission, updateCommissionDto);
    return this.commissionRepository.save(commission);
  }

  async remove(id: string) {
    const commission = await this.findOne(id);
    return this.commissionRepository.remove(commission);
  }
}
