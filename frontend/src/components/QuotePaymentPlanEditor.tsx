import { formatCOP } from './quoteTypes';
import type { PaymentPlan, PlannedPayment } from './quoteTypes';

const FIELD = 'w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-2 text-sm';

export default function QuotePaymentPlanEditor({ mode, payments, target, defaultDate, onChange }: {
  mode: PaymentPlan;
  payments: PlannedPayment[];
  target: number;
  defaultDate: string;
  onChange: (payments: PlannedPayment[]) => void;
}) {
  const total = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const difference = target - total;
  const lastRegular = payments.map((p) => p.concept).lastIndexOf('cuota');
  const adjustedAmount = lastRegular >= 0 ? payments[lastRegular].amount + difference : 0;
  const update = (index: number, patch: Partial<PlannedPayment>) =>
    onChange(payments.map((payment, i) => i === index ? { ...payment, ...patch } : payment));
  const add = (concept: PlannedPayment['concept']) => onChange([
    ...payments, { concept, amount: 0, due_date: defaultDate },
  ]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          {mode === 'custom' ? 'Cuotas y abonos pactados' : 'Abonos extra pactados'}
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {mode === 'custom'
            ? 'Define el valor y la fecha de cada pago de la inicial. La separación se suma por aparte.'
            : 'Los abonos extra se descuentan de la inicial y reducen las cuotas mensuales.'}
        </p>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-3">
        {payments.map((payment, index) => (
          <div key={index} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{index + 1}.</span>
              {mode === 'custom' ? (
                <select aria-label={`Concepto del pago ${index + 1}`} className={FIELD}
                  value={payment.concept}
                  onChange={(event) => update(index, { concept: event.target.value as PlannedPayment['concept'] })}>
                  <option value="cuota">Cuota inicial</option>
                  <option value="extra">Abono extra</option>
                </select>
              ) : <span className="flex-1 text-sm">Abono extra</span>}
              <button type="button" aria-label={`Eliminar pago ${index + 1}`}
                onClick={() => onChange(payments.filter((_, i) => i !== index))}
                className="px-2 py-1 text-xs font-bold text-red-600 hover:underline">Eliminar</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-500">Fecha
                <input type="date" aria-label={`Fecha del pago ${index + 1}`} className={FIELD}
                  value={payment.due_date} onChange={(event) => update(index, { due_date: event.target.value })} />
              </label>
              <label className="text-xs text-slate-500">Valor (COP)
                <input type="number" min={1} step={1} aria-label={`Valor del pago ${index + 1}`} className={FIELD}
                  value={payment.amount || ''} placeholder="0"
                  onChange={(event) => update(index, { amount: Number(event.target.value) })} />
              </label>
            </div>
          </div>
        ))}
        {payments.length === 0 && <p className="text-xs text-slate-400">Aún no has agregado pagos.</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        {mode === 'custom' && <button type="button" disabled={payments.length >= 600}
          onClick={() => add('cuota')} className="text-xs font-bold text-blue-600 disabled:opacity-40">+ Agregar cuota</button>}
        <button type="button" disabled={payments.length >= 600}
          onClick={() => add('extra')} className="text-xs font-bold text-blue-600 disabled:opacity-40">+ Agregar abono extra</button>
      </div>

      <div aria-live="polite" className={`rounded-lg px-3 py-2 text-xs ${difference < 0
        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
        : 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'}`}>
        <p>Total {mode === 'custom' ? 'pactado' : 'en abonos extra'}: <strong>{formatCOP(total)}</strong></p>
        <p className="mt-1">{difference < 0 ? 'Excede la inicial por: ' : mode === 'custom'
          ? 'Pendiente por distribuir: ' : 'A distribuir en cuotas mensuales: '}
          <strong>{formatCOP(Math.abs(difference))}</strong>
        </p>
      </div>
      {mode === 'custom' && difference !== 0 && lastRegular >= 0 && adjustedAmount > 0 && (
        <button type="button" onClick={() => update(lastRegular, { amount: adjustedAmount })}
          className="text-xs font-bold text-blue-600 hover:underline">
          Ajustar última cuota a {formatCOP(adjustedAmount)} para completar la inicial
        </button>
      )}
    </div>
  );
}
