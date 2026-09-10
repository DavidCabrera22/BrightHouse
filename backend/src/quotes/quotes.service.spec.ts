import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { Unit } from '../units/entities/unit.entity';
import { Client } from '../clients/entities/client.entity';
import { Quote } from './entities/quote.entity';
import { QuoteInstallment } from './entities/quote-installment.entity';
import { QuoteReceipt } from './entities/quote-receipt.entity';
import { QuotesService } from './quotes.service';
import { calculateQuote } from './quote-calculator';

const ctx: TenantContext = {
  userId: 'agent-1',
  tenantId: 'tenant-1',
  role: 'Agent',
  isSuperAdmin: false,
};
const params = {
  project_id: 'project-1',
  unit_id: 'unit-1',
  client_id: 'client-1',
  quote_date: '2026-09-10',
  first_installment_date: '2026-10-01',
  down_payment_percent: 30,
  installments_count: 12,
  reservation_amount: 5_000_000,
};
const extra = {
  concept: 'extra' as const,
  amount: 19_000_000,
  due_date: '2026-12-15',
};

describe('QuotesService: guardar y editar acuerdos', () => {
  let service: QuotesService;
  let stored: Quote;
  let manager: {
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let scope: {
    scoped: jest.Mock;
    assertReference: jest.Mock;
    assertProjectInTenant: jest.Mock;
  };
  let transaction: jest.Mock;
  const unit = { id: 'unit-1', project_id: 'project-1', price: 350_000_000 };

  beforeEach(() => {
    stored = {
      ...params,
      id: 'quote-1',
      code: 'COT-2026-0001',
      status: 'draft',
      payment_plan: 'fixed',
      unit_price: 320_000_000,
      discount: 0,
      valid_until: '2026-09-25',
      notes: '',
      balance_due_date: null,
      unit: { ...unit },
      client: { id: 'client-1', project_id: 'project-1' },
      ...calculateQuote({
        ...params,
        unit_price: 320_000_000,
        extra_installments: [extra],
      }),
    } as unknown as Quote;
    const query = (getOne: () => unknown) => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => getOne()),
      getExists: jest.fn(async () => false),
    });
    scope = {
      scoped: jest.fn((entity) =>
        query(() =>
          entity === Quote
            ? stored
              ? structuredClone(stored)
              : null
            : entity === Unit
              ? { ...unit }
              : { id: 'client-2', project_id: 'project-1' },
        ),
      ),
      assertReference: jest.fn(),
      assertProjectInTenant: jest.fn(),
    };
    manager = {
      create: jest.fn((_entity, data) => ({ ...data })),
      save: jest.fn(async (_entity, data) => {
        stored = { ...data, id: 'quote-1' };
        return stored;
      }),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ count: '0' })),
      })),
    };
    transaction = jest.fn(async (fn) => fn(manager));
    service = new QuotesService(
      {} as Repository<Quote>,
      { transaction } as unknown as DataSource,
      scope as unknown as TenantScopeService,
    );
  });

  it('guarda el mismo plan calculado por la vista previa, incluidos extras y fecha del saldo', async () => {
    const dto = {
      ...params,
      extra_installments: [extra],
      balance_due_date: '2028-01-15',
    };
    const preview = await service.preview(dto, ctx);
    const created = await service.create(dto, ctx);
    expect(created.installments).toEqual(preview.installments);
    expect(created.balance_due_date).toBe('2028-01-15');
    expect(created.payment_plan).toBe('fixed');
    expect(created.agent_id).toBe(ctx.userId);
    expect(scope.assertReference).toHaveBeenCalledWith(Client, params.client_id, ctx);
  });

  it('editar observaciones conserva los abonos y el precio congelado', async () => {
    const installments = stored.installments;
    const updated = await service.update('quote-1', { notes: 'Prima en diciembre' }, ctx);
    expect(updated.unit_price).toBe(320_000_000);
    expect(updated.installments).toEqual(installments);
    expect(updated.notes).toBe('Prima en diciembre');
    expect(manager.delete).toHaveBeenCalledWith(QuoteInstallment, {
      quote_id: 'quote-1',
    });
  });

  it('la vista previa de edición coincide con el guardado aunque suba el precio de lista', async () => {
    const dto = {
      ...params,
      extra_installments: [extra],
      balance_due_date: '2028-01-15',
    };
    const preview = await service.preview({ ...dto, quote_id: stored.id }, ctx);
    const updated = await service.update(stored.id, dto, ctx);
    expect(updated.total_value).toBe(preview.total_value);
    expect(updated.installments).toEqual(preview.installments);
  });

  it('permite quitar los extras y volver a la fecha automática explícitamente', async () => {
    stored.balance_due_date = '2028-01-15';
    const updated = await service.update(
      stored.id,
      { extra_installments: [], balance_due_date: null },
      ctx,
    );
    expect(updated.installments.some((i) => i.concept === 'extra')).toBe(false);
    expect(updated.installment_amount).toBe(7_583_333);
    expect(updated.balance_due_date).toBeNull();
  });

  it('guarda un plan variable y lo conserva en una edición parcial posterior', async () => {
    const custom = [
      { concept: 'cuota' as const, amount: 20_000_000, due_date: '2026-11-01' },
      extra,
      { concept: 'cuota' as const, amount: 52_000_000, due_date: '2027-03-15' },
    ];
    const updated = await service.update(
      stored.id,
      { payment_plan: 'custom', custom_installments: custom },
      ctx,
    );
    expect(updated.payment_plan).toBe('custom');
    expect(
      updated.installments
        .filter((i) => i.concept === 'cuota' || i.concept === 'extra')
        .map(({ number, ...i }) => i),
    ).toEqual(custom);
    expect(
      (await service.update(stored.id, { notes: 'Acuerdo revisado' }, ctx)).installments,
    ).toEqual(updated.installments);
  });

  it('no escribe nada cuando el plan personalizado no cuadra', async () => {
    await expect(
      service.update(stored.id, { payment_plan: 'custom', custom_installments: [] }, ctx),
    ).rejects.toThrow(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('actualiza la referencia del cliente junto con su ID', async () => {
    const updated = await service.update(stored.id, { client_id: 'client-2' }, ctx);
    expect(updated.client_id).toBe('client-2');
    expect(updated.client.id).toBe('client-2');
  });

  it('conserva el cliente y la unidad cuando existen comprobantes', async () => {
    const originalScoped = scope.scoped.getMockImplementation();
    scope.scoped.mockImplementation((entity, ...args) => entity === QuoteReceipt
      ? { andWhere: jest.fn().mockReturnThis(), getExists: jest.fn(async () => true) }
      : originalScoped(entity, ...args));
    await expect(service.update(stored.id, { client_id: 'client-2' }, ctx)).rejects.toThrow(/conservar su cliente y unidad/);
    await expect(service.update(stored.id, { unit_id: 'unit-2' }, ctx)).rejects.toThrow(/conservar su cliente y unidad/);
    await expect(service.remove(stored.id, ctx)).rejects.toThrow(/comprobantes guardados/);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('protege las cotizaciones enviadas', async () => {
    stored.status = 'sent';
    await expect(service.update(stored.id, { extra_installments: [] }, ctx)).rejects.toThrow(
      /borrador/,
    );
    expect(transaction).not.toHaveBeenCalled();
  });

  it('la vista previa con precio guardado requiere una cotización dentro del tenant', async () => {
    stored = null;
    await expect(service.preview({ ...params, quote_id: 'foreign-quote' }, ctx)).rejects.toThrow(
      NotFoundException,
    );
    expect(scope.scoped).toHaveBeenCalledWith(Quote, 'quote', ctx);
  });
});
