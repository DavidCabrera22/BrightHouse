import { useEffect, useMemo, useState } from 'react';
import { authHeaders, CONCEPT_LABEL, formatCOP, formatDate } from './quoteTypes';
import type { QuoteCalculation } from './quoteTypes';

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
        if (!res.ok) {
          throw new Error(
            Array.isArray(body.message) ? body.message[0] : body.message ?? 'No se pudo crear el cliente',
          );
        }
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

  const canSave = !!form.unit_id && (!!form.client_id || !!newClient?.name) && !!preview && !saving;

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
              <label className={LABEL}>Unidad</label>
              <select
                className={FIELD}
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
                  <input
                    className={FIELD}
                    placeholder="Nombre completo"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  />
                  <input
                    className={FIELD}
                    placeholder="Cédula"
                    value={newClient.document_number}
                    onChange={(e) =>
                      setNewClient({ ...newClient, document_number: e.target.value })
                    }
                  />
                  <input
                    className={FIELD}
                    placeholder="Teléfono"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  />
                  <input
                    className={FIELD}
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
                  className={FIELD}
                  value={form.down_payment_percent}
                  onChange={(e) =>
                    setForm({ ...form, down_payment_percent: Number(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className={LABEL}>Nº de cuotas</label>
                <input
                  type="number"
                  min={1}
                  className={FIELD}
                  value={form.installments_count}
                  onChange={(e) => setForm({ ...form, installments_count: Number(e.target.value) })}
                />
              </div>
              <div>
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
            </div>

            <div>
              <label className={LABEL}>Notas</label>
              <textarea
                rows={2}
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
              <p className="text-sm text-slate-400">Elija una unidad para ver el plan de pagos.</p>
            )}

            {preview && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {(
                    [
                      ['Valor total', preview.total_value],
                      ['Cuota inicial', preview.down_payment_value],
                      ['Cuota mensual', preview.installment_amount],
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
