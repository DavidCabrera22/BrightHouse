import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PreviewQuoteDto } from './dto/preview-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  /** Alimenta el cronograma en vivo del formulario. No escribe nada. */
  @Post('preview')
  @Roles('Admin', 'Agent')
  preview(@Body() dto: PreviewQuoteDto, @CurrentTenant() tenant: TenantContext) {
    return this.quotesService.preview(dto, tenant);
  }

  @Post()
  @Roles('Admin', 'Agent')
  create(@Body() dto: CreateQuoteDto, @CurrentTenant() tenant: TenantContext) {
    return this.quotesService.create(dto, tenant);
  }

  @Get()
  @Roles('Admin', 'Agent')
  findAll(
    @CurrentTenant() tenant: TenantContext,
    @Query('project_id') projectId?: string,
    @Query('status') status?: string,
  ) {
    return this.quotesService.findAll(tenant, projectId, status);
  }

  @Get(':id')
  @Roles('Admin', 'Agent')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.quotesService.findOne(id, tenant);
  }

  @Patch(':id')
  @Roles('Admin', 'Agent')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.quotesService.update(id, dto, tenant);
  }

  @Patch(':id/status')
  @Roles('Admin', 'Agent')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteStatusDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.quotesService.changeStatus(id, dto.status, tenant);
  }

  @Delete(':id')
  @Roles('Admin')
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.quotesService.remove(id, tenant);
  }
}
