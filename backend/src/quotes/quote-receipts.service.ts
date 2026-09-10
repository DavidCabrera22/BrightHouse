import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { QuoteReceipt } from './entities/quote-receipt.entity';
import { QuotesService } from './quotes.service';
import { CreateQuoteReceiptDto } from './dto/create-quote-receipt.dto';
import { validateReceiptFile } from './quote-receipt-file';
import { InstallmentConcept } from './quote-calculator';

@Injectable()
export class QuoteReceiptsService {
  private readonly logger = new Logger(QuoteReceiptsService.name);

  constructor(
    @InjectRepository(QuoteReceipt) private readonly receipts: Repository<QuoteReceipt>,
    private readonly quotes: QuotesService,
    private readonly tenantScope: TenantScopeService,
    private readonly storage: CloudinaryService,
  ) {}

  async list(quoteId: string, ctx: TenantContext) {
    await this.quotes.findOneEntity(quoteId, ctx);
    const receipts = await this.tenantScope.scoped(QuoteReceipt, 'receipt', ctx)
      .andWhere('receipt.quote_id = :quoteId', { quoteId })
      .orderBy('receipt.created_at', 'DESC').getMany();
    return receipts.map((receipt) => this.toResponse(receipt));
  }

  async create(quoteId: string, dto: CreateQuoteReceiptDto, file: Express.Multer.File, ctx: TenantContext) {
    // Autorizar y verificar la cuota antes de enviar datos al almacenamiento.
    const quote = await this.quotes.findOneEntity(quoteId, ctx);
    const installment = dto.installment_id
      ? quote.installments.find((i) => i.id === dto.installment_id) : null;
    if (dto.installment_id && !installment) {
      throw new BadRequestException('La cuota seleccionada no pertenece al cronograma actual. Vuelve a abrir la cotización.');
    }
    const { mime, extension } = validateReceiptFile(file);
    let publicId: string;
    try {
      publicId = await this.storage.uploadPrivateFile(file, `brighthouse/quote-receipts/${quote.id}`, extension);
    } catch {
      throw new ServiceUnavailableException('No se pudo subir el comprobante. Intenta de nuevo.');
    }
    try {
      const receipt = this.receipts.create({
        quote_id: quote.id,
        storage_public_id: publicId,
        original_name: file.originalname.replace(/.*[\\/]/, '').replace(/[\x00-\x1f\x7f]/g, '').slice(0, 255) || `comprobante.${extension}`,
        mime_type: mime,
        file_size: file.buffer.length,
        installment_snapshot: installment ? {
          number: installment.number,
          concept: installment.concept as InstallmentConcept,
          amount: installment.amount,
          due_date: installment.due_date,
        } : null,
        notes: dto.notes?.trim() || null,
        uploaded_by: ctx.userId,
      });
      return this.toResponse(await this.receipts.save(receipt));
    } catch {
      try {
        await this.storage.deletePrivateFile(publicId);
      } catch {
        this.logger.error(`No se pudo limpiar un comprobante sin registro de la cotización ${quoteId}`);
      }
      throw new ServiceUnavailableException('No se pudo guardar el comprobante. Intenta de nuevo.');
    }
  }

  async download(quoteId: string, receiptId: string, ctx: TenantContext) {
    const receipt = await this.tenantScope.scoped(QuoteReceipt, 'receipt', ctx)
      .addSelect('receipt.storage_public_id')
      .andWhere('receipt.quote_id = :quoteId', { quoteId })
      .andWhere('receipt.id = :receiptId', { receiptId }).getOne();
    if (!receipt) throw new NotFoundException('Comprobante no encontrado');
    try {
      const buffer = await this.storage.downloadPrivateFile(receipt.storage_public_id);
      return { buffer, mime_type: receipt.mime_type, original_name: receipt.original_name };
    } catch {
      throw new ServiceUnavailableException('No se pudo descargar el comprobante. Intenta de nuevo.');
    }
  }

  private toResponse(receipt: QuoteReceipt) {
    return {
      id: receipt.id, quote_id: receipt.quote_id, original_name: receipt.original_name,
      mime_type: receipt.mime_type, file_size: receipt.file_size,
      installment_snapshot: receipt.installment_snapshot, notes: receipt.notes,
      created_at: receipt.created_at, uploaded_by: receipt.uploaded_by,
    };
  }
}
