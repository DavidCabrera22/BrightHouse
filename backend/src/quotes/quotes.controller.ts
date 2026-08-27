import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import { QuotePdfService } from './quote-pdf.service';
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
  constructor(
    private readonly quotesService: QuotesService,
    private readonly quotePdfService: QuotePdfService,
  ) {}

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

  @Get(':id/pdf')
  @Roles('Admin', 'Agent')
  async pdf(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findOneEntity(id, tenant);
    const buffer = await this.quotePdfService.render(quote);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="Cotizacion-${quote.code}.pdf"`,
    });
    res.end(buffer);
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
