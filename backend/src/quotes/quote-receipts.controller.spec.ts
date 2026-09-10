import { ExecutionContext, INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TenantScopeService } from '../common/tenant';
import { QuoteReceipt } from './entities/quote-receipt.entity';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';
import { QuotePdfService } from './quote-pdf.service';
import { QuoteReceiptsService } from './quote-receipts.service';
import { MAX_RECEIPT_BYTES } from './quote-receipt-file';

const quoteId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const installmentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const receiptId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const pdf = Buffer.from('%PDF-1.4\ncomprobante de prueba');

describe('comprobantes: contrato HTTP multipart', () => {
  let app: INestApplication;
  let records: QuoteReceipt[];
  const storage = {
    uploadPrivateFile: jest.fn(async () => 'private/test.pdf'),
    downloadPrivateFile: jest.fn(async () => pdf), deletePrivateFile: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [QuotesController],
      providers: [QuoteReceiptsService,
        { provide: QuotesService, useValue: { findOneEntity: jest.fn(async () => ({ id: quoteId,
          installments: [{ id: installmentId, number: 1, concept: 'separacion', amount: 5_000_000, due_date: '2026-09-10' }] })) } },
        { provide: QuotePdfService, useValue: {} },
        { provide: CloudinaryService, useValue: storage },
        { provide: getRepositoryToken(QuoteReceipt), useValue: {
          create: (data) => data, save: async (data) => { const row = { ...data, id: receiptId, created_at: new Date() }; records.push(row); return row; },
        } },
        { provide: TenantScopeService, useValue: { scoped: () => {
          const filters: Record<string, string> = {};
          return {
            andWhere(_sql, params) { Object.assign(filters, params); return this; },
            addSelect() { return this; }, orderBy() { return this; },
            getMany: async () => records.filter((r) => r.quote_id === filters.quoteId),
            getOne: async () => records.find((r) => r.quote_id === filters.quoteId && r.id === filters.receiptId),
          };
        } } },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest();
      if (req.headers.authorization !== 'Bearer local-test') throw new UnauthorizedException();
      req.user = { userId: 'agent-1', role: 'Agent', tenant_id: 'tenant-1' }; return true;
    } }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true,
      transformOptions: { enableImplicitConversion: true } }));
    await app.init();
  });
  beforeEach(() => { records = []; jest.clearAllMocks(); });
  afterAll(async () => { await app?.close(); });

  it('sube, lista y descarga el archivo con su referencia de cuota y nombre original', async () => {
    const upload = await request(app.getHttpServer()).post(`/api/quotes/${quoteId}/receipts`)
      .set('Authorization', 'Bearer local-test').field('installment_id', installmentId).field('notes', 'Separación')
      .attach('file', pdf, { filename: 'pago.pdf', contentType: 'application/pdf' }).expect(201);
    expect(upload.body.installment_snapshot.concept).toBe('separacion');
    expect(upload.body).not.toHaveProperty('storage_public_id');
    const list = await request(app.getHttpServer()).get(`/api/quotes/${quoteId}/receipts`)
      .set('Authorization', 'Bearer local-test').expect(200);
    expect(list.body).toHaveLength(1);
    const download = await request(app.getHttpServer()).get(`/api/quotes/${quoteId}/receipts/${receiptId}/file`)
      .set('Authorization', 'Bearer local-test').expect(200);
    expect(download.body).toEqual(pdf);
    expect(download.headers['content-disposition']).toContain("filename*=UTF-8''pago.pdf");
    expect(download.headers['cache-control']).toBe('private, no-store');
  });

  it('requiere sesión para subir, listar y descargar', async () => {
    await request(app.getHttpServer()).post(`/api/quotes/${quoteId}/receipts`).attach('file', pdf, 'pago.pdf').expect(401);
    await request(app.getHttpServer()).get(`/api/quotes/${quoteId}/receipts`).expect(401);
    await request(app.getHttpServer()).get(`/api/quotes/${quoteId}/receipts/${receiptId}/file`).expect(401);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('valida los campos multipart antes de escribir', async () => {
    await request(app.getHttpServer()).post(`/api/quotes/${quoteId}/receipts`).set('Authorization', 'Bearer local-test')
      .field('installment_id', 'no-es-uuid').attach('file', pdf, 'pago.pdf').expect(400);
    await request(app.getHttpServer()).post(`/api/quotes/${quoteId}/receipts`).set('Authorization', 'Bearer local-test')
      .field('notes', 'a'.repeat(501)).attach('file', pdf, 'pago.pdf').expect(400);
    await request(app.getHttpServer()).post(`/api/quotes/${quoteId}/receipts`).set('Authorization', 'Bearer local-test')
      .field('uploaded_by', 'otro-usuario').attach('file', pdf, 'pago.pdf').expect(400);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });

  it('rechaza solicitudes sin archivo, archivos mayores de 10 MB y múltiples adjuntos', async () => {
    await request(app.getHttpServer()).post(`/api/quotes/${quoteId}/receipts`).set('Authorization', 'Bearer local-test').expect(400);
    await request(app.getHttpServer()).post(`/api/quotes/${quoteId}/receipts`).set('Authorization', 'Bearer local-test')
      .attach('file', Buffer.alloc(MAX_RECEIPT_BYTES + 1), 'grande.pdf').expect(413);
    await request(app.getHttpServer()).post(`/api/quotes/${quoteId}/receipts`).set('Authorization', 'Bearer local-test')
      .attach('file', pdf, 'uno.pdf').attach('file', pdf, 'dos.pdf').expect(400);
    expect(storage.uploadPrivateFile).not.toHaveBeenCalled();
  });
});
