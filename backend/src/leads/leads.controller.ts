import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Roles('Admin', 'Agent')
  create(@Body() createLeadDto: CreateLeadDto, @CurrentTenant() tenant: TenantContext) {
    return this.leadsService.create(createLeadDto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.leadsService.findAll(tenant);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.leadsService.findOne(id, tenant);
  }

  @Patch(':id')
  @Roles('Admin', 'Agent')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto, @CurrentTenant() tenant: TenantContext) {
    return this.leadsService.update(id, updateLeadDto, tenant);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.leadsService.remove(id, tenant);
  }

  @Post(':id/suggest')
  @Roles('Admin', 'Agent')
  @ApiOperation({ summary: 'Get AI-powered next action suggestion for a lead' })
  getSuggestion(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.leadsService.getSuggestion(id, tenant);
  }

  @Post('admin/recalculate-scores')
  @Roles('Admin')
  @ApiOperation({ summary: 'Recalculate AI scores for all leads' })
  async recalculateScores(@CurrentTenant() tenant: TenantContext) {
    const count = await this.leadsService.recalculateAllScores(tenant);
    return { updated: count };
  }
}
