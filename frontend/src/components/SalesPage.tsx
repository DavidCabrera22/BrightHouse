import React, { useCallback, useEffect, useState } from 'react';
import CrmLayout from './CrmLayout';
import SaleFormModal from './SaleFormModal';

interface Sale {
  id: string;
  sale_value: number | string;
  sale_date: string;
  status: string;
  unit?: { code: string; tower?: string; floor?: number; project?: { name: string } };
  client?: { name: string; document_number: string };
  agent?: { name: string };
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

const cop = (v: number | string) =>
  '$' + Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 });

const SalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchSales = useCallback(async () => {
    const res = await fetch('/api/sales', { headers: authHeaders() });
    if (res.ok) setSales(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const total = sales.reduce((sum, s) => sum + Number(s.sale_value), 0);

  return (
    <CrmLayout title="Ventas">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {sales.length} venta{sales.length === 1 ? '' : 's'} registrada
              {sales.length === 1 ? '' : 's'} · {cop(total)}
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-crm-primary text-white font-semibold hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva venta
          </button>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-slate-400">Cargando…</p>
          ) : sales.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">
                sell
              </span>
              <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">
                Todavía no hay ventas registradas
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Puedes cerrar una desde aquí o desde el botón de venta en la lista de leads.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/40 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-4">Comprador</th>
                    <th className="px-6 py-4">Unidad</th>
                    <th className="px-6 py-4">Proyecto</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4">Asesora</th>
                    <th className="px-6 py-4">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {sales.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {s.client?.name ?? '—'}
                        </p>
                        <p className="text-xs text-slate-400">{s.client?.document_number}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {s.unit?.code ?? '—'}
                        {s.unit?.tower ? ` · Torre ${s.unit.tower}` : ''}
                        {s.unit?.floor != null ? ` · Piso ${s.unit.floor}` : ''}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {s.unit?.project?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {cop(s.sale_value)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                        {s.agent?.name ?? '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {new Date(s.sale_date).toLocaleDateString('es', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <SaleFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSaved={fetchSales}
      />
    </CrmLayout>
  );
};

export default SalesPage;
