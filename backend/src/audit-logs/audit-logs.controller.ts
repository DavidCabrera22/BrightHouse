import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Audit Logs')
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll() {
    return this.auditLogsService.findAll();
  }

  @Get(':entity/:id')
  findByEntity(@Param('entity') entity: string, @Param('id') id: string) {
    return this.auditLogsService.findByEntity(entity, id);
  }
}
