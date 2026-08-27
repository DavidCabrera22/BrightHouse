import { addMonthsClamped, calculateQuote, QuoteCalculationError } from './quote-calculator';

const base = {
  unit_price: 320_000_000,
  discount: 0,
  reservation_amount: 5_000_000,
  down_payment_percent: 30,
  installments_count: 12,
  quote_date: '2026-08-26',
  first_installment_date: '2026-09-01',
};

describe('calculateQuote', () => {
  it('parte el valor en separación, cuota inicial y saldo a crédito', () => {
    const result = calculateQuote(base);

    expect(result.total_value).toBe(320_000_000);
    expect(result.down_payment_value).toBe(96_000_000);
    expect(result.balance_value).toBe(224_000_000);
    // (96.000.000 - 5.000.000 de separación) / 12
    expect(result.installment_amount).toBe(7_583_333);
  });

  it('emite separación, N cuotas y saldo, numeradas en orden', () => {
    const { installments } = calculateQuote(base);

    expect(installments).toHaveLength(14);
    expect(installments[0]).toEqual({
      number: 1,
      concept: 'separacion',
      amount: 5_000_000,
      due_date: '2026-08-26',
    });
    expect(installments[1].concept).toBe('cuota');
    expect(installments[1].due_date).toBe('2026-09-01');
    expect(installments[12].due_date).toBe('2027-08-01');
    expect(installments[13]).toEqual({
      number: 14,
      concept: 'saldo',
      amount: 224_000_000,
      due_date: '2027-09-01',
    });
  });

  it('la suma de las filas es exactamente el total, con o sin residuo', () => {
    const casos = [
      base,
      { ...base, installments_count: 7, reservation_amount: 0 },
      { ...base, unit_price: 187_654_321, discount: 1_234_567, down_payment_percent: 33.33 },
      { ...base, down_payment_percent: 100, installments_count: 3 },
    ];

    for (const caso of casos) {
      const { installments, total_value } = calculateQuote(caso);
      const suma = installments.reduce((acc, i) => acc + i.amount, 0);
      expect(suma).toBe(total_value);
    }
  });

  it('absorbe el residuo en la última cuota, no en el saldo', () => {
    const { installments, balance_value } = calculateQuote({
      ...base,
      unit_price: 100_000_000,
      reservation_amount: 0,
      installments_count: 7,
    });

    const cuotas = installments.filter((i) => i.concept === 'cuota');
    const saldo = installments.find((i) => i.concept === 'saldo');

    expect(cuotas.slice(0, 6).map((c) => c.amount)).toEqual(Array(6).fill(4_285_714));
    expect(cuotas[6].amount).toBe(4_285_716);
    expect(saldo.amount).toBe(balance_value);
  });

  it('omite la fila de separación cuando es cero', () => {
    const { installments } = calculateQuote({ ...base, reservation_amount: 0 });

    expect(installments.some((i) => i.concept === 'separacion')).toBe(false);
    expect(installments[0]).toMatchObject({ number: 1, concept: 'cuota' });
  });

  it('rechaza parámetros imposibles', () => {
    expect(() => calculateQuote({ ...base, discount: 400_000_000 })).toThrow(QuoteCalculationError);
    expect(() => calculateQuote({ ...base, reservation_amount: 200_000_000 })).toThrow(
      /separación no puede superar/i,
    );
    expect(() => calculateQuote({ ...base, installments_count: 0 })).toThrow(/al menos 1/i);
    expect(() => calculateQuote({ ...base, down_payment_percent: 101 })).toThrow(/entre 0 y 100/i);
    expect(() => calculateQuote({ ...base, unit_price: 0 })).toThrow(/mayor a cero/i);
  });
});

describe('addMonthsClamped', () => {
  it('mantiene el día del mes cuando existe', () => {
    expect(addMonthsClamped('2026-09-15', 3)).toBe('2026-12-15');
  });

  it('recorta al último día del mes en vez de desbordarse', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonthsClamped('2026-08-31', 1)).toBe('2026-09-30');
  });

  it('cruza el año', () => {
    expect(addMonthsClamped('2026-11-10', 4)).toBe('2027-03-10');
  });
});
