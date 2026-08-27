import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import CrmLayout from './CrmLayout';
import ProjectTabs from './ProjectTabs';
import QuoteFormModal from './QuoteFormModal';
import QuoteDetailModal from './QuoteDetailModal';
import { authHeaders, formatCOP, formatDate, STATUS_CLASS, STATUS_LABEL } from './quoteTypes';
import type { Quote, QuoteStatus } from './quoteTypes';

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
        <QuoteDetailModal quoteId={detailId} onClose={() => setDetailId(null)} onChanged={load} />
      )}
    </CrmLayout>
  );
}
