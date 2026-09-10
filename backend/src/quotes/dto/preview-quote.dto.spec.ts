import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuotePreviewRequestDto } from './preview-quote.dto';

const base = {
  unit_id: '8f17baf4-357b-4b2d-8a2c-075bd5e7c141',
  down_payment_percent: 30,
  installments_count: 12,
  first_installment_date: '2026-10-01',
};

describe('validación de pagos pactados', () => {
  it('acepta planes existentes y los nuevos campos opcionales', async () => {
    expect(await validate(plainToInstance(QuotePreviewRequestDto, base))).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(QuotePreviewRequestDto, {
          ...base,
          payment_plan: 'custom',
          balance_due_date: null,
          custom_installments: [{ concept: 'extra', amount: 10_000_000, due_date: '2026-12-15' }],
        }),
      ),
    ).toHaveLength(0);
  });

  it.each([
    { concept: 'saldo', amount: 100, due_date: '2026-12-15' },
    { concept: 'extra', amount: 0, due_date: '2026-12-15' },
    { concept: 'extra', amount: 100.5, due_date: '2026-12-15' },
    { concept: 'extra', amount: '100', due_date: '2026-12-15' },
    { concept: 'extra', amount: 100, due_date: '2026-02-31' },
    null,
  ])('valida cada pago anidado: %j', async (payment) => {
    const errors = await validate(
      plainToInstance(QuotePreviewRequestDto, {
        ...base,
        extra_installments: [payment],
      }),
    );
    expect(errors.some((e) => e.property === 'extra_installments')).toBe(true);
  });
});
