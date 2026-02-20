import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { UnitStatusesService } from './unit-statuses.service';
import { CreateUnitStatusDto } from './dto/create-unit-status.dto';
import { UpdateUnitStatusDto } from './dto/update-unit-status.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Unit Statuses')
@Controller('unit-statuses')
export class UnitStatusesController {
  constructor(private readonly unitStatusesService: UnitStatusesService) {}

  @Post()
  create(@Body() createUnitStatusDto: CreateUnitStatusDto) {
    return this.unitStatusesService.create(createUnitStatusDto);
  }

  @Get()
  findAll() {
    return this.unitStatusesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unitStatusesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnitStatusDto: UpdateUnitStatusDto) {
    return this.unitStatusesService.update(id, updateUnitStatusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unitStatusesService.remove(id);
  }
}
