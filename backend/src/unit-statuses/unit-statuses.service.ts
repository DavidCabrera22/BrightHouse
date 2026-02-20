import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitStatus } from './entities/unit-status.entity';
import { CreateUnitStatusDto } from './dto/create-unit-status.dto';
import { UpdateUnitStatusDto } from './dto/update-unit-status.dto';

@Injectable()
export class UnitStatusesService {
  constructor(
    @InjectRepository(UnitStatus)
    private readonly unitStatusRepository: Repository<UnitStatus>,
  ) {}

  create(createUnitStatusDto: CreateUnitStatusDto) {
    const unitStatus = this.unitStatusRepository.create(createUnitStatusDto);
    return this.unitStatusRepository.save(unitStatus);
  }

  findAll() {
    return this.unitStatusRepository.find({ order: { order_sequence: 'ASC' } });
  }

  async findOne(id: string) {
    const unitStatus = await this.unitStatusRepository.findOneBy({ id });
    if (!unitStatus) {
      throw new NotFoundException(`UnitStatus with ID ${id} not found`);
    }
    return unitStatus;
  }

  async update(id: string, updateUnitStatusDto: UpdateUnitStatusDto) {
    const unitStatus = await this.findOne(id);
    Object.assign(unitStatus, updateUnitStatusDto);
    return this.unitStatusRepository.save(unitStatus);
  }

  async remove(id: string) {
    const unitStatus = await this.findOne(id);
    return this.unitStatusRepository.remove(unitStatus);
  }
}
