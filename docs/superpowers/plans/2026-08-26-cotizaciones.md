# Cotizaciones — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un agente pueda cotizar una unidad a un cliente dentro de un proyecto —separación, cuota inicial en N cuotas mensuales y saldo a crédito—, que la cotización quede guardada con su cronograma y su estado, y que se pueda descargar en PDF.

**Architecture:** Módulo NestJS `quotes` con dos entidades (`quotes` y `quote_installments`, cronograma fila por fila) aisladas por tenant a través de `project_id`. La matemática vive en una función pura (`quote-calculator.ts`) que usan tanto el guardado como el endpoint de vista previa, así el frontend no la duplica. En React, una pestaña nueva dentro del proyecto con una lista y dos modales.

**Tech Stack:** NestJS 10, TypeORM 0.3 (PostgreSQL/Supabase), Jest 29, pdfkit, React 19 + Vite 7, Tailwind v4, react-router-dom 7.

**Spec:** `docs/superpowers/specs/2026-08-26-cotizaciones-design.md`

**Rama:** `feat/cotizaciones` (ya creada; el spec está comiteado ahí).

---

## Estructura de archivos

**Backend — crear:**

| Archivo | Responsabilidad |
|---|---|
| `backend/src/quotes/quote-calculator.ts` | Función pura: de los parámetros al cronograma. Sin NestJS ni base de datos. |
| `backend/src/quotes/quote-calculator.spec.ts` | Pruebas del motor de cálculo. |
| `backend/src/quotes/quote-status.ts` | Estados válidos, transiciones y cálculo de vencimiento. Funciones puras. |
| `backend/src/quotes/quote-status.spec.ts` | Pruebas de transiciones y vencimiento. |
| `backend/src/quotes/entities/decimal-transformer.ts` | Convierte los `numeric` que `pg` devuelve como cadena. En su propio archivo: las dos entidades se importan mutuamente y un valor suelto no sobrevive al ciclo. |
| `backend/src/quotes/entities/quote.entity.ts` | Entidad `quotes`. |
| `backend/src/quotes/entities/quote-installment.entity.ts` | Entidad `quote_installments`. |
| `backend/src/quotes/dto/preview-quote.dto.ts` | Parámetros del cálculo (base de create). |
| `backend/src/quotes/dto/create-quote.dto.ts` | Extiende el anterior con cliente, proyecto, vigencia y notas. |
| `backend/src/quotes/dto/update-quote.dto.ts` | `PartialType` del create. |
| `backend/src/quotes/dto/update-quote-status.dto.ts` | Solo el estado destino. |
| `backend/src/quotes/quotes.service.ts` | Persistencia, aislamiento por tenant, consecutivo. |
| `backend/src/quotes/quote-pdf.service.ts` | Arma el PDF con pdfkit. |
| `backend/src/quotes/quotes.controller.ts` | Endpoints. |
| `backend/src/quotes/quotes.module.ts` | Módulo. |

**Backend — modificar:**

| Archivo | Cambio |
|---|---|
| `backend/src/common/tenant/tenant-paths.ts` | Registrar `Quote` y `QuoteInstallment`. |
| `backend/src/common/tenant/tenant-scope.spec.ts` | Agregarlas a `TENANT_OWNED`. |
| `backend/src/app.module.ts` | Importar `QuotesModule`. |
| `backend/src/clients/clients.controller.ts` | `GET /api/clients?project_id=`. |
| `backend/src/clients/clients.service.ts` | Filtro opcional por proyecto. |
| `backend/package.json` | Dependencias `pdfkit` y `@types/pdfkit`. |

**Frontend — crear:**

| Archivo | Responsabilidad |
|---|---|
| `frontend/src/components/ProjectTabs.tsx` | Barra de pestañas del proyecto, hoy duplicada. |
| `frontend/src/components/quoteTypes.ts` | Tipos compartidos y `formatCOP`. |
| `frontend/src/components/ProjectQuotesPage.tsx` | Lista de cotizaciones del proyecto. |
| `frontend/src/components/QuoteFormModal.tsx` | Formulario con cronograma en vivo. |
| `frontend/src/components/QuoteDetailModal.tsx` | Detalle, cambios de estado y descarga del PDF. |

**Frontend — modificar:** `App.tsx` (ruta), `ProjectDashboardPage.tsx` y `ProjectAnalyticsPage.tsx` (usar `ProjectTabs`).

**Desvío respecto al spec, en pruebas:** el spec pedía un `quotes.service.spec.ts` para tres casos (lectura de otro tenant, edición de una `sent`, transición inválida). Los dos últimos se prueban mejor en `quote-status.spec.ts`, porque la lógica vive en funciones puras; probarlas a través del servicio obligaría a simular query builders de TypeORM y la prueba terminaría verificando el simulacro. El primero —el aislamiento— tampoco se demuestra con mocks: queda cubierto por el registro obligatorio en `tenant-scope.spec.ts` (que falla si la entidad no declara su camino al tenant) y por la comprobación con un token de otro tenant en la Task 13, contra el servidor real.

**Nota sobre pruebas de frontend:** el proyecto no tiene runner de tests de React (no hay vitest ni testing-library) y montar uno está fuera de este alcance. Las tareas de frontend se verifican con `npm run build` (que corre `tsc -b`) y una comprobación manual en el navegador, descrita en cada tarea.

---

> **Tareas 1 y 2: ya ejecutadas, y el código de abajo quedó corto.** La revisión
> de calidad encontró cinco defectos reales que este plan no anticipó: `discount`
> y `reservation_amount` sin guarda de finitud (un `NaN` producía un cronograma
> entero de `NaN`), `quote_date` sin validar, `isExpired` en UTC (una cotización
> vigente se veía "Vencida" entre las 7pm y medianoche en Bogotá),
> `reservation_amount` sin redondear al peso (rompía la invariante de la suma el
> 0,85% de las veces con centavos) y el porcentaje cayendo un peso por debajo en
> casos como el 8,7%. Todo está corregido en `2d62b78`. **La fuente de verdad
> del motor son los archivos en `backend/src/quotes/`, no los bloques de código
> de estas dos tareas**, que se conservan como registro de lo planeado. El spec
> sí está actualizado. Las tareas 3 en adelante no cambian: las firmas de
> `calculateQuote`, `assertTransition`, `isEditable` e `isExpired` son las mismas
> (`isExpired` solo acepta además un `Date` en `validUntil`).

## Task 1: Motor de cálculo

**Files:**
- Create: `backend/src/quotes/quote-calculator.ts`
- Test: `backend/src/quotes/quote-calculator.spec.ts`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `backend/src/quotes/quote-calculator.spec.ts`:

```ts
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
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

```bash
cd backend && npm test -- quotes/quote-calculator
```

Esperado: FAIL — `Cannot find module './quote-calculator'`.

- [ ] **Step 3: Implementar el motor**

Crear `backend/src/quotes/quote-calculator.ts`:

```ts
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
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

```bash
cd backend && npm test -- quotes/quote-calculator
```

Esperado: PASS, 9 pruebas.

- [ ] **Step 5: Commit**

```bash
git add backend/src/quotes/quote-calculator.ts backend/src/quotes/quote-calculator.spec.ts
git commit -m "feat(quotes): motor de cálculo del plan de pagos"
```

---

## Task 2: Estados y vigencia

**Files:**
- Create: `backend/src/quotes/quote-status.ts`
- Test: `backend/src/quotes/quote-status.spec.ts`

- [ ] **Step 1: Escribir la prueba que falla**

Crear `backend/src/quotes/quote-status.spec.ts`:

```ts
import { BadRequestException } from '@nestjs/common';
import { assertTransition, isExpired, isEditable } from './quote-status';

describe('assertTransition', () => {
  it('permite el camino normal', () => {
    expect(() => assertTransition('draft', 'sent')).not.toThrow();
    expect(() => assertTransition('sent', 'accepted')).not.toThrow();
    expect(() => assertTransition('sent', 'rejected')).not.toThrow();
  });

  it('rechaza saltarse el envío', () => {
    expect(() => assertTransition('draft', 'accepted')).toThrow(BadRequestException);
  });

  it('rechaza revivir una cotización cerrada', () => {
    expect(() => assertTransition('accepted', 'sent')).toThrow(BadRequestException);
    expect(() => assertTransition('rejected', 'draft')).toThrow(BadRequestException);
  });

  it('rechaza un estado inexistente', () => {
    expect(() => assertTransition('draft', 'pagada' as any)).toThrow(BadRequestException);
  });
});

describe('isExpired', () => {
  it('vence solo las enviadas con fecha pasada', () => {
    expect(isExpired('sent', '2026-08-25', '2026-08-26')).toBe(true);
    expect(isExpired('sent', '2026-08-26', '2026-08-26')).toBe(false);
    expect(isExpired('sent', '2026-09-10', '2026-08-26')).toBe(false);
  });

  it('no vence borradores ni cotizaciones ya cerradas', () => {
    expect(isExpired('draft', '2026-01-01', '2026-08-26')).toBe(false);
    expect(isExpired('accepted', '2026-01-01', '2026-08-26')).toBe(false);
    expect(isExpired('rejected', '2026-01-01', '2026-08-26')).toBe(false);
  });

  it('no vence cuando no hay fecha de vigencia', () => {
    expect(isExpired('sent', null, '2026-08-26')).toBe(false);
  });
});

describe('isEditable', () => {
  it('solo el borrador se edita', () => {
    expect(isEditable('draft')).toBe(true);
    expect(isEditable('sent')).toBe(false);
    expect(isEditable('accepted')).toBe(false);
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

```bash
cd backend && npm test -- quotes/quote-status
```

Esperado: FAIL — `Cannot find module './quote-status'`.

- [ ] **Step 3: Implementar**

Crear `backend/src/quotes/quote-status.ts`:

```ts
import { BadRequestException } from '@nestjs/common';

export const QUOTE_STATUSES = ['draft', 'sent', 'accepted', 'rejected'] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Una cotización enviada ya está en manos del cliente: se cierra, no se reabre. */
const ALLOWED_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

export function assertTransition(from: QuoteStatus, to: QuoteStatus): void {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new BadRequestException(
      `No se puede pasar una cotización de "${from}" a "${to}"` +
        (allowed.length ? `. Transiciones válidas: ${allowed.join(', ')}` : '. Ya está cerrada'),
    );
  }
}

/** Solo el borrador admite cambios de montos. */
export function isEditable(status: QuoteStatus): boolean {
  return status === 'draft';
}

/**
 * El vencimiento se deriva de la fecha, no se almacena: una fecha pasada ya es
 * toda la información necesaria y así no hace falta un cron que venza filas.
 *
 * Las fechas son 'YYYY-MM-DD', que se comparan bien como cadenas.
 */
export function isExpired(
  status: QuoteStatus,
  validUntil: string | null | undefined,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  if (status !== 'sent' || !validUntil) return false;
  return String(validUntil).slice(0, 10) < today;
}
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

```bash
cd backend && npm test -- quotes/quote-status
```

Esperado: PASS, 8 pruebas.

- [ ] **Step 5: Commit**

```bash
git add backend/src/quotes/quote-status.ts backend/src/quotes/quote-status.spec.ts
git commit -m "feat(quotes): estados, transiciones y vigencia"
```

---

> **Tarea 3: ya ejecutada, con una corrección.** El bloque de abajo pone
> `decimalTransformer` dentro de `quote.entity.ts` y lo importa desde
> `quote-installment.entity.ts`. Eso es un ciclo, y el transformer queda
> `undefined` según cuál de los dos archivos se cargue primero — verificado
> empíricamente: los montos vuelven como cadena. Vive ahora en
> `entities/decimal-transformer.ts` y las dos entidades lo importan de ahí. Las
> relaciones sí sobreviven al ciclo porque TypeORM las difiere en una función
> flecha; un valor suelto no.

## Task 3: Entidades y registro de tenant

**Files:**
- Create: `backend/src/quotes/entities/quote.entity.ts`, `backend/src/quotes/entities/quote-installment.entity.ts`
- Modify: `backend/src/common/tenant/tenant-paths.ts`, `backend/src/common/tenant/tenant-scope.spec.ts`

- [ ] **Step 1: Escribir la prueba que falla**

En `backend/src/common/tenant/tenant-scope.spec.ts`, agregar los imports junto a los demás (orden alfabético, después de `Project`):

```ts
import { Quote } from '../../quotes/entities/quote.entity';
import { QuoteInstallment } from '../../quotes/entities/quote-installment.entity';
```

Y agregar estas dos filas al final del arreglo `TENANT_OWNED`, después de `[Commission, 'projects']`:

```ts
  [Quote, 'projects'],
  [QuoteInstallment, 'projects'],
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

```bash
cd backend && npm test -- tenant-scope
```

Esperado: FAIL — `Cannot find module '../../quotes/entities/quote.entity'`.

- [ ] **Step 3: Crear las entidades**

Crear `backend/src/quotes/entities/quote.entity.ts`:

```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { Unit } from '../../units/entities/unit.entity';
import { Client } from '../../clients/entities/client.entity';
import { User } from '../../users/entities/user.entity';
import { QuoteInstallment } from './quote-installment.entity';

/**
 * `pg` devuelve los `numeric` como cadena. Sin esto, `total_value` llegaría
 * como "320000000.00" y cualquier suma en el servicio o en el PDF concatenaría
 * en vez de sumar.
 */
export const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : parseFloat(value)),
};

@Entity('quotes')
// El consecutivo es por proyecto y por año; el índice es lo que arbitra dos
// agentes guardando en el mismo instante.
@Index(['project_id', 'code'], { unique: true })
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @Column()
  project_id: string;

  @ManyToOne(() => Unit)
  @JoinColumn({ name: 'unit_id' })
  unit: Unit;

  @Column()
  unit_id: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column()
  client_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'agent_id' })
  agent: User;

  @Column()
  agent_id: string;

  @Column()
  code: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'date' })
  quote_date: string;

  @Column({ type: 'date' })
  valid_until: string;

  /** Precio de la unidad el día de la cotización, congelado a propósito. */
  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  unit_price: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, transformer: decimalTransformer })
  discount: number;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  total_value: number;

  @Column('decimal', { precision: 15, scale: 2, default: 0, transformer: decimalTransformer })
  reservation_amount: number;

  @Column('decimal', { precision: 5, scale: 2, transformer: decimalTransformer })
  down_payment_percent: number;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  down_payment_value: number;

  @Column('int')
  installments_count: number;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  installment_amount: number;

  @Column({ type: 'date' })
  first_installment_date: string;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  balance_value: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => QuoteInstallment, (installment) => installment.quote, { cascade: ['insert'] })
  installments: QuoteInstallment[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

Crear `backend/src/quotes/entities/quote-installment.entity.ts`:

```ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Quote, decimalTransformer } from './quote.entity';

/**
 * Una fila por pago del cronograma. Se guardan en vez de recalcularse para que
 * la cotización siga diciendo lo mismo aunque cambie el precio de la unidad.
 */
@Entity('quote_installments')
export class QuoteInstallment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Quote, (quote) => quote.installments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column()
  quote_id: string;

  @Column('int')
  number: number;

  /** 'separacion' | 'cuota' | 'saldo' */
  @Column()
  concept: string;

  @Column('decimal', { precision: 15, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'date' })
  due_date: string;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 4: Registrar el camino al tenant**

En `backend/src/common/tenant/tenant-paths.ts`, agregar los imports:

```ts
import { Quote } from '../../quotes/entities/quote.entity';
import { QuoteInstallment } from '../../quotes/entities/quote-installment.entity';
```

Y dentro de `TENANT_PATHS`, después de `[Commission, ['sale', 'unit', 'project']],`:

```ts
  [Quote, ['project']],
  [QuoteInstallment, ['quote', 'project']],
```

- [ ] **Step 5: Correr la prueba y verificar que pasa**

```bash
cd backend && npm test -- tenant-scope
```

Esperado: PASS. Verificar en la salida que las dos entidades nuevas aparecen en los casos parametrizados y que `registers every entity that is not explicitly global` sigue en verde.

- [ ] **Step 6: Commit**

```bash
git add backend/src/quotes/entities backend/src/common/tenant/tenant-paths.ts backend/src/common/tenant/tenant-scope.spec.ts
git commit -m "feat(quotes): entidades quotes y quote_installments con aislamiento por tenant"
```

---

## Task 4: DTOs

**Files:**
- Create: `backend/src/quotes/dto/preview-quote.dto.ts`, `create-quote.dto.ts`, `update-quote.dto.ts`, `update-quote-status.dto.ts`

No hay prueba unitaria propia: los DTOs los ejercita el `ValidationPipe` global y se verifican en la Task 6 con peticiones reales.

- [ ] **Step 1: Crear `preview-quote.dto.ts`**

```ts
import { IsDateString, IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Parámetros del cálculo. El precio de la unidad NO se recibe del cliente: se
 * lee de la unidad en el servidor, para que nadie cotice a un precio inventado.
 */
export class PreviewQuoteDto {
  @ApiProperty()
  @IsUUID()
  unit_id: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  reservation_amount?: number;

  // La columna es numeric(5,2) y el motor escala el porcentaje a dos decimales
  // antes de calcular: aceptar más decimales guardaría un valor distinto del
  // que se usó para armar el cronograma.
  @ApiProperty({ example: 30 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  down_payment_percent: number;

  @ApiProperty({ example: 12 })
  @IsInt()
  @Min(1)
  installments_count: number;

  @ApiProperty({ example: '2026-09-01' })
  @IsDateString()
  first_installment_date: string;

  @ApiPropertyOptional({ description: 'Por defecto, hoy' })
  @IsOptional()
  @IsDateString()
  quote_date?: string;
}
```

- [ ] **Step 2: Crear `create-quote.dto.ts`**

```ts
import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PreviewQuoteDto } from './preview-quote.dto';

export class CreateQuoteDto extends PreviewQuoteDto {
  @ApiProperty()
  @IsUUID()
  project_id: string;

  @ApiProperty()
  @IsUUID()
  client_id: string;

  @ApiPropertyOptional({ default: 15, description: 'Días de vigencia desde la fecha de cotización' })
  @IsOptional()
  @IsInt()
  @Min(1)
  valid_days?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
```

- [ ] **Step 3: Crear `update-quote.dto.ts`**

```ts
import { PartialType } from '@nestjs/swagger';
import { CreateQuoteDto } from './create-quote.dto';

export class UpdateQuoteDto extends PartialType(CreateQuoteDto) {}
```

- [ ] **Step 4: Crear `update-quote-status.dto.ts`**

```ts
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuoteStatus } from '../quote-status';

export class UpdateQuoteStatusDto {
  @ApiProperty({ enum: ['sent', 'accepted', 'rejected'] })
  @IsIn(['sent', 'accepted', 'rejected'])
  status: QuoteStatus;
}
```

- [ ] **Step 5: Compilar y commitear**

```bash
cd backend && npx tsc --noEmit -p tsconfig.json
```

Esperado: sin errores (los archivos aún no se importan desde ningún módulo; esto solo confirma que la sintaxis y los tipos cierran).

```bash
git add backend/src/quotes/dto
git commit -m "feat(quotes): DTOs de cotización"
```

---

## Task 5: Servicio

**Files:**
- Create: `backend/src/quotes/quotes.service.ts`

- [ ] **Step 1: Escribir el servicio**

Crear `backend/src/quotes/quotes.service.ts`:

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Quote } from './entities/quote.entity';
import { QuoteInstallment } from './entities/quote-installment.entity';
import { Unit } from '../units/entities/unit.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PreviewQuoteDto } from './dto/preview-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { TenantContext, TenantScopeService } from '../common/tenant';
import { calculateQuote, QuoteCalculation, QuoteCalculationError } from './quote-calculator';
import { assertTransition, businessToday, isEditable, isExpired, QuoteStatus } from './quote-status';

const DEFAULT_VALID_DAYS = 15;
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private readonly quoteRepository: Repository<Quote>,
    private readonly dataSource: DataSource,
    private readonly tenantScope: TenantScopeService,
  ) {}

  /** Vista previa: calcula sin escribir nada. */
  async preview(dto: PreviewQuoteDto, ctx: TenantContext): Promise<QuoteCalculation> {
    const unit = await this.loadUnit(dto.unit_id, ctx);
    return this.calculate(dto, unit.price);
  }

  async create(dto: CreateQuoteDto, ctx: TenantContext) {
    await this.tenantScope.assertProjectInTenant(dto.project_id, ctx);
    await this.tenantScope.assertReference(Unit, dto.unit_id, ctx);
    await this.tenantScope.assertReference(Client, dto.client_id, ctx);

    const unit = await this.loadUnit(dto.unit_id, ctx);
    const client = await this.loadClient(dto.client_id, ctx);

    // Aislamiento entre proyectos del mismo tenant: la unidad y el cliente
    // tienen que ser del proyecto que se está cotizando.
    if (unit.project_id !== dto.project_id) {
      throw new BadRequestException('La unidad no pertenece al proyecto indicado');
    }
    if (client.project_id !== dto.project_id) {
      throw new BadRequestException('El cliente no pertenece al proyecto indicado');
    }

    const quoteDate = dto.quote_date ?? businessToday();
    const calculation = this.calculate({ ...dto, quote_date: quoteDate }, unit.price);

    const saved = await this.saveWithCode(dto.project_id, quoteDate, (code, manager) => {
      const quote = manager.create(Quote, {
        project_id: dto.project_id,
        unit_id: dto.unit_id,
        client_id: dto.client_id,
        agent_id: ctx.userId,
        code,
        status: 'draft',
        quote_date: quoteDate,
        valid_until: addDays(quoteDate, dto.valid_days ?? DEFAULT_VALID_DAYS),
        unit_price: unit.price,
        discount: dto.discount ?? 0,
        total_value: calculation.total_value,
        reservation_amount: dto.reservation_amount ?? 0,
        down_payment_percent: dto.down_payment_percent,
        down_payment_value: calculation.down_payment_value,
        installments_count: dto.installments_count,
        installment_amount: calculation.installment_amount,
        first_installment_date: dto.first_installment_date,
        balance_value: calculation.balance_value,
        notes: dto.notes ?? null,
        installments: calculation.installments.map((i) => manager.create(QuoteInstallment, i)),
      });
      return manager.save(Quote, quote);
    });

    return this.findOne(saved.id, ctx);
  }

  async findAll(ctx: TenantContext, projectId?: string, status?: string) {
    const qb = this.tenantScope
      .scoped(Quote, 'quote', ctx)
      .leftJoinAndSelect('quote.unit', 'unit')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.agent', 'agent')
      .orderBy('quote.created_at', 'DESC');

    if (projectId) {
      qb.andWhere('quote.project_id = :projectId', { projectId });
    }
    if (status) {
      qb.andWhere('quote.status = :status', { status });
    }

    const quotes = await qb.getMany();
    return quotes.map((quote) => this.decorate(quote));
  }

  async findOne(id: string, ctx: TenantContext) {
    const quote = await this.scopedOne(id, ctx);
    return this.decorate(quote);
  }

  async update(id: string, dto: UpdateQuoteDto, ctx: TenantContext) {
    const quote = await this.scopedOne(id, ctx);

    if (!isEditable(quote.status as QuoteStatus)) {
      throw new BadRequestException(
        'Solo se puede editar una cotización en borrador. Cree una nueva si cambian las condiciones.',
      );
    }

    await this.tenantScope.assertReference(Unit, dto.unit_id, ctx);
    await this.tenantScope.assertReference(Client, dto.client_id, ctx);

    const unitId = dto.unit_id ?? quote.unit_id;
    const unit = await this.loadUnit(unitId, ctx);

    if (dto.client_id) {
      const client = await this.loadClient(dto.client_id, ctx);
      if (client.project_id !== quote.project_id) {
        throw new BadRequestException('El cliente no pertenece al proyecto de la cotización');
      }
    }
    if (unit.project_id !== quote.project_id) {
      throw new BadRequestException('La unidad no pertenece al proyecto de la cotización');
    }

    const params = {
      unit_id: unitId,
      discount: dto.discount ?? quote.discount,
      reservation_amount: dto.reservation_amount ?? quote.reservation_amount,
      down_payment_percent: dto.down_payment_percent ?? quote.down_payment_percent,
      installments_count: dto.installments_count ?? quote.installments_count,
      first_installment_date: dto.first_installment_date ?? quote.first_installment_date,
      quote_date: dto.quote_date ?? quote.quote_date,
    };
    const calculation = this.calculate(params, unit.price);

    await this.dataSource.transaction(async (manager) => {
      // El cronograma se regenera entero: recalcular fila por fila dejaría
      // cuotas viejas colgando si baja el número de cuotas.
      await manager.delete(QuoteInstallment, { quote_id: quote.id });

      Object.assign(quote, {
        unit_id: unitId,
        client_id: dto.client_id ?? quote.client_id,
        unit_price: unit.price,
        discount: params.discount,
        reservation_amount: params.reservation_amount,
        down_payment_percent: params.down_payment_percent,
        installments_count: params.installments_count,
        first_installment_date: params.first_installment_date,
        quote_date: params.quote_date,
        valid_until: dto.valid_days
          ? addDays(params.quote_date, dto.valid_days)
          : quote.valid_until,
        notes: dto.notes ?? quote.notes,
        total_value: calculation.total_value,
        down_payment_value: calculation.down_payment_value,
        installment_amount: calculation.installment_amount,
        balance_value: calculation.balance_value,
        installments: calculation.installments.map((i) => manager.create(QuoteInstallment, i)),
      });

      await manager.save(Quote, quote);
    });

    return this.findOne(id, ctx);
  }

  async changeStatus(id: string, status: QuoteStatus, ctx: TenantContext) {
    const quote = await this.scopedOne(id, ctx);
    assertTransition(quote.status as QuoteStatus, status);
    quote.status = status;
    await this.quoteRepository.save(quote);
    return this.findOne(id, ctx);
  }

  async remove(id: string, ctx: TenantContext) {
    const quote = await this.scopedOne(id, ctx);
    // Las cuotas caen por ON DELETE CASCADE.
    return this.quoteRepository.remove(quote);
  }

  // ── Internos ──────────────────────────────────────────────────────────

  private calculate(
    params: {
      discount?: number;
      reservation_amount?: number;
      down_payment_percent: number;
      installments_count: number;
      first_installment_date: string;
      quote_date?: string;
    },
    unitPrice: number,
  ): QuoteCalculation {
    try {
      return calculateQuote({
        unit_price: unitPrice,
        discount: params.discount ?? 0,
        reservation_amount: params.reservation_amount ?? 0,
        down_payment_percent: params.down_payment_percent,
        installments_count: params.installments_count,
        quote_date: params.quote_date ?? businessToday(),
        first_installment_date: params.first_installment_date,
      });
    } catch (error) {
      if (error instanceof QuoteCalculationError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  /**
   * Guarda reintentando el consecutivo: dos agentes que graban en el mismo
   * instante calculan el mismo número, y el índice único (project_id, code) es
   * el que decide. Un contador en memoria no serviría con varias instancias.
   */
  private async saveWithCode(
    projectId: string,
    quoteDate: string,
    save: (code: string, manager: EntityManager) => Promise<Quote>,
  ): Promise<Quote> {
    const year = Number(quoteDate.slice(0, 4));

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.dataSource.transaction(async (manager) => {
          const code = await this.nextCode(manager, projectId, year);
          return save(code, manager);
        });
      } catch (error: any) {
        if (error?.code !== UNIQUE_VIOLATION || attempt === 2) throw error;
      }
    }

    throw new Error('unreachable');
  }

  private async nextCode(manager: EntityManager, projectId: string, year: number): Promise<string> {
    const row = await manager
      .createQueryBuilder(Quote, 'quote')
      .select('COUNT(*)', 'count')
      .where('quote.project_id = :projectId', { projectId })
      .andWhere('EXTRACT(YEAR FROM quote.quote_date) = :year', { year })
      .getRawOne<{ count: string }>();

    return `COT-${year}-${String(Number(row.count) + 1).padStart(4, '0')}`;
  }

  private async scopedOne(id: string, ctx: TenantContext): Promise<Quote> {
    const quote = await this.tenantScope
      .scoped(Quote, 'quote', ctx)
      .leftJoinAndSelect('quote.installments', 'installment')
      .leftJoinAndSelect('quote.unit', 'unit')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.agent', 'agent')
      .leftJoinAndSelect('quote.project', 'project')
      .andWhere('quote.id = :id', { id })
      .orderBy('installment.number', 'ASC')
      .getOne();

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }
    return quote;
  }

  private async loadUnit(unitId: string, ctx: TenantContext): Promise<Unit> {
    const unit = await this.tenantScope
      .scoped(Unit, 'unit', ctx)
      .andWhere('unit.id = :unitId', { unitId })
      .getOne();

    if (!unit) {
      throw new NotFoundException(`Unit with ID ${unitId} not found`);
    }
    return unit;
  }

  private async loadClient(clientId: string, ctx: TenantContext): Promise<Client> {
    const client = await this.tenantScope
      .scoped(Client, 'client', ctx)
      .andWhere('client.id = :clientId', { clientId })
      .getOne();

    if (!client) {
      throw new NotFoundException(`Client with ID ${clientId} not found`);
    }
    return client;
  }

  /** `is_expired` se calcula en la respuesta; no existe como columna. */
  private decorate(quote: Quote) {
    return {
      ...quote,
      is_expired: isExpired(quote.status as QuoteStatus, quote.valid_until),
    };
  }
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd backend && npx tsc --noEmit -p tsconfig.json
```

Esperado: sin errores.

- [ ] **Step 3: Commit**

```bash
git add backend/src/quotes/quotes.service.ts
git commit -m "feat(quotes): servicio con cronograma, consecutivo y aislamiento"
```

---

## Task 6: Controlador, módulo y migración

**Files:**
- Create: `backend/src/quotes/quotes.controller.ts`, `backend/src/quotes/quotes.module.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/migrations/<timestamp>-AddQuotes.ts` (generada)

- [ ] **Step 1: Crear el controlador**

Crear `backend/src/quotes/quotes.controller.ts` (sin el endpoint de PDF todavía, llega en la Task 7):

```ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PreviewQuoteDto } from './dto/preview-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentTenant, TenantContext } from '../common/tenant';

@ApiTags('Quotes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  /** Alimenta el cronograma en vivo del formulario. No escribe nada. */
  @Post('preview')
  @Roles('Admin', 'Agent')
  preview(@Body() dto: PreviewQuoteDto, @CurrentTenant() tenant: TenantContext) {
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

  @Patch(':id')
  @Roles('Admin', 'Agent')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.quotesService.update(id, dto, tenant);
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
```

- [ ] **Step 2: Crear el módulo**

Crear `backend/src/quotes/quotes.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { Quote } from './entities/quote.entity';
import { QuoteInstallment } from './entities/quote-installment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, QuoteInstallment])],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
```

- [ ] **Step 3: Registrar el módulo en la aplicación**

En `backend/src/app.module.ts`, agregar el import junto a los demás:

```ts
import { QuotesModule } from './quotes/quotes.module';
```

Y en el arreglo `imports`, después de `SalesModule,`:

```ts
    QuotesModule,
```

- [ ] **Step 4: Verificar que la aplicación arranca**

```bash
cd backend && npm run build
```

Esperado: compila sin errores.

- [ ] **Step 5: Generar la migración**

⚠️ **`backend/.env` apunta a la misma base que producción.** `migration:generate` solo *lee* el esquema para compararlo, es seguro. `migration:run` **escribe en producción**: córrelo solo cuando el equipo esté listo. Nunca pongas `DB_SYNCHRONIZE=true`.

```bash
cd backend && npm run migration:generate -- src/migrations/AddQuotes
```

Esperado: crea `src/migrations/<timestamp>-AddQuotes.ts` con los `CREATE TABLE` de `quotes` y `quote_installments`, sus llaves foráneas y el índice único.

- [ ] **Step 6: Revisar la migración generada**

Abrir el archivo y confirmar tres cosas:
1. Crea **solo** las dos tablas nuevas y su índice. Si trae `ALTER`/`DROP` de otras tablas, es deriva del esquema contra las entidades: **no la corras**, repórtalo.
2. La FK de `quote_installments.quote_id` lleva `ON DELETE CASCADE`.
3. Existe el índice único sobre `(project_id, code)`.

- [ ] **Step 7: Aplicar la migración y probar los endpoints**

```bash
cd backend && npm run migration:run && npm run start:dev
```

En otra terminal, con un token de un usuario Admin (obtenido de `POST /api/auth/login`) y los UUID de un proyecto, una unidad y un cliente reales de ese proyecto:

```bash
TOKEN="<pega el access_token>"

curl -s -X POST http://localhost:3000/api/quotes/preview \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"unit_id":"<UNIT>","down_payment_percent":30,"installments_count":12,"reservation_amount":5000000,"first_installment_date":"2026-09-01"}'
```

Esperado: JSON con `total_value`, `down_payment_value`, `balance_value` y el arreglo `installments`.

```bash
curl -s -X POST http://localhost:3000/api/quotes \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"project_id":"<PROJECT>","unit_id":"<UNIT>","client_id":"<CLIENT>","down_payment_percent":30,"installments_count":12,"reservation_amount":5000000,"first_installment_date":"2026-09-01"}'
```

Esperado: 201 con `code: "COT-2026-0001"`, `status: "draft"`, `is_expired: false` y 14 filas en `installments`.

```bash
curl -s -X PATCH http://localhost:3000/api/quotes/<ID>/status \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"accepted"}'
```

Esperado: 400 — `No se puede pasar una cotización de "draft" a "accepted"`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/quotes/quotes.controller.ts backend/src/quotes/quotes.module.ts backend/src/app.module.ts backend/src/migrations
git commit -m "feat(quotes): endpoints REST y migración de esquema"
```

---

## Task 7: PDF

**Files:**
- Create: `backend/src/quotes/quote-pdf.service.ts`
- Modify: `backend/src/quotes/quotes.controller.ts`, `backend/src/quotes/quotes.module.ts`, `backend/package.json`

- [ ] **Step 1: Instalar pdfkit**

```bash
cd backend && npm install pdfkit && npm install -D @types/pdfkit
```

- [ ] **Step 2: Crear el servicio de PDF**

Crear `backend/src/quotes/quote-pdf.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Quote } from './entities/quote.entity';

const money = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

const CONCEPT_LABEL: Record<string, string> = {
  separacion: 'Separación',
  cuota: 'Cuota inicial',
  saldo: 'Saldo crédito',
};

const date = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

@Injectable()
export class QuotePdfService {
  /**
   * Arma el PDF en memoria (son unos pocos KB) y lo devuelve. No se guarda en
   * disco ni en Cloudinary: así no hay archivo que se desincronice de los datos.
   */
  async render(quote: Quote): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    this.header(doc, quote);
    this.parties(doc, quote);
    this.summary(doc, quote);
    this.schedule(doc, quote);
    this.footer(doc, quote);

    doc.end();
    return done;
  }

  private header(doc: PDFKit.PDFDocument, quote: Quote) {
    doc.fontSize(18).font('Helvetica-Bold').text(quote.project?.name ?? 'Cotización');
    doc.fontSize(10).font('Helvetica').fillColor('#555');
    if (quote.project?.location) doc.text(quote.project.location);
    doc.moveDown(0.5);
    doc.fillColor('#000').fontSize(12).font('Helvetica-Bold').text(`Cotización ${quote.code}`);
    doc.fontSize(10).font('Helvetica').text(`Fecha: ${date(quote.quote_date)}`);
    doc.moveDown();
  }

  private parties(doc: PDFKit.PDFDocument, quote: Quote) {
    doc.fontSize(11).font('Helvetica-Bold').text('Cliente');
    doc.fontSize(10).font('Helvetica');
    doc.text(`${quote.client?.name ?? ''}   C.C. ${quote.client?.document_number ?? ''}`);
    doc.text(`${quote.client?.phone ?? ''}   ${quote.client?.email ?? ''}`);
    doc.moveDown(0.7);

    doc.fontSize(11).font('Helvetica-Bold').text('Unidad');
    doc.fontSize(10).font('Helvetica');
    const unit = quote.unit;
    doc.text(
      `${unit?.code ?? ''}   Torre ${unit?.tower ?? '-'}   Piso ${unit?.floor ?? '-'}   ` +
        `${unit?.area ?? '-'} m²${unit?.unit_type ? `   ${unit.unit_type}` : ''}`,
    );
    doc.moveDown();
  }

  private summary(doc: PDFKit.PDFDocument, quote: Quote) {
    const rows: [string, string][] = [
      ['Precio de la unidad', money(quote.unit_price)],
      ['Descuento', money(quote.discount)],
      ['Valor total', money(quote.total_value)],
      ['Separación', money(quote.reservation_amount)],
      [`Cuota inicial (${Number(quote.down_payment_percent)}%)`, money(quote.down_payment_value)],
      [`${quote.installments_count} cuotas de`, money(quote.installment_amount)],
      ['Saldo con crédito hipotecario', money(quote.balance_value)],
    ];

    doc.fontSize(11).font('Helvetica-Bold').text('Resumen');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica');

    for (const [label, value] of rows) {
      const y = doc.y;
      doc.text(label, 50, y);
      doc.text(value, 350, y, { width: 200, align: 'right' });
    }
    doc.moveDown();
  }

  private schedule(doc: PDFKit.PDFDocument, quote: Quote) {
    doc.fontSize(11).font('Helvetica-Bold').text('Plan de pagos');
    doc.moveDown(0.3);

    const head = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('#', 50, head);
    doc.text('Concepto', 80, head);
    doc.text('Vencimiento', 240, head);
    doc.text('Valor', 350, head, { width: 200, align: 'right' });
    doc.moveTo(50, doc.y + 2).lineTo(550, doc.y + 2).strokeColor('#cccccc').stroke();
    doc.moveDown(0.5);

    doc.font('Helvetica');
    for (const installment of quote.installments ?? []) {
      if (doc.y > 700) doc.addPage();
      const y = doc.y;
      doc.text(String(installment.number), 50, y);
      doc.text(CONCEPT_LABEL[installment.concept] ?? installment.concept, 80, y);
      doc.text(date(installment.due_date), 240, y);
      doc.text(money(installment.amount), 350, y, { width: 200, align: 'right' });
    }
    doc.moveDown();
  }

  private footer(doc: PDFKit.PDFDocument, quote: Quote) {
    if (quote.notes) {
      doc.moveDown(0.5).fontSize(9).font('Helvetica-Oblique').fillColor('#333').text(quote.notes);
    }
    doc.moveDown(0.8);
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
    doc.text(`Válida hasta ${date(quote.valid_until)}`);
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor('#666').fontSize(8);
    doc.text(
      'Esta cotización es informativa y no constituye promesa de compraventa. ' +
        'Valores sujetos a cambio sin previo aviso.',
    );
  }
}
```

Si TypeScript se queja de `new PDFDocument(...)` con el import `* as`, cambiar esa línea por `import PDFDocument = require('pdfkit');` — el proyecto compila a CommonJS y no tiene `esModuleInterop`.

- [ ] **Step 3: Exponer el PDF en el servicio de cotizaciones**

En `backend/src/quotes/quotes.service.ts`, agregar este método público después de `remove`:

```ts
  /** La entidad completa (con relaciones y cuotas) que necesita el PDF. */
  async findOneEntity(id: string, ctx: TenantContext): Promise<Quote> {
    return this.scopedOne(id, ctx);
  }
```

- [ ] **Step 4: Agregar el endpoint**

En `backend/src/quotes/quotes.controller.ts`, agregar `Res` a la lista de símbolos que ya se importan de `@nestjs/common` (no una segunda línea de import), y agregar estas dos:

```ts
import { Response } from 'express';
import { QuotePdfService } from './quote-pdf.service';
```

Inyectar el servicio en el constructor:

```ts
  constructor(
    private readonly quotesService: QuotesService,
    private readonly quotePdfService: QuotePdfService,
  ) {}
```

Y agregar el endpoint **antes** de `@Get(':id')` no es necesario (las rutas no chocan), así que va después de `findOne`:

```ts
  @Get(':id/pdf')
  @Roles('Admin', 'Agent')
  async pdf(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findOneEntity(id, tenant);
    const buffer = await this.quotePdfService.render(quote);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': String(buffer.length),
      'Content-Disposition': `attachment; filename="Cotizacion-${quote.code}.pdf"`,
    });
    res.end(buffer);
  }
```

En `backend/src/quotes/quotes.module.ts`, agregar `QuotePdfService` a `providers`:

```ts
import { QuotePdfService } from './quote-pdf.service';
// ...
  providers: [QuotesService, QuotePdfService],
```

- [ ] **Step 5: Verificar el PDF**

```bash
cd backend && npm run build && npm run start:dev
```

Con el id de la cotización creada en la Task 6:

```bash
curl -s -o /tmp/cot.pdf -w '%{http_code} %{content_type}\n' \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/quotes/<ID>/pdf
```

Esperado: `200 application/pdf`. Abrir `/tmp/cot.pdf` y confirmar: encabezado con el proyecto y el código, datos del cliente y de la unidad, el resumen con los siete renglones, la tabla completa de cuotas y la nota legal al pie. Los acentos deben verse bien.

- [ ] **Step 6: Commit**

```bash
git add backend/src/quotes backend/package.json backend/package-lock.json
git commit -m "feat(quotes): PDF de la cotización con pdfkit"
```

---

## Task 8: Filtrar clientes por proyecto

El formulario necesita los clientes de un proyecto; hoy `GET /api/clients` los trae todos los del tenant.

**Files:**
- Modify: `backend/src/clients/clients.controller.ts`, `backend/src/clients/clients.service.ts`

- [ ] **Step 1: Agregar el filtro en el servicio**

En `backend/src/clients/clients.service.ts`, reemplazar el método `findAll`:

```ts
  findAll(ctx: TenantContext, projectId?: string) {
    const qb = this.tenantScope
      .scoped(Client, 'client', ctx)
      .leftJoinAndSelect('client.project', 'project');

    if (projectId) {
      qb.andWhere('client.project_id = :projectId', { projectId });
    }

    return qb.getMany();
  }
```

- [ ] **Step 2: Aceptar el parámetro en el controlador**

En `backend/src/clients/clients.controller.ts`, asegurar que `Query` está importado desde `@nestjs/common` y reemplazar el handler `findAll`:

```ts
  @Get()
  @Roles('Admin', 'Agent')
  findAll(@CurrentTenant() tenant: TenantContext, @Query('project_id') projectId?: string) {
    return this.clientsService.findAll(tenant, projectId);
  }
```

- [ ] **Step 3: Verificar**

```bash
cd backend && npm run build
```

Esperado: compila. Con el servidor arriba:

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/clients?project_id=<PROJECT>" | head -c 300
```

Esperado: solo clientes de ese proyecto. Sin el parámetro, siguen saliendo todos los del tenant.

- [ ] **Step 4: Commit**

```bash
git add backend/src/clients
git commit -m "feat(clients): filtro opcional por project_id en el listado"
```

---

## Task 9: Pestaña del proyecto y ruta

**Files:**
- Create: `frontend/src/components/ProjectTabs.tsx`
- Modify: `frontend/src/components/ProjectDashboardPage.tsx:153-156`, `frontend/src/components/ProjectAnalyticsPage.tsx:185-206`, `frontend/src/App.tsx`

- [ ] **Step 1: Crear el componente de pestañas**

Crear `frontend/src/components/ProjectTabs.tsx`:

```tsx
import { Link, useLocation } from 'react-router-dom';

/**
 * Barra de navegación del proyecto. Estaba duplicada en el resumen y en la
 * analítica; con una quinta pestaña, mantenerla en un solo sitio deja de ser
 * opcional.
 */
export default function ProjectTabs({ projectId }: { projectId?: string }) {
  const { pathname } = useLocation();

  const tabs = [
    { label: 'Resumen', to: `/crm/projects/${projectId}` },
    { label: 'Unidades', to: `/crm/projects/${projectId}/units` },
    { label: 'Cotizaciones', to: `/crm/projects/${projectId}/quotes` },
    { label: 'Documentos', to: `/crm/projects/${projectId}/documents` },
    { label: 'Analítica', to: `/crm/projects/${projectId}/analytics` },
  ];

  return (
    <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 mb-6">
      {tabs.map(({ label, to }) => {
        const active = pathname === to;
        return (
          <Link
            key={label}
            to={to}
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
              active
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Usarlo en el resumen del proyecto**

En `frontend/src/components/ProjectDashboardPage.tsx`, agregar el import:

```tsx
import ProjectTabs from './ProjectTabs';
```

Y reemplazar el bloque de la barra de pestañas (las líneas 152-157, el `<div>` que contiene los cuatro `<Link>` a Resumen/Unidades/Documentos/Analítica) por:

```tsx
        <ProjectTabs projectId={projectId} />
```

- [ ] **Step 3: Usarlo en la analítica**

En `frontend/src/components/ProjectAnalyticsPage.tsx`, agregar el import:

```tsx
import ProjectTabs from './ProjectTabs';
```

Borrar la definición completa del helper `SubNav` (el bloque que empieza en `const SubNav = () => (` y termina en su cierre) y reemplazar cada uso de `<SubNav />` por:

```tsx
<ProjectTabs projectId={projectId} />
```

- [ ] **Step 4: Registrar la ruta**

En `frontend/src/App.tsx`, agregar el import:

```tsx
import ProjectQuotesPage from './components/ProjectQuotesPage';
```

Y la ruta, después de la de `units`:

```tsx
          <Route path="/crm/projects/:projectId/quotes" element={<ProjectQuotesPage />} />
```

La página se crea en la Task 10; hasta entonces el build falla, así que **este paso se commitea junto con la Task 10**.

- [ ] **Step 5: Verificar las pestañas**

Sin la ruta nueva todavía, comprobar el refactor:

```bash
cd frontend && npm run build
```

Si ya agregaste el import de `ProjectQuotesPage`, el build fallará con `Cannot find module './components/ProjectQuotesPage'` — es lo esperado y se resuelve en la Task 10. Para verificar solo el refactor, comenta temporalmente esas dos líneas y confirma que compila.

---

## Task 10: Página de cotizaciones

**Files:**
- Create: `frontend/src/components/quoteTypes.ts`, `frontend/src/components/ProjectQuotesPage.tsx`

- [ ] **Step 1: Crear los tipos compartidos**

Crear `frontend/src/components/quoteTypes.ts`:

```ts
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Installment {
  number: number;
  concept: 'separacion' | 'cuota' | 'saldo';
  amount: number;
  due_date: string;
}

export interface Quote {
  id: string;
  code: string;
  status: QuoteStatus;
  is_expired: boolean;
  quote_date: string;
  valid_until: string;
  unit_price: number;
  discount: number;
  total_value: number;
  reservation_amount: number;
  down_payment_percent: number;
  down_payment_value: number;
  installments_count: number;
  installment_amount: number;
  first_installment_date: string;
  balance_value: number;
  notes?: string;
  installments?: Installment[];
  unit?: { id: string; code: string; tower?: string; floor?: string; area?: number; unit_type?: string };
  client?: { id: string; name: string; document_number: string; phone?: string; email?: string };
  agent?: { id: string; name: string };
}

export interface QuoteCalculation {
  total_value: number;
  down_payment_value: number;
  balance_value: number;
  installment_amount: number;
  installments: Installment[];
}

export const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));

export const formatDate = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

export const CONCEPT_LABEL: Record<Installment['concept'], string> = {
  separacion: 'Separación',
  cuota: 'Cuota inicial',
  saldo: 'Saldo crédito',
};

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  sent: 'Enviada',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
};

export const STATUS_CLASS: Record<QuoteStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const authHeaders = (): HeadersInit => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});
```

- [ ] **Step 2: Crear la página**

Crear `frontend/src/components/ProjectQuotesPage.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CrmLayout from './CrmLayout';
import ProjectTabs from './ProjectTabs';
import QuoteFormModal from './QuoteFormModal';
import QuoteDetailModal from './QuoteDetailModal';
import {
  authHeaders,
  formatCOP,
  formatDate,
  Quote,
  QuoteStatus,
  STATUS_CLASS,
  STATUS_LABEL,
} from './quoteTypes';

const FILTERS: { value: '' | QuoteStatus; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'draft', label: 'Borradores' },
  { value: 'sent', label: 'Enviadas' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

export default function ProjectQuotesPage() {
  const { projectId } = useParams();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'' | QuoteStatus>('');
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ project_id: projectId ?? '' });
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/quotes?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setQuotes(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las cotizaciones');
    } finally {
      setLoading(false);
    }
  }, [projectId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CrmLayout>
      <div className="p-6">
        <ProjectTabs projectId={projectId} />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Cotizaciones</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Planes de pago generados para este proyecto
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
          >
            Nueva cotización
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setFilter(f.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.value
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3 text-right">Valor total</th>
                <th className="px-4 py-3 text-right">Cuota mensual</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Vigencia</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}

              {!loading && quotes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                    Todavía no hay cotizaciones en este proyecto.
                  </td>
                </tr>
              )}

              {!loading &&
                quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {quote.code}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {quote.client?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {quote.unit?.code}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCOP(quote.total_value)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCOP(quote.installment_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_CLASS[quote.status]}`}
                      >
                        {STATUS_LABEL[quote.status]}
                      </span>
                      {quote.is_expired && (
                        <span className="ml-2 text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          Vencida
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatDate(quote.valid_until)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setDetailId(quote.id)}
                        className="text-blue-600 font-bold text-xs hover:underline"
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <QuoteFormModal
          projectId={projectId!}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {detailId && (
        <QuoteDetailModal
          quoteId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={load}
        />
      )}
    </CrmLayout>
  );
}
```

- [ ] **Step 3: Commit junto con la ruta**

El build todavía falla porque faltan los dos modales (Tasks 11 y 12). Commitear el avance:

```bash
git add frontend/src/components/ProjectTabs.tsx frontend/src/components/quoteTypes.ts frontend/src/components/ProjectQuotesPage.tsx frontend/src/components/ProjectDashboardPage.tsx frontend/src/components/ProjectAnalyticsPage.tsx frontend/src/App.tsx
git commit -m "feat(quotes): pestaña y listado de cotizaciones del proyecto"
```

---

## Task 11: Formulario con cronograma en vivo

**Files:**
- Create: `frontend/src/components/QuoteFormModal.tsx`

- [ ] **Step 1: Crear el modal**

Crear `frontend/src/components/QuoteFormModal.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import {
  authHeaders,
  CONCEPT_LABEL,
  formatCOP,
  formatDate,
  QuoteCalculation,
} from './quoteTypes';

interface UnitOption {
  id: string;
  code: string;
  tower?: string;
  floor?: string;
  price: number;
}

interface ClientOption {
  id: string;
  name: string;
  document_number: string;
}

const firstOfNextMonth = () => {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return date.toISOString().slice(0, 10);
};

export default function QuoteFormModal({
  projectId,
  onClose,
  onSaved,
}: {
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState({
    unit_id: '',
    client_id: '',
    discount: 0,
    reservation_amount: 0,
    down_payment_percent: 30,
    installments_count: 12,
    first_installment_date: firstOfNextMonth(),
    valid_days: 15,
    notes: '',
  });
  const [newClient, setNewClient] = useState<null | {
    name: string;
    document_number: string;
    phone: string;
    email: string;
  }>(null);
  const [preview, setPreview] = useState<QuoteCalculation | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const headers = authHeaders();
    Promise.all([
      fetch(`/api/units?project_id=${projectId}`, { headers }).then((r) => r.json()),
      fetch(`/api/clients?project_id=${projectId}`, { headers }).then((r) => r.json()),
    ])
      .then(([unitsData, clientsData]) => {
        setUnits(Array.isArray(unitsData) ? unitsData : []);
        setClients(Array.isArray(clientsData) ? clientsData : []);
      })
      .catch(() => setError('No se pudieron cargar unidades o clientes'));
  }, [projectId]);

  const selectedUnit = useMemo(
    () => units.find((u) => u.id === form.unit_id),
    [units, form.unit_id],
  );

  // El cronograma lo calcula el backend: es la misma función que usa el
  // guardado, así que lo que se ve aquí es exactamente lo que se guarda.
  useEffect(() => {
    if (!form.unit_id) {
      setPreview(null);
      return;
    }

    const timer = setTimeout(async () => {
      setPreviewError('');
      try {
        const res = await fetch('/api/quotes/preview', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            unit_id: form.unit_id,
            discount: Number(form.discount) || 0,
            reservation_amount: Number(form.reservation_amount) || 0,
            down_payment_percent: Number(form.down_payment_percent),
            installments_count: Number(form.installments_count),
            first_installment_date: form.first_installment_date,
          }),
        });
        const body = await res.json();
        if (!res.ok) {
          setPreview(null);
          setPreviewError(Array.isArray(body.message) ? body.message[0] : body.message);
          return;
        }
        setPreview(body);
      } catch {
        setPreviewError('No se pudo calcular el plan de pagos');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    form.unit_id,
    form.discount,
    form.reservation_amount,
    form.down_payment_percent,
    form.installments_count,
    form.first_installment_date,
  ]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      let clientId = form.client_id;

      if (newClient) {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ ...newClient, project_id: projectId }),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message ?? 'No se pudo crear el cliente');
        clientId = body.id;
      }

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          project_id: projectId,
          unit_id: form.unit_id,
          client_id: clientId,
          discount: Number(form.discount) || 0,
          reservation_amount: Number(form.reservation_amount) || 0,
          down_payment_percent: Number(form.down_payment_percent),
          installments_count: Number(form.installments_count),
          first_installment_date: form.first_installment_date,
          valid_days: Number(form.valid_days),
          notes: form.notes || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(Array.isArray(body.message) ? body.message[0] : body.message);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la cotización');
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    !!form.unit_id && (!!form.client_id || !!newClient?.name) && !!preview && !saving;

  const field = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm';
  const label = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nueva cotización</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6">
          {/* Parámetros */}
          <div className="space-y-4">
            <div>
              <label className={label}>Unidad</label>
              <select
                className={field}
                value={form.unit_id}
                onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
              >
                <option value="">Seleccione una unidad…</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} · Torre {u.tower ?? '-'} · Piso {u.floor ?? '-'} · {formatCOP(u.price)}
                  </option>
                ))}
              </select>
              {selectedUnit && (
                <p className="mt-1 text-xs text-slate-500">
                  Precio de lista: {formatCOP(selectedUnit.price)}
                </p>
              )}
            </div>

            <div>
              <label className={label}>Cliente</label>
              {!newClient && (
                <>
                  <select
                    className={field}
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                  >
                    <option value="">Seleccione un cliente…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.document_number}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() =>
                      setNewClient({ name: '', document_number: '', phone: '', email: '' })
                    }
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    + Nuevo cliente
                  </button>
                </>
              )}

              {newClient && (
                <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                  <input
                    className={field}
                    placeholder="Nombre completo"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  />
                  <input
                    className={field}
                    placeholder="Cédula"
                    value={newClient.document_number}
                    onChange={(e) =>
                      setNewClient({ ...newClient, document_number: e.target.value })
                    }
                  />
                  <input
                    className={field}
                    placeholder="Teléfono"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  />
                  <input
                    className={field}
                    placeholder="Correo"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setNewClient(null)}
                    className="text-xs font-bold text-slate-500 hover:underline"
                  >
                    Usar un cliente existente
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Descuento</label>
                <input
                  type="number"
                  min={0}
                  className={field}
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={label}>Separación</label>
                <input
                  type="number"
                  min={0}
                  className={field}
                  value={form.reservation_amount}
                  onChange={(e) =>
                    setForm({ ...form, reservation_amount: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className={label}>Cuota inicial (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={field}
                  value={form.down_payment_percent}
                  onChange={(e) =>
                    setForm({ ...form, down_payment_percent: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className={label}>Nº de cuotas</label>
                <input
                  type="number"
                  min={1}
                  className={field}
                  value={form.installments_count}
                  onChange={(e) =>
                    setForm({ ...form, installments_count: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className={label}>Primera cuota</label>
                <input
                  type="date"
                  className={field}
                  value={form.first_installment_date}
                  onChange={(e) =>
                    setForm({ ...form, first_installment_date: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={label}>Vigencia (días)</label>
                <input
                  type="number"
                  min={1}
                  className={field}
                  value={form.valid_days}
                  onChange={(e) => setForm({ ...form, valid_days: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <label className={label}>Notas</label>
              <textarea
                rows={2}
                className={field}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </div>

          {/* Cronograma en vivo */}
          <div>
            {previewError && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-sm px-4 py-3">
                {previewError}
              </div>
            )}

            {!preview && !previewError && (
              <p className="text-sm text-slate-400">
                Elija una unidad para ver el plan de pagos.
              </p>
            )}

            {preview && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    ['Valor total', preview.total_value],
                    ['Cuota inicial', preview.down_payment_value],
                    ['Cuota mensual', preview.installment_amount],
                    ['Saldo crédito', preview.balance_value],
                  ].map(([labelText, value]) => (
                    <div
                      key={labelText as string}
                      className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2"
                    >
                      <p className="text-xs text-slate-500">{labelText}</p>
                      <p className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCOP(value as number)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 text-slate-500">
                      <tr>
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Concepto</th>
                        <th className="px-3 py-2 text-left">Vence</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.installments.map((i) => (
                        <tr key={i.number} className="border-t border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-1.5">{i.number}</td>
                          <td className="px-3 py-1.5">{CONCEPT_LABEL[i.concept]}</td>
                          <td className="px-3 py-1.5">{formatDate(i.due_date)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">
                            {formatCOP(i.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold"
          >
            {saving ? 'Guardando…' : 'Guardar cotización'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/QuoteFormModal.tsx
git commit -m "feat(quotes): formulario de cotización con cronograma en vivo"
```

---

## Task 12: Detalle, cambios de estado y descarga del PDF

**Files:**
- Create: `frontend/src/components/QuoteDetailModal.tsx`

- [ ] **Step 1: Crear el modal**

Crear `frontend/src/components/QuoteDetailModal.tsx`:

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  authHeaders,
  CONCEPT_LABEL,
  formatCOP,
  formatDate,
  Quote,
  QuoteStatus,
  STATUS_CLASS,
  STATUS_LABEL,
} from './quoteTypes';

/** Acciones ofrecidas según el estado actual, en el mismo orden del flujo. */
const NEXT_ACTIONS: Record<QuoteStatus, { status: QuoteStatus; label: string }[]> = {
  draft: [{ status: 'sent', label: 'Marcar enviada' }],
  sent: [
    { status: 'accepted', label: 'Aceptada' },
    { status: 'rejected', label: 'Rechazada' },
  ],
  accepted: [],
  rejected: [],
};

export default function QuoteDetailModal({
  quoteId,
  onClose,
  onChanged,
}: {
  quoteId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setQuote(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la cotización');
    }
  }, [quoteId]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (status: QuoteStatus) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/quotes/${quoteId}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(Array.isArray(body.message) ? body.message[0] : body.message);
      setQuote(body);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    } finally {
      setBusy(false);
    }
  };

  // El PDF va detrás del guard: un <a href> plano no lleva el token y daría 401.
  const downloadPdf = async () => {
    setError('');
    const res = await fetch(`/api/quotes/${quoteId}/pdf`, { headers: authHeaders() });
    if (!res.ok) {
      setError(`No se pudo generar el PDF (error ${res.status})`);
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cotizacion-${quote?.code ?? quoteId}.pdf`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {quote?.code ?? 'Cotización'}
            </h2>
            {quote && (
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_CLASS[quote.status]}`}>
                {STATUS_LABEL[quote.status]}
              </span>
            )}
            {quote?.is_expired && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                Vencida
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        {!quote && <p className="p-6 text-sm text-slate-400">Cargando…</p>}

        {quote && (
          <div className="p-6 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Cliente</p>
                <p className="text-slate-900 dark:text-white font-medium">{quote.client?.name}</p>
                <p className="text-slate-500">C.C. {quote.client?.document_number}</p>
                <p className="text-slate-500">{quote.client?.phone}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Unidad</p>
                <p className="text-slate-900 dark:text-white font-medium">{quote.unit?.code}</p>
                <p className="text-slate-500">
                  Torre {quote.unit?.tower ?? '-'} · Piso {quote.unit?.floor ?? '-'} ·{' '}
                  {quote.unit?.area ?? '-'} m²
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                ['Valor total', quote.total_value],
                [`Inicial (${Number(quote.down_payment_percent)}%)`, quote.down_payment_value],
                ['Cuota mensual', quote.installment_amount],
                ['Saldo crédito', quote.balance_value],
              ].map(([labelText, value]) => (
                <div
                  key={labelText as string}
                  className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2"
                >
                  <p className="text-xs text-slate-500">{labelText}</p>
                  <p className="font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatCOP(value as number)}
                  </p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-2">Plan de pagos</p>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Concepto</th>
                      <th className="px-3 py-2 text-left">Vence</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quote.installments ?? []).map((i) => (
                      <tr key={i.number} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-1.5">{i.number}</td>
                        <td className="px-3 py-1.5">{CONCEPT_LABEL[i.concept]}</td>
                        <td className="px-3 py-1.5">{formatDate(i.due_date)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatCOP(i.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Válida hasta {formatDate(quote.valid_until)}
              </p>
            </div>

            {quote.notes && (
              <p className="text-sm text-slate-600 dark:text-slate-300 italic">{quote.notes}</p>
            )}
          </div>
        )}

        {quote && (
          <div className="flex flex-wrap justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={downloadPdf}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              Descargar PDF
            </button>
            {NEXT_ACTIONS[quote.status].map((action) => (
              <button
                key={action.status}
                disabled={busy}
                onClick={() => changeStatus(action.status)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Compilar el frontend**

```bash
cd frontend && npm run build
```

Esperado: `tsc -b` y `vite build` terminan sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/QuoteDetailModal.tsx
git commit -m "feat(quotes): detalle de cotización con estados y descarga de PDF"
```

---

## Task 13: Verificación de punta a punta

- [ ] **Step 1: Suite completa del backend**

```bash
cd backend && npm test
```

Esperado: todas las suites en verde, incluidas `quote-calculator`, `quote-status` y `tenant-scope`.

- [ ] **Step 2: Lint y build de ambos lados**

```bash
cd backend && npm run lint && npm run build
cd ../frontend && npm run lint && npm run build
```

Esperado: sin errores. (Si `npm run lint` del backend reporta problemas preexistentes en archivos ajenos a `src/quotes`, déjalos como están y repórtalos; no los arregles en esta rama.)

- [ ] **Step 3: Recorrido manual**

Con `npm run start:dev` en backend y `npm run dev` en frontend, entrar a `http://localhost:5173/crm/projects/<PROJECT>/quotes` y verificar:

1. La pestaña "Cotizaciones" aparece entre "Unidades" y "Documentos", y se resalta al estar en ella.
2. "Nueva cotización" → elegir unidad: el cronograma aparece a la derecha en menos de un segundo.
3. Mover el % de inicial de 30 a 20: el resumen y la tabla se recalculan.
4. Poner una separación mayor a la inicial: se muestra el aviso "La separación no puede superar la cuota inicial" y el botón de guardar queda deshabilitado.
5. Crear un cliente nuevo desde el formulario y guardar: la cotización aparece en la lista con código `COT-<año>-0001` y estado "Borrador".
6. Abrirla, descargar el PDF y confirmar que el archivo abre con el plan completo.
7. "Marcar enviada" → el estado cambia a "Enviada" y ahora se ofrecen "Aceptada" y "Rechazada".
8. Recargar la página: el estado persiste.

- [ ] **Step 4: Verificar el aislamiento entre tenants**

Con el token de un usuario de **otro** tenant, pedir la cotización creada:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $TOKEN_OTRO_TENANT" \
  http://localhost:3000/api/quotes/<ID>
```

Esperado: `404`. Lo mismo con `/pdf` y con `PATCH /status`. Un `200` aquí es un fallo de aislamiento y bloquea la entrega.

- [ ] **Step 5: Commit final y cierre**

```bash
git add -A
git commit -m "chore(quotes): verificación de punta a punta"
```

Luego usar la skill `superpowers:finishing-a-development-branch` para decidir cómo integrar `feat/cotizaciones`.
