/**
 * Matemática de una cotización, sin NestJS ni base de datos.
 *
 * Vive aparte del servicio para que el endpoint de vista previa y el de
 * guardado usen exactamente el mismo cálculo, y para poder probar el
 * cronograma sin levantar un módulo.
 */

export type InstallmentConcept = 'separacion' | 'cuota' | 'saldo';

export interface QuoteCalculationInput {
  unit_price: number;
  discount?: number;
  reservation_amount?: number;
  down_payment_percent: number;
  installments_count: number;
  /** 'YYYY-MM-DD'. Vencimiento de la separación. */
  quote_date: string;
  /** 'YYYY-MM-DD'. Vencimiento de la primera cuota. */
  first_installment_date: string;
}

export interface CalculatedInstallment {
  number: number;
  concept: InstallmentConcept;
  amount: number;
  /** 'YYYY-MM-DD' */
  due_date: string;
}

export interface QuoteCalculation {
  total_value: number;
  down_payment_value: number;
  balance_value: number;
  installment_amount: number;
  installments: CalculatedInstallment[];
}

/** El servicio la traduce a BadRequestException; el motor no conoce HTTP. */
export class QuoteCalculationError extends Error {}

/**
 * Suma meses a una fecha 'YYYY-MM-DD' recortando al último día del mes.
 *
 * Se opera sobre las partes de la cadena y no sobre `Date` local para que la
 * zona horaria del servidor no corra los vencimientos un día.
 */
export function addMonthsClamped(isoDate: string, months: number): string {
  const [y, m, d] = (isoDate || '').split('-').map(Number);
  if (!y || !m || !d) {
    throw new QuoteCalculationError(`Fecha inválida: ${isoDate}`);
  }

  const monthIndex = m - 1 + months;
  const year = y + Math.floor(monthIndex / 12);
  const month = ((monthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);

  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function calculateQuote(input: QuoteCalculationInput): QuoteCalculation {
  const unitPrice = Number(input.unit_price);
  const discount = Number(input.discount ?? 0);
  const reservation = Number(input.reservation_amount ?? 0);
  const percent = Number(input.down_payment_percent);
  const count = Number(input.installments_count);

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new QuoteCalculationError('El precio de la unidad debe ser mayor a cero');
  }
  if (discount < 0) {
    throw new QuoteCalculationError('El descuento no puede ser negativo');
  }
  if (discount > unitPrice) {
    throw new QuoteCalculationError('El descuento no puede superar el precio de la unidad');
  }
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new QuoteCalculationError('El porcentaje de cuota inicial debe estar entre 0 y 100');
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new QuoteCalculationError('El número de cuotas debe ser al menos 1');
  }
  if (reservation < 0) {
    throw new QuoteCalculationError('La separación no puede ser negativa');
  }

  const totalValue = Math.round(unitPrice - discount);
  const downPaymentValue = Math.round((totalValue * percent) / 100);
  const balanceValue = totalValue - downPaymentValue;

  if (reservation > downPaymentValue) {
    throw new QuoteCalculationError('La separación no puede superar la cuota inicial');
  }

  const financed = downPaymentValue - reservation;
  const installmentAmount = Math.floor(financed / count);

  const installments: CalculatedInstallment[] = [];
  let number = 1;

  if (reservation > 0) {
    installments.push({
      number: number++,
      concept: 'separacion',
      amount: reservation,
      due_date: input.quote_date,
    });
  }

  for (let i = 0; i < count; i++) {
    // El residuo de la división entera se acumula en la última cuota, nunca en
    // el saldo a crédito: así la suma de las filas cuadra con el total exacto.
    const isLast = i === count - 1;
    installments.push({
      number: number++,
      concept: 'cuota',
      amount: isLast ? financed - installmentAmount * (count - 1) : installmentAmount,
      due_date: addMonthsClamped(input.first_installment_date, i),
    });
  }

  if (balanceValue > 0) {
    installments.push({
      number: number++,
      concept: 'saldo',
      amount: balanceValue,
      due_date: addMonthsClamped(input.first_installment_date, count),
    });
  }

  return {
    total_value: totalValue,
    down_payment_value: downPaymentValue,
    balance_value: balanceValue,
    installment_amount: installmentAmount,
    installments,
  };
}
