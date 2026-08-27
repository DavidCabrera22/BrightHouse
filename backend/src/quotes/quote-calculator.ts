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
export class QuoteCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuoteCalculationError';
  }
}

/**
 * Suma meses a una fecha 'YYYY-MM-DD' recortando al último día del mes.
 *
 * Se opera sobre las partes de la cadena y no sobre `Date` local para que la
 * zona horaria del servidor no corra los vencimientos un día. El recorte a 10
 * caracteres acepta una fecha con hora y hace que un `Date` falle como
 * QuoteCalculationError (un 400) en vez de como TypeError (un 500).
 */
export function addMonthsClamped(isoDate: string, months: number): string {
  const [y, m, d] = String(isoDate ?? '')
    .slice(0, 10)
    .split('-')
    .map(Number);

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

/**
 * Valida y normaliza una fecha de entrada.
 *
 * `addMonthsClamped` recorta al último día del mes, que es lo correcto para el
 * resultado de sumar meses pero no para lo que escribió el usuario: un
 * '2026-02-31' se convertiría en 28 de febrero y arrastraría el recorte al
 * resto del plan. Si la fecha normalizada no es idéntica a la recibida, la
 * fecha no existe y es un 400.
 */
function normalizeDate(isoDate: string): string {
  // Un valor nulo ya salió por `addMonthsClamped`, así que aquí `isoDate`
  // siempre es algo que se puede convertir a cadena.
  const normalized = addMonthsClamped(isoDate, 0);
  if (normalized !== String(isoDate).slice(0, 10)) {
    throw new QuoteCalculationError(`Fecha inválida: ${isoDate}`);
  }
  return normalized;
}

export function calculateQuote(input: QuoteCalculationInput): QuoteCalculation {
  const unitPrice = Number(input.unit_price);
  const discount = Number(input.discount ?? 0);
  const reservationInput = Number(input.reservation_amount ?? 0);
  const percent = Number(input.down_payment_percent);
  const count = Number(input.installments_count);

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    throw new QuoteCalculationError('El precio de la unidad debe ser mayor a cero');
  }
  if (!Number.isFinite(discount) || discount < 0) {
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
  if (!Number.isFinite(reservationInput) || reservationInput < 0) {
    throw new QuoteCalculationError('La separación no puede ser negativa');
  }

  // Todo el dinero se lleva a pesos enteros antes de repartirlo. Las columnas
  // son numeric(15,2) y con centavos la coma flotante rompe la invariante de
  // que las filas suman exactamente el total.
  const totalValue = Math.round(unitPrice - discount);
  if (totalValue <= 0) {
    throw new QuoteCalculationError('El valor total de la cotización debe ser mayor a cero');
  }
  // `down_payment_percent` es numeric(5,2): escalarlo a entero antes de
  // dividir evita que un caso como el 8,7% de 1.671.542.500 caiga un peso
  // por debajo del redondeo exacto.
  const downPaymentValue = Math.round((totalValue * Math.round(percent * 100)) / 10000);
  const balanceValue = totalValue - downPaymentValue;
  const reservation = Math.round(reservationInput);

  if (reservation > downPaymentValue) {
    throw new QuoteCalculationError('La separación no puede superar la cuota inicial');
  }

  // Se validan y normalizan aquí: sin esto una cadena basura llegaría hasta el
  // INSERT en vez de salir como 400, y `quote_date` no pasa por ningún otro
  // control porque se copia tal cual a la fila de separación.
  const quoteDate = normalizeDate(input.quote_date);
  const firstInstallmentDate = normalizeDate(input.first_installment_date);

  const financed = downPaymentValue - reservation;
  const installmentAmount = Math.floor(financed / count);

  const installments: CalculatedInstallment[] = [];
  let number = 1;

  if (reservation > 0) {
    installments.push({
      number: number++,
      concept: 'separacion',
      amount: reservation,
      due_date: quoteDate,
    });
  }

  // Cuando la separación ya cubre la inicial (o no hay inicial) no se emiten
  // doce filas en cero: misma regla que para la separación y el saldo.
  if (financed > 0) {
    for (let i = 0; i < count; i++) {
      // El residuo de la división entera se acumula en la última cuota, nunca
      // en el saldo a crédito: así la suma de las filas cuadra con el total.
      const isLast = i === count - 1;
      installments.push({
        number: number++,
        concept: 'cuota',
        amount: isLast ? financed - installmentAmount * (count - 1) : installmentAmount,
        due_date: addMonthsClamped(firstInstallmentDate, i),
      });
    }
  }

  if (balanceValue > 0) {
    installments.push({
      number: number++,
      concept: 'saldo',
      amount: balanceValue,
      due_date: addMonthsClamped(firstInstallmentDate, count),
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
