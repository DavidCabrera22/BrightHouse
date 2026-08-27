import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Post()
  @Roles('Admin')
  create(@Body() createCommissionDto: CreateCommissionDto, @CurrentTenant() tenant: TenantContext) {
    return this.commissionsService.createForTenant(createCommissionDto, tenant);
  }

  @Get()
  @Roles('Admin')
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.commissionsService.findAll(tenant);
  }

  @Get(':id')
  @Roles('Admin')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.commissionsService.findOne(id, tenant);
  }

  @Patch(':id')
  @Roles('Admin')
  update(@Param('id') id: string, @Body() updateCommissionDto: UpdateCommissionDto, @CurrentTenant() tenant: TenantContext) {
    return this.commissionsService.update(id, updateCommissionDto, tenant);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.commissionsService.remove(id, tenant);
  }
}
