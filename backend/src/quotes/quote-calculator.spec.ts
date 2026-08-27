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
    expect(() => calculateQuote({ ...base, discount: -1 })).toThrow(/no puede ser negativo/i);
    expect(() => calculateQuote({ ...base, reservation_amount: -1 })).toThrow(
      /separación no puede ser negativa/i,
    );
    expect(() => calculateQuote({ ...base, installments_count: 2.5 })).toThrow(/al menos 1/i);
  });

  it('rechaza valores no numéricos en vez de producir un cronograma de NaN', () => {
    expect(() => calculateQuote({ ...base, discount: 'abc' as any })).toThrow(
      QuoteCalculationError,
    );
    expect(() => calculateQuote({ ...base, reservation_amount: NaN })).toThrow(
      QuoteCalculationError,
    );
  });

  it('valida la fecha de la cotización antes de copiarla al cronograma', () => {
    expect(() => calculateQuote({ ...base, quote_date: 'no-es-fecha' })).toThrow(/fecha inválida/i);
    expect(() => calculateQuote({ ...base, first_installment_date: '' })).toThrow(
      /fecha inválida/i,
    );
  });

  it('el recorte de fin de mes no se pega: cada cuota parte de la fecha original', () => {
    const { installments } = calculateQuote({
      ...base,
      reservation_amount: 0,
      first_installment_date: '2026-01-31',
      installments_count: 4,
    });

    expect(installments.filter((i) => i.concept === 'cuota').map((i) => i.due_date)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('lleva los centavos a pesos enteros y mantiene la invariante', () => {
    const { installments, total_value } = calculateQuote({
      ...base,
      unit_price: 8_293_829.23,
      discount: 58_748.6,
      reservation_amount: 206_052.36,
      down_payment_percent: 82.53,
      installments_count: 28,
    });

    for (const cuota of installments) {
      expect(Number.isInteger(cuota.amount)).toBe(true);
    }
    expect(installments.reduce((acc, i) => acc + i.amount, 0)).toBe(total_value);
  });

  it('redondea el porcentaje sin caer un peso por debajo', () => {
    const { down_payment_value } = calculateQuote({
      ...base,
      unit_price: 1_671_542_500,
      down_payment_percent: 8.7,
      reservation_amount: 0,
    });

    expect(down_payment_value).toBe(145_424_198);
  });

  it('omite el saldo cuando la inicial es el 100%', () => {
    const { installments, balance_value } = calculateQuote({
      ...base,
      down_payment_percent: 100,
      installments_count: 3,
    });

    expect(balance_value).toBe(0);
    expect(installments.some((i) => i.concept === 'saldo')).toBe(false);
  });

  it('no emite cuotas en cero cuando la separación ya cubre la inicial', () => {
    const { installments } = calculateQuote({
      ...base,
      down_payment_percent: 30,
      reservation_amount: 96_000_000,
    });

    expect(installments.some((i) => i.concept === 'cuota')).toBe(false);
    expect(installments.map((i) => i.concept)).toEqual(['separacion', 'saldo']);
  });

  it('maneja una sola cuota', () => {
    const { installments } = calculateQuote({ ...base, installments_count: 1 });
    const cuotas = installments.filter((i) => i.concept === 'cuota');

    expect(cuotas).toHaveLength(1);
    expect(cuotas[0].amount).toBe(91_000_000);
  });

  it('rechaza un descuento que deja el total en cero', () => {
    expect(() => calculateQuote({ ...base, discount: 320_000_000 })).toThrow(
      /valor total.*mayor a cero/i,
    );
  });

  it('rechaza un día que no existe en su mes en vez de recortarlo en silencio', () => {
    expect(() => calculateQuote({ ...base, first_installment_date: '2026-02-31' })).toThrow(
      /fecha inválida/i,
    );
    expect(() => calculateQuote({ ...base, quote_date: '2026-04-31' })).toThrow(/fecha inválida/i);
  });

  it('acepta una fecha de cotización con hora, normalizándola al día', () => {
    const { installments } = calculateQuote({ ...base, quote_date: '2026-08-26T00:00:00Z' });

    expect(installments[0].due_date).toBe('2026-08-26');
  });

  it('trata descuento y separación como cero cuando se omiten', () => {
    const { down_payment_value, installments } = calculateQuote({
      unit_price: 320_000_000,
      down_payment_percent: 30,
      installments_count: 12,
      quote_date: '2026-08-26',
      first_installment_date: '2026-09-01',
    });

    expect(down_payment_value).toBe(96_000_000);
    expect(installments.some((i) => i.concept === 'separacion')).toBe(false);
    expect(installments.filter((i) => i.concept === 'cuota')).toHaveLength(12);
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

  it('falla como QuoteCalculationError, no como TypeError, ante algo que no es fecha', () => {
    expect(() => addMonthsClamped(new Date() as any, 1)).toThrow(QuoteCalculationError);
    expect(() => addMonthsClamped(null as any, 1)).toThrow(QuoteCalculationError);
  });

  it('acepta una fecha con hora', () => {
    expect(addMonthsClamped('2026-09-15T00:00:00Z', 1)).toBe('2026-10-15');
  });
});
