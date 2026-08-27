import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles('Admin')
  findAll(@CurrentTenant() tenant: TenantContext) {
    return this.auditLogsService.findAll(tenant);
  }

  @Get(':entity/:id')
  @Roles('Admin')
  findByEntity(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.auditLogsService.findByEntity(entity, id, tenant);
  }
}
