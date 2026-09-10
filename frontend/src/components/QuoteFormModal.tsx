import { useEffect, useMemo, useState } from 'react';
import { authHeaders, CONCEPT_LABEL, formatCOP, formatDate } from './quoteTypes';
import type { PaymentPlan, PlannedPayment, Quote, QuoteCalculation } from './quoteTypes';
import QuotePaymentPlanEditor from './QuotePaymentPlanEditor';

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

const FIELD =
  'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm';
const LABEL = 'block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1';

export default function QuoteFormModal({
  projectId,
  quote,
  onClose,
  onSaved,
}: {
  projectId: string;
  quote?: Quote;
  onClose: () => void;
  onSaved: (quote: Quote) => void;
}) {
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [form, setForm] = useState({
    unit_id: quote?.unit_id ?? '',
    client_id: quote?.client_id ?? '',
    discount: Number(quote?.discount ?? 0),
    reservation_amount: Number(quote?.reservation_amount ?? 0),
    down_payment_percent: Number(quote?.down_payment_percent ?? 30),
    installments_count: quote?.installments_count ?? 12,
    first_installment_date: quote?.first_installment_date ?? firstOfNextMonth(),
    quote_date: quote?.quote_date ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()),
    payment_plan: (quote?.payment_plan ?? 'fixed') as PaymentPlan,
    balance_due_date: quote?.balance_due_date ?? '',
    valid_days: quote ? Math.max(1, Math.round((Date.parse(quote.valid_until) - Date.parse(quote.quote_date)) / 86400000)) : 15,
    notes: quote?.notes ?? '',
  });
  const [extras, setExtras] = useState<PlannedPayment[]>(() => (quote?.installments ?? [])
    .filter((i) => i.concept === 'extra')
    .map((i) => ({ concept: 'extra', amount: Number(i.amount), due_date: i.due_date })));
  const [customPayments, setCustomPayments] = useState<PlannedPayment[]>(() => (quote?.installments ?? [])
    .filter((i) => i.concept === 'cuota' || i.concept === 'extra')
    .map((i) => ({ concept: i.concept as PlannedPayment['concept'], amount: Number(i.amount), due_date: i.due_date })));
  const [newClient, setNewClient] = useState<null | {
    name: string;
    document_number: string;
    phone: string;
    email: string;
  }>(null);
  const [previewState, setPreviewState] = useState<{ key: string; data: QuoteCalculation | null; error: string }>({ key: '', data: null, error: '' });
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
  const unitPrice = quote?.unit_id === form.unit_id ? Number(quote.unit_price) : Number(selectedUnit?.price ?? 0);
  const initialToDistribute = Math.round((Math.round(unitPrice - form.discount) * Math.round(form.down_payment_percent * 100)) / 10000)
    - Math.round(form.reservation_amount);
  const calculationParams = {
    unit_id: form.unit_id,
    discount: form.discount,
    reservation_amount: form.reservation_amount,
    down_payment_percent: form.down_payment_percent,
    installments_count: form.payment_plan === 'custom' ? Math.max(1, customPayments.length) : form.installments_count,
    first_installment_date: form.payment_plan === 'custom'
      ? customPayments.map((i) => i.due_date).filter(Boolean).sort()[0] ?? form.quote_date
      : form.first_installment_date,
    quote_date: form.quote_date,
    payment_plan: form.payment_plan,
    balance_due_date: form.balance_due_date || null,
    extra_installments: form.payment_plan === 'fixed' ? extras : [],
    custom_installments: form.payment_plan === 'custom' ? customPayments : [],
  };
  const previewKey = JSON.stringify({ ...calculationParams, quote_id: quote?.id });
  const preview = previewState.key === previewKey ? previewState.data : null;
  const previewError = previewState.key === previewKey ? previewState.error : '';

  // El cronograma lo calcula el backend: es la misma función que usa el
  // guardado, así que lo que se ve aquí es exactamente lo que se guarda.
  useEffect(() => {
    if (!form.unit_id) return;
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/quotes/preview', {
          method: 'POST',
          headers: authHeaders(),
          body: previewKey,
          signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok) {
          if (!controller.signal.aborted) setPreviewState({ key: previewKey, data: null,
            error: (Array.isArray(body.message) ? body.message[0] : body.message) ?? 'No se pudo calcular el plan de pagos' });
          return;
        }
        if (!controller.signal.aborted) setPreviewState({ key: previewKey, data: body, error: '' });
      } catch {
        if (!controller.signal.aborted) setPreviewState({ key: previewKey, data: null, error: 'No se pudo calcular el plan de pagos' });
      }
    }, 400);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.unit_id, previewKey]);

  const changePlan = (mode: PaymentPlan) => {
    if (mode === form.payment_plan) return;
    if (mode === 'custom') {
      setCustomPayments(preview ? preview.installments
        .filter((i) => i.concept === 'cuota' || i.concept === 'extra')
        .map((i) => ({ concept: i.concept as PlannedPayment['concept'], amount: i.amount, due_date: i.due_date }))
        : [...customPayments.filter((i) => i.concept === 'cuota'), ...extras]);
    } else if (mode === 'fixed') {
      setExtras(customPayments.filter((i) => i.concept === 'extra'));
    }
    setForm({ ...form, payment_plan: mode });
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      let clientId = form.client_id;

      if (newClient) {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ name: newClient.name.trim(), document_number: newClient.document_number.trim(),
            phone: newClient.phone.trim(), email: newClient.email.trim(), project_id: projectId }),
        });
        const body = await res.json();
        if (!res.ok) {
          throw new Error(
            Array.isArray(body.message) ? body.message[0] : body.message ?? 'No se pudo crear el cliente',
          );
        }
        clientId = body.id;
        setClients((current) => [...current, body]);
        setForm((current) => ({ ...current, client_id: body.id }));
        setNewClient(null);
      }

      const res = await fetch(quote ? `/api/quotes/${quote.id}` : '/api/quotes', {
        method: quote ? 'PATCH' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          project_id: projectId,
          ...calculationParams,
          client_id: clientId,
          valid_days: Number(form.valid_days),
          notes: form.notes,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(Array.isArray(body.message) ? body.message[0] : body.message);
      }
      onSaved(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la cotización');
    } finally {
      setSaving(false);
    }
  };

  const clientReady = newClient
    ? !!newClient.name.trim() && !!newClient.document_number.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newClient.email.trim())
    : !!form.client_id;
  const canSave = !!form.unit_id && clientReady && !!preview && !saving
    && Number.isInteger(form.valid_days) && form.valid_days >= 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="quote-form-title" className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 id="quote-form-title" className="text-lg font-bold text-slate-900 dark:text-white">{quote ? `Editar ${quote.code}` : 'Nueva cotización'}</h2>
          <button onClick={onClose} disabled={saving} aria-label="Cerrar cotización" className="text-slate-400 hover:text-slate-600 text-xl">
            ×
          </button>
        </div>

        <fieldset disabled={saving} className="grid md:grid-cols-2 gap-6 p-6 min-w-0">
          {/* Parámetros */}
          <div className="space-y-4">
            <div>
              <label className={LABEL}>Unidad</label>
              <select
                className={FIELD}
                value={form.unit_id}
                onChange={(e) => setForm({ ...form, unit_id: e.target.value })}
              >
                <option value="">Seleccione una unidad…</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.code} · Torre {u.tower ?? '-'} · Piso {u.floor ?? '-'} · {formatCOP(quote?.unit_id === u.id ? quote.unit_price : u.price)}
                  </option>
                ))}
              </select>
              {selectedUnit && (
                <p className="mt-1 text-xs text-slate-500">
                  {quote?.unit_id === form.unit_id ? 'Precio cotizado' : 'Precio de lista'}: {formatCOP(unitPrice)}
                </p>
              )}
            </div>

            <div>
              <label className={LABEL}>Cliente</label>
              {!newClient && (
                <>
                  <select
                    className={FIELD}
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completa nombre, cédula y correo. El cliente se crea al guardar la cotización y queda disponible en este proyecto.</p>
                  <input
                    className={FIELD}
                    placeholder="Nombre completo"
                    aria-label="Nombre del nuevo cliente"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  />
                  <input
                    className={FIELD}
                    placeholder="Cédula"
                    aria-label="Cédula del nuevo cliente"
                    value={newClient.document_number}
                    onChange={(e) =>
                      setNewClient({ ...newClient, document_number: e.target.value })
                    }
                  />
                  <input
                    className={FIELD}
                    placeholder="Teléfono"
                    type="tel"
                    aria-label="Teléfono del nuevo cliente"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  />
                  <input
                    className={FIELD}
                    placeholder="Correo"
                    type="email"
                    aria-label="Correo del nuevo cliente"
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
              <div className="col-span-2">
                <label className={LABEL} htmlFor="quote-payment-plan">Plan de pagos</label>
                <select id="quote-payment-plan" className={FIELD} value={form.payment_plan}
                  onChange={(e) => changePlan(e.target.value as PaymentPlan)}>
                  <option value="fixed">Cuotas mensuales + abonos extra</option>
                  <option value="custom">Personalizado: valores y fechas variables</option>
                </select>
              </div>
              <div>
                <label className={LABEL}>Descuento</label>
                <input
                  type="number"
                  min={0}
                  className={FIELD}
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={LABEL}>Separación</label>
                <input
                  type="number"
                  min={0}
                  className={FIELD}
                  value={form.reservation_amount}
                  onChange={(e) => setForm({ ...form, reservation_amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={LABEL}>Cuota inicial (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  className={FIELD}
                  value={form.down_payment_percent}
                  onChange={(e) =>
                    setForm({ ...form, down_payment_percent: Number(e.target.value) })
                  }
                />
              </div>
              <div hidden={form.payment_plan === 'custom'}>
                <label className={LABEL}>Nº de cuotas</label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  className={FIELD}
                  value={form.installments_count}
                  onChange={(e) => setForm({ ...form, installments_count: Number(e.target.value) })}
                />
              </div>
              <div hidden={form.payment_plan === 'custom'}>
                <label className={LABEL}>Primera cuota</label>
                <input
                  type="date"
                  className={FIELD}
                  value={form.first_installment_date}
                  onChange={(e) => setForm({ ...form, first_installment_date: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL}>Vigencia (días)</label>
                <input
                  type="number"
                  min={1}
                  className={FIELD}
                  value={form.valid_days}
                  onChange={(e) => setForm({ ...form, valid_days: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="quote-date">Fecha de cotización / separación</label>
                <input id="quote-date" type="date" className={FIELD} value={form.quote_date}
                  onChange={(e) => setForm({ ...form, quote_date: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={LABEL} htmlFor="quote-balance-date">Fecha del saldo final (opcional)</label>
                <input id="quote-balance-date" type="date" className={FIELD} value={form.balance_due_date}
                  onChange={(e) => setForm({ ...form, balance_due_date: e.target.value })} />
                <p className="mt-1 text-xs text-slate-500">Si la dejas vacía, se calcula al finalizar el plan de la inicial.</p>
              </div>
            </div>

            {form.unit_id && <QuotePaymentPlanEditor mode={form.payment_plan}
              payments={form.payment_plan === 'custom' ? customPayments : extras}
              onChange={form.payment_plan === 'custom' ? setCustomPayments : setExtras}
              target={initialToDistribute} defaultDate={form.first_installment_date >= form.quote_date
                ? form.first_installment_date : form.quote_date} />}

            <div>
              <label className={LABEL}>Condiciones y observaciones del acuerdo</label>
              <textarea
                rows={2}
                placeholder="Ej.: abono con prima de diciembre, condiciones del saldo final…"
                className={FIELD}
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
              <p className="text-sm text-slate-400">{form.unit_id ? 'Calculando el plan de pagos…' : 'Elija una unidad para ver el plan de pagos.'}</p>
            )}

            {preview && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {(
                    [
                      ['Valor total', preview.total_value],
                      ['Cuota inicial', preview.down_payment_value],
                      [form.payment_plan === 'custom' ? 'Abonos extra pactados' : 'Cuota mensual base', form.payment_plan === 'custom'
                        ? preview.installments.filter((i) => i.concept === 'extra').reduce((sum, i) => sum + i.amount, 0)
                        : preview.installment_amount],
                      ['Saldo crédito', preview.balance_value],
                    ] as [string, number][]
                  ).map(([labelText, value]) => (
                    <div key={labelText} className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                      <p className="text-xs text-slate-500">{labelText}</p>
                      <p className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCOP(value)}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mb-3 text-xs text-emerald-700 dark:text-emerald-400">El plan cubre el valor total de la cotización.</p>

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
                        <tr
                          key={i.number}
                          className="border-t border-slate-100 dark:border-slate-800"
                        >
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
        </fieldset>

        {error && (
          <div className="mx-6 mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm px-4 py-3">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 z-20 bg-white dark:bg-slate-900 flex justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={saving}
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
