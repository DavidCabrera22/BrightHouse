import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { ChangeUnitStatusDto } from './dto/change-unit-status.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

/**
 * El inventario lo gestiona la dirección.
 *
 * Este controlador era el único del sistema sin `RolesGuard`: bastaba estar
 * autenticado, así que un asesor podía borrar un apartamento. Y el guard por sí
 * solo no cierra nada —sin `@Roles` deja pasar a cualquiera—, por eso cada ruta
 * declara el suyo.
 *
 * Un asesor solo mueve el estado de una unidad, que es lo que necesita para
 * cerrar una venta; crear, editar y borrar quedan para Admin.
 */
@ApiTags('Units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @Roles('Admin')
  create(@Body() createUnitDto: CreateUnitDto, @CurrentTenant() tenant: TenantContext) {
    return this.unitsService.create(createUnitDto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(@CurrentTenant() tenant: TenantContext, @Query('project_id') projectId?: string) {
    return this.unitsService.findAll(projectId, tenant);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.unitsService.findOne(id, tenant);
  }

  @Patch(':id')
  @Roles('Admin')
  update(
    @Param('id') id: string,
    @Body() updateUnitDto: UpdateUnitDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.unitsService.update(id, updateUnitDto, tenant);
  }

  // Un asesor sí: es el paso que cierra una venta. `POST /sales/register` lo
  // llama por dentro, pero la ruta se mantiene abierta para corregir a mano.
  @Patch(':id/status')
  @Roles('Admin', 'Agent')
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
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.unitsService.remove(id, tenant);
  }
}
