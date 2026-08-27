import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UnitStatusHistoryService } from './unit-status-history.service';
import { CreateUnitStatusHistoryDto } from './dto/create-unit-status-history.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Unit Status History')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('unit-status-history')
export class UnitStatusHistoryController {
  constructor(private readonly historyService: UnitStatusHistoryService) {}

  @Post()
  @Roles('Admin')
  create(
    @Body() createDto: CreateUnitStatusHistoryDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.historyService.createForTenant(createDto, tenant);
  }

  @Get()
  @Roles('Admin')
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.historyService.findAll(tenant);
  }

  @Get('unit/:unitId')
  @Roles('Admin', 'Agent')
  findByUnit(@Param('unitId') unitId: string, @CurrentTenant() tenant: TenantContext) {
    return this.historyService.findByUnit(unitId, tenant);
  }
}
