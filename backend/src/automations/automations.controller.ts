import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import { UpdateAutomationDto } from './dto/update-automation.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Automations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Post()
  @Roles('Admin')
  create(@Body() dto: CreateAutomationDto, @CurrentTenant() tenant: TenantContext) {
    return this.automationsService.create(dto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.automationsService.findAll(tenant);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.automationsService.findOne(id, tenant);
  }

  @Patch(':id')
  @Roles('Admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAutomationDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.automationsService.update(id, dto, tenant);
  }

  @Patch(':id/status')
  @Roles('Admin')
  @ApiOperation({ summary: 'Activate, pause or move an automation back to draft' })
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.automationsService.setStatus(id, body.status, tenant);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.automationsService.remove(id, tenant);
  }
}
