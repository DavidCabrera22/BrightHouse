import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UnitStatusesService } from './unit-statuses.service';
import { CreateUnitStatusDto } from './dto/create-unit-status.dto';
import { UpdateUnitStatusDto } from './dto/update-unit-status.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Unit Statuses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unit-statuses')
export class UnitStatusesController {
  constructor(private readonly unitStatusesService: UnitStatusesService) {}

  @Post()
  @Roles('Admin')
  create(@Body() createUnitStatusDto: CreateUnitStatusDto) {
    return this.unitStatusesService.create(createUnitStatusDto);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll() {
    return this.unitStatusesService.findAll();
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string) {
    return this.unitStatusesService.findOne(id);
  }

  @Patch(':id')
  @Roles('Admin')
  update(@Param('id') id: string, @Body() updateUnitStatusDto: UpdateUnitStatusDto) {
    return this.unitStatusesService.update(id, updateUnitStatusDto);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string) {
    return this.unitStatusesService.remove(id);
  }
}
