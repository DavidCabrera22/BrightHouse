import { useCallback, useEffect, useState } from 'react';
import {
  authHeaders,
  CONCEPT_LABEL,
  formatCOP,
  formatDate,
  STATUS_CLASS,
  STATUS_LABEL,
} from './quoteTypes';
import type { Quote, QuoteStatus } from './quoteTypes';

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
              <span
                className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_CLASS[quote.status]}`}
              >
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
              {(
                [
                  ['Valor total', quote.total_value],
                  [`Inicial (${Number(quote.down_payment_percent)}%)`, quote.down_payment_value],
                  ['Cuota mensual', quote.installment_amount],
                  ['Saldo crédito', quote.balance_value],
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
