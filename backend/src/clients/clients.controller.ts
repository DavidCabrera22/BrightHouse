import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('Admin', 'Agent')
  create(@Body() createClientDto: CreateClientDto, @CurrentTenant() tenant: TenantContext) {
    return this.clientsService.create(createClientDto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(@CurrentTenant() tenant: TenantContext, @Query('project_id') projectId?: string) {
    return this.clientsService.findAll(tenant, projectId);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.clientsService.findOne(id, tenant);
  }

  @Patch(':id')
  @Roles('Admin', 'Agent')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto, @CurrentTenant() tenant: TenantContext) {
    return this.clientsService.update(id, updateClientDto, tenant);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.clientsService.remove(id, tenant);
  }
}
