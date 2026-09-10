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
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { QuotesService } from './quotes.service';
import { QuotePdfService } from './quote-pdf.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { QuotePreviewRequestDto } from './dto/preview-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';
import { QuoteReceiptsService } from './quote-receipts.service';
import { CreateQuoteReceiptDto } from './dto/create-quote-receipt.dto';
import { MAX_RECEIPT_BYTES } from './quote-receipt-file';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly quotePdfService: QuotePdfService,
    private readonly quoteReceiptsService: QuoteReceiptsService,
  ) {}

  /** Alimenta el cronograma en vivo del formulario. No escribe nada. */
  @Post('preview')
  @Roles('Admin', 'Agent')
  preview(@Body() dto: QuotePreviewRequestDto, @CurrentTenant() tenant: TenantContext) {
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
  async pdf(@Param('id') id: string, @CurrentTenant() tenant: TenantContext, @Res() res: Response) {
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

  @Get(':id/receipts')
  @Roles('Admin', 'Agent')
  receipts(@Param('id', ParseUUIDPipe) id: string, @CurrentTenant() tenant: TenantContext) {
    return this.quoteReceiptsService.list(id, tenant);
  }

  @Post(':id/receipts')
  @Roles('Admin', 'Agent')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(), limits: { fileSize: MAX_RECEIPT_BYTES, files: 1, fields: 2 },
  }))
  uploadReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuoteReceiptDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.quoteReceiptsService.create(id, dto, file, tenant);
  }

  @Get(':id/receipts/:receiptId/file')
  @Roles('Admin', 'Agent')
  async receiptFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('receiptId', ParseUUIDPipe) receiptId: string,
    @CurrentTenant() tenant: TenantContext,
    @Res() res: Response,
  ) {
    const file = await this.quoteReceiptsService.download(id, receiptId, tenant);
    res.set({
      'Content-Type': file.mime_type,
      'Content-Length': String(file.buffer.length),
      'Content-Disposition': `attachment; filename="comprobante"; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(file.buffer);
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
