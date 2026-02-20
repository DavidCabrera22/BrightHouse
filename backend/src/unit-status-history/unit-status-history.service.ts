import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnitStatusHistory } from './entities/unit-status-history.entity';
import { CreateUnitStatusHistoryDto } from './dto/create-unit-status-history.dto';

@Injectable()
export class UnitStatusHistoryService {
  constructor(
    @InjectRepository(UnitStatusHistory)
    private readonly historyRepository: Repository<UnitStatusHistory>,
  ) {}

  create(createDto: CreateUnitStatusHistoryDto) {
    const history = this.historyRepository.create(createDto);
    return this.historyRepository.save(history);
  }

  findAll() {
    return this.historyRepository.find({ relations: ['unit', 'previous_status', 'new_status', 'changed_by_user'] });
  }

  async findByUnit(unitId: string) {
    return this.historyRepository.find({ 
      where: { unit_id: unitId },
      relations: ['previous_status', 'new_status', 'changed_by_user'],
      order: { change_date: 'DESC' }
    });
  }
}
