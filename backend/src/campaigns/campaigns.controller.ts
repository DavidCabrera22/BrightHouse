import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles('Admin')
  create(@Body() createCampaignDto: CreateCampaignDto, @CurrentTenant() tenant: TenantContext) {
    return this.campaignsService.create(createCampaignDto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.campaignsService.findAll(tenant);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.campaignsService.findOne(id, tenant);
  }

  @Patch(':id')
  @Roles('Admin')
  update(@Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto, @CurrentTenant() tenant: TenantContext) {
    return this.campaignsService.update(id, updateCampaignDto, tenant);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.campaignsService.remove(id, tenant);
  }
}
