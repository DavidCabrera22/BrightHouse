import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { ChangeUnitStatusDto } from './dto/change-unit-status.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  create(@Body() createUnitDto: CreateUnitDto, @CurrentTenant() tenant: TenantContext) {
    return this.unitsService.create(createUnitDto, tenant);
  }

  @Get()
  findAll(@CurrentTenant() tenant: TenantContext, @Query('project_id') projectId?: string) {
    return this.unitsService.findAll(projectId, tenant);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.unitsService.findOne(id, tenant);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.unitsService.update(id, updateUnitDto, tenant);
  }

  @Patch(':id/status')
  changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeUnitStatusDto,
    @Request() req,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.unitsService.changeStatus(
      id,
      changeStatusDto.new_status_id,
      req.user.userId,
      tenant,
      changeStatusDto.notes,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.unitsService.remove(id, tenant);
  }
}
