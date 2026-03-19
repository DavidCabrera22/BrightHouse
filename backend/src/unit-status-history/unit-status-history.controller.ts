import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UnitStatusHistoryService } from './unit-status-history.service';
import { CreateUnitStatusHistoryDto } from './dto/create-unit-status-history.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Unit Status History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unit-status-history')
export class UnitStatusHistoryController {
  constructor(private readonly historyService: UnitStatusHistoryService) {}

  @Post()
  @Roles('Admin')
  create(@Body() createDto: CreateUnitStatusHistoryDto) {
    return this.historyService.create(createDto);
  }

  @Get()
  @Roles('Admin')
  findAll() {
    return this.historyService.findAll();
  }

  @Get('unit/:unitId')
  @Roles('Admin', 'Agent')
  findByUnit(@Param('unitId') unitId: string) {
    return this.historyService.findByUnit(unitId);
  }
}
