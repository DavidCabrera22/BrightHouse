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

  findAll() {
    return this.commissionRepository.find({ relations: ['sale'] });
  }

  async findOne(id: string) {
    const commission = await this.commissionRepository.findOne({ 
      where: { id },
      relations: ['sale'] 
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
