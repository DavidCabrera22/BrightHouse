import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { QuoteReceipt } from './entities/quote-receipt.entity';
import { QuoteReceiptsService } from './quote-receipts.service';
import { QuotesService } from './quotes.service';

const ctx: TenantContext = { userId: 'agent-1', tenantId: 'tenant-1', role: 'Agent', isSuperAdmin: false };
const file = { originalname: 'pago.pdf', mimetype: 'application/pdf', buffer: Buffer.from('%PDF-1.4\ncontenido de prueba') } as Express.Multer.File;
const installment = { id: 'installment-1', number: 2, concept: 'extra', amount: 19_000_000, due_date: '2026-12-15' };

describe('QuoteReceiptsService', () => {
  let service: QuoteReceiptsService;
  let repository: { create: jest.Mock; save: jest.Mock };
  let quotes: { findOneEntity: jest.Mock };
  let storage: { uploadPrivateFile: jest.Mock; deletePrivateFile: jest.Mock; downloadPrivateFile: jest.Mock };
  let scope: { scoped: jest.Mock };
  let query: { addSelect: jest.Mock; andWhere: jest.Mock; orderBy: jest.Mock; getOne: jest.Mock; getMany: jest.Mock };
  let saved: QuoteReceipt;

  beforeEach(() => {
    saved = undefined;
    repository = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => { saved = { ...data, id: 'receipt-1', created_at: new Date() }; return saved; }),
    };
    quotes = { findOneEntity: jest.fn(async () => ({ id: 'quote-1', installments: [{ ...installment }] })) };
    storage = {
      uploadPrivateFile: jest.fn(async () => 'private/receipt.pdf'),
      deletePrivateFile: jest.fn(async () => undefined),
      downloadPrivateFile: jest.fn(async () => file.buffer),
    };
    query = {
      addSelect: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(), getOne: jest.fn(async () => saved), getMany: jest.fn(async () => saved ? [saved] : []),
    };
    scope = { scoped: jest.fn(() => query) };
    service = new QuoteReceiptsService(repository as unknown as Repository<QuoteReceipt>, quotes as unknown as QuotesService,
      scope as unknown as TenantScopeService, storage as unknown as CloudinaryService);
  });

  it('guarda el archivo, su autor y la referencia original del pago sin exponer su ubicación', async () => {
    const receipt = await service.create('quote-1', { installment_id: installment.id, notes: '  Transferencia  ' }, file, ctx);
    expect(storage.uploadPrivateFile).toHaveBeenCalledWith(file, 'brighthouse/quote-receipts/quote-1', 'pdf');
    expect(receipt).toMatchObject({ original_name: 'pago.pdf', uploaded_by: ctx.userId, file_size: file.buffer.length,
      notes: 'Transferencia', installment_snapshot: { number: 2, concept: 'extra', amount: 19_000_000, due_date: '2026-12-15' } });
    expect(receipt).not.toHaveProperty('storage_public_id');
    expect(receipt.installment_snapshot).not.toHaveProperty('id');
    expect(saved.storage_public_id).toBe('private/receipt.pdf');
  });

  it('permite adjuntar varios comprobantes generales y de una cuota', async () => {
    const general = await service.create('quote-1', {}, file, ctx);
    expect(general.installment_snapshot).toBeNull();
    await service.create('quote-1', { installment_id: installment.id }, file, ctx);
    expect(repository.save).toHaveBeenCalledTimes(2);
  });

  it('conserva el soporte y su referencia después de cambiar el cronograma', async () => {
    await service.create('quote-1', { installment_id: installment.id }, file, ctx);
    quotes.findOneEntity.mockResolvedValue({ id: 'quote-1', installments: [] });
    const receipts = await service.list('quote-1', ctx);
    expect(receipts[0].installment_snapshot.amount).toBe(19_000_000);
    expect(receipts[0].installment_snapshot.due_date).toBe('2026-12-15');
    expect(receipts[0]).not.toHaveProperty('storage_public_id');
  });

  it('rechaza cotizaciones ajenas antes de subir archivos o consultar listas', async () => {
    quotes.findOneEntity.mockRejectedValue(new NotFoundException());
    await expect(service.create('foreign', {}, file, ctx)).rejects.toThrow(NotFoundException);
    await expect(service.list('foreign', ctx)).rejects.toThrow(NotFoundException);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
    expect(scope.scoped).not.toHaveBeenCalled();
  });

  it('rechaza una cuota de otra cotización o de un cronograma anterior', async () => {
    await expect(service.create('quote-1', { installment_id: 'foreign' }, file, ctx)).rejects.toThrow(BadRequestException);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('rechaza adjuntos inválidos antes de escribir', async () => {
    await expect(service.create('quote-1', {}, { ...file, buffer: Buffer.from('<html>') }, ctx)).rejects.toThrow(BadRequestException);
    expect(repository.save).not.toHaveBeenCalled();
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('no deja un registro de archivo si falla la subida', async () => {
    storage.uploadPrivateFile.mockRejectedValue(new Error('storage error'));
    await expect(service.create('quote-1', {}, file, ctx)).rejects.toThrow(ServiceUnavailableException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('limpia el archivo si falla la persistencia del comprobante', async () => {
    repository.save.mockRejectedValue(new Error('database error'));
    await expect(service.create('quote-1', {}, file, ctx)).rejects.toThrow(/guardar el comprobante/);
    expect(storage.deletePrivateFile).toHaveBeenCalledWith('private/receipt.pdf');
  });

  it('descarga con filtro de empresa, cotización y comprobante', async () => {
    await service.create('quote-1', {}, file, ctx);
    const result = await service.download('quote-1', 'receipt-1', ctx);
    expect(scope.scoped).toHaveBeenCalledWith(QuoteReceipt, 'receipt', ctx);
    expect(query.andWhere).toHaveBeenCalledWith('receipt.quote_id = :quoteId', { quoteId: 'quote-1' });
    expect(query.andWhere).toHaveBeenCalledWith('receipt.id = :receiptId', { receiptId: 'receipt-1' });
    expect(result.buffer).toEqual(file.buffer);
    expect(result.original_name).toBe('pago.pdf');
  });

  it('no consulta el almacenamiento para un comprobante ajeno o inexistente', async () => {
    query.getOne.mockResolvedValue(null);
    await expect(service.download('foreign', 'receipt-1', ctx)).rejects.toThrow(NotFoundException);
    expect(storage.downloadPrivateFile).not.toHaveBeenCalled();
  });

  it('devuelve un error recuperable si no se puede descargar', async () => {
    await service.create('quote-1', {}, file, ctx);
    storage.downloadPrivateFile.mockRejectedValue(new Error('timeout'));
    await expect(service.download('quote-1', 'receipt-1', ctx)).rejects.toThrow(/descargar el comprobante/);
  });
});
