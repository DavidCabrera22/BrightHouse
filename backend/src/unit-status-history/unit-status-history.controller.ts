import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { UnitStatusHistoryService } from './unit-status-history.service';
import { CreateUnitStatusHistoryDto } from './dto/create-unit-status-history.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Unit Status History')
@Controller('unit-status-history')
export class UnitStatusHistoryController {
  constructor(private readonly historyService: UnitStatusHistoryService) {}

  @Post()
  create(@Body() createDto: CreateUnitStatusHistoryDto) {
    return this.historyService.create(createDto);
  }

  @Get()
  findAll() {
    return this.historyService.findAll();
  }

  @Get('unit/:unitId')
  findByUnit(@Param('unitId') unitId: string) {
    return this.historyService.findByUnit(unitId);
  }
}
