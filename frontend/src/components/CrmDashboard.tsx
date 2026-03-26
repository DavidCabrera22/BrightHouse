import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CrmLayout from './CrmLayout';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';

interface Lead {
  id: string;
  name: string;
  project_id: string;
  status: string;
  source: string;
  created_at: string;
  phone?: string;
  project?: { name: string };
}

interface Sale {
  id: string;
  sale_value: number;
  status: string;
  sale_date: string;
}

const STATUS_STYLES: Record<string, string> = {
  new:         'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  contacted:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  qualified:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  negotiation: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  won:         'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  lost:        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pending:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado',
  lost: 'Perdido', won: 'Ganado', pending: 'Pendiente', negotiation: 'Negociación',
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Returns count of items in a date range */
function countInRange(items: { date: Date }[], from: Date, to: Date) {
  return items.filter(i => i.date >= from && i.date < to).length;
}

/** Percentage change, safe division */
function pct(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

const CrmDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<'6m' | '12m'>('6m');

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    Promise.all([
      fetch('/api/leads', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/sales', { headers }).then(r => r.ok ? r.json() : []),
    ])
      .then(([leadsData, salesData]) => {
        leadsData.sort((a: Lead, b: Lead) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        salesData.sort((a: Sale, b: Sale) =>
          new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime()
        );
        setLeads(leadsData);
        setSales(salesData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ─── Metrics ────────────────────────────────────────────────────────────────
  const now = new Date();
  const d7  = new Date(now.getTime() - 7  * 86400_000);
  const d14 = new Date(now.getTime() - 14 * 86400_000);
  const d30 = new Date(now.getTime() - 30 * 86400_000);
  const d60 = new Date(now.getTime() - 60 * 86400_000);

  const leadsWithDate = leads.map(l => ({ ...l, date: new Date(l.created_at) }));
  const salesWithDate = sales.map(s => ({ ...s, date: new Date(s.sale_date) }));

  const newLeadsThisWeek = countInRange(leadsWithDate, d7, now);
  const newLeadsLastWeek = countInRange(leadsWithDate, d14, d7);
  const newLeadsPct      = pct(newLeadsThisWeek, newLeadsLastWeek);

  const qualifiedCount     = leads.filter(l => ['qualified', 'won', 'negotiation'].includes(l.status)).length;
  const qualifiedThisMonth = leads.filter(l => ['qualified', 'won', 'negotiation'].includes(l.status) && new Date(l.created_at) >= d30).length;
  const qualifiedLastMonth = leads.filter(l => ['qualified', 'won', 'negotiation'].includes(l.status) && new Date(l.created_at) >= d60 && new Date(l.created_at) < d30).length;
  const qualifiedPct       = pct(qualifiedThisMonth, qualifiedLastMonth);

  const wonLeads       = leads.filter(l => l.status === 'won').length;
  const convRate       = leads.length > 0 ? ((wonLeads / leads.length) * 100) : 0;
  const wonThisMonth   = leads.filter(l => l.status === 'won' && new Date(l.created_at) >= d30).length;
  const wonLastMonth   = leads.filter(l => l.status === 'won' && new Date(l.created_at) >= d60 && new Date(l.created_at) < d30).length;
  const convPct        = pct(wonThisMonth, wonLastMonth);

  const totalSalesValue    = sales.reduce((s, sale) => s + Number(sale.sale_value), 0);
  const salesThisMonth     = salesWithDate.filter(s => s.date >= d30).reduce((s, sale) => s + Number(sale.sale_value), 0);
  const salesLastMonth     = salesWithDate.filter(s => s.date >= d60 && s.date < d30).reduce((s, sale) => s + Number(sale.sale_value), 0);
  const salesPct           = pct(salesThisMonth, salesLastMonth);

  // ─── Chart data ─────────────────────────────────────────────────────────────
  const getChartData = () => {
    const months = chartPeriod === '6m' ? 6 : 12;
    const data: { name: string; leads: number; ventas: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({ name: MONTHS[d.getMonth()], leads: 0, ventas: 0 });
    }
    leadsWithDate.forEach(l => {
      const key = MONTHS[l.date.getMonth()];
      const entry = data.find(d => d.name === key);
      if (entry) entry.leads++;
    });
    salesWithDate.forEach(s => {
      const key = MONTHS[s.date.getMonth()];
      const entry = data.find(d => d.name === key);
      if (entry) entry.ventas++;
    });
    return data;
  };

  // ─── Status breakdown ───────────────────────────────────────────────────────
  const statusBreakdown = Object.entries(
    leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1]).slice(0, 4);

  // ─── Pending follow-ups (contacted > 3 days ago, not advanced) ───────────────
  const d3 = new Date(now.getTime() - 3 * 86400_000);
  const pendingFollowUp = leads.filter(l =>
    l.status === 'contacted' && new Date(l.created_at) < d3
  ).length;

  const chartData = getChartData();

  const GrowthBadge = ({ pct: p }: { pct: number }) => (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
      p >= 0
        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400'
        : 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
    }`}>
      <span className="material-symbols-outlined text-[13px]">{p >= 0 ? 'trending_up' : 'trending_down'}</span>
      {p >= 0 ? '+' : ''}{p}%
    </span>
  );

  if (loading) {
    return (
      <CrmLayout title="Resumen del Panel">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-100 dark:border-slate-800 h-32">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-3"></div>
              <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout
      title="Resumen del Panel"
      actions={
        <button
          onClick={() => navigate('/crm/leads')}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-5 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nuevo Lead
        </button>
      }
    >
      <div className="flex flex-col gap-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Nuevos Leads</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{newLeadsThisWeek}</h3>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">group_add</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <GrowthBadge pct={newLeadsPct} />
              <span className="text-slate-400">vs semana anterior</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Calificados</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{qualifiedCount}</h3>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">auto_awesome</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <GrowthBadge pct={qualifiedPct} />
              <span className="text-slate-400">vs mes anterior</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Tasa de Conversión</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{convRate.toFixed(1)}%</h3>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">swap_horiz</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <GrowthBadge pct={convPct} />
              <span className="text-slate-400">vs mes anterior</span>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Valor en Ventas</p>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                  ${totalSalesValue >= 1_000_000
                    ? (totalSalesValue / 1_000_000).toFixed(1) + 'M'
                    : totalSalesValue.toLocaleString()}
                </h3>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">attach_money</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <GrowthBadge pct={salesPct} />
              <span className="text-slate-400">vs mes anterior</span>
            </div>
          </div>
        </div>

        {/* Chart + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Rendimiento General</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Leads captados vs. Ventas cerradas</p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setChartPeriod('6m')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    chartPeriod === '6m'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  6 Meses
                </button>
                <button
                  onClick={() => setChartPeriod('12m')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    chartPeriod === '12m'
                      ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  12 Meses
                </button>
              </div>
            </div>

            {leads.length === 0 && sales.length === 0 ? (
              <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 gap-2">
                <span className="material-symbols-outlined text-4xl">bar_chart</span>
                <p className="text-sm">Sin datos aún. Los datos aparecerán cuando haya leads y ventas.</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-700/50" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={8} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '10px', color: '#fff', fontSize: 12 }}
                      labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
                    />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLeads)" />
                    <Area type="monotone" dataKey="ventas" name="Ventas" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVentas)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Chart Legend */}
            <div className="flex gap-5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-blue-600"></div> Leads
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Ventas
              </div>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">psychology</span>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Resumen Rápido</h3>
            </div>

            <div className="flex-1 flex flex-col gap-4">
              {/* Status breakdown */}
              {statusBreakdown.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                    Leads por estado
                  </p>
                  <div className="space-y-2">
                    {statusBreakdown.map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABELS[status] ?? status}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.round((count / leads.length) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-6 text-right">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending follow-ups alert */}
              {pendingFollowUp > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-[18px] mt-0.5">schedule</span>
                    <div>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400">Seguimientos pendientes</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                        {pendingFollowUp} lead{pendingFollowUp > 1 ? 's' : ''} contactado{pendingFollowUp > 1 ? 's' : ''} sin avance hace +3 días.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Latest qualified lead */}
              {leads.filter(l => l.status === 'qualified').slice(0, 1).map(lead => (
                <div key={lead.id} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[18px] mt-0.5">star</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Lead calificado</p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5 truncate">{lead.name}</p>
                      {lead.phone && (
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline mt-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">chat</span> Contactar
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Latest sale */}
              {sales.slice(0, 1).map(sale => (
                <div key={sale.id} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">paid</span>
                    <div>
                      <p className="text-xs font-bold text-blue-700 dark:text-blue-400">Última venta</p>
                      <p className="text-xs text-blue-600 dark:text-blue-500 mt-0.5">
                        ${Number(sale.sale_value).toLocaleString()} · {new Date(sale.sale_date).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {leads.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-600 italic text-center py-4">
                  Sin datos disponibles aún.
                </p>
              )}
            </div>

            <button
              onClick={() => navigate('/crm/leads')}
              className="w-full mt-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors"
            >
              Ver todos los leads →
            </button>
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Leads Recientes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''} en total</p>
            </div>
            <button
              onClick={() => navigate('/crm/leads')}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-semibold transition-colors flex items-center gap-1"
            >
              Ver todos <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 block mb-2">person_search</span>
              <p className="text-slate-500 dark:text-slate-400 text-sm">No hay leads aún.</p>
              <button
                onClick={() => navigate('/crm/leads')}
                className="mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Crear primer lead →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-4">Nombre</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Proyecto</th>
                    <th className="px-6 py-4">Fuente</th>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {leads.slice(0, 7).map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">{lead.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[lead.status] ?? 'bg-slate-100 text-slate-700'}`}>
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-sm">
                        {lead.project?.name || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 capitalize text-sm">{lead.source || '—'}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-500 text-sm">
                        {new Date(lead.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate('/crm/leads')}
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Ver lead"
                        >
                          <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </CrmLayout>
  );
};

export default CrmDashboard;
