import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CrmLayout from './CrmLayout';

// ── Types ──────────────────────────────────────────────────────────────────
interface Unit {
  id: string;
  code: string;
  price: number;
  area: number;
  current_status?: { name: string; color_hex: string };
}

interface Lead {
  id: string;
  status: string;
  source?: string;
  created_at: string;
  ai_score?: number;
  assigned_agent?: { name: string };
}

interface AiInsight {
  tipo: 'oportunidad' | 'alerta' | 'tendencia';
  titulo: string;
  descripcion: string;
  accion: string;
}

interface AiResponse {
  resumen: string;
  insights: AiInsight[];
  recomendacion_principal: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado',
  negotiation: 'Negociación', won: 'Ganado', lost: 'Perdido',
};

const INSIGHT_STYLES: Record<string, { bg: string; icon: string; color: string }> = {
  oportunidad: { bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/20', icon: 'trending_up',  color: 'text-emerald-600' },
  alerta:      { bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20',                  icon: 'warning',      color: 'text-red-500'    },
  tendencia:   { bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/20',              icon: 'insights',     color: 'text-blue-600'   },
};

const UNIT_STATUS_COLORS: Record<string, string> = {
  'Disponible': '#22c55e',
  'Separado':   '#3b82f6',
  'En Proceso': '#f59e0b',
  'Vendido':    '#ef4444',
};

function fmtCOP(n: number) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000)     return `$${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000)         return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

// ── Component ──────────────────────────────────────────────────────────────
const ProjectAnalyticsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const token = localStorage.getItem('access_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [projectName, setProjectName] = useState('Proyecto');
  const [units, setUnits]   = useState<Unit[]>([]);
  const [leads, setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const [aiResult, setAiResult]   = useState<AiResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState('');

  // ── Fetch ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, unitsRes, leadsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { headers }),
        fetch(`/api/units?project_id=${projectId}`, { headers }),
        fetch(`/api/leads?project_id=${projectId}`, { headers }),
      ]);
      if (projRes.ok)  { const p = await projRes.json();  setProjectName(p.name); }
      if (unitsRes.ok) setUnits(await unitsRes.json());
      if (leadsRes.ok) setLeads(await leadsRes.json());
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived metrics ───────────────────────────────────────────────────
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  // Units by status
  const unitsByStatus: Record<string, number> = {};
  let soldValue = 0;
  units.forEach(u => {
    const name = u.current_status?.name ?? 'Sin estado';
    unitsByStatus[name] = (unitsByStatus[name] || 0) + 1;
    if (name === 'Vendido') soldValue += Number(u.price) || 0;
  });

  const available  = unitsByStatus['Disponible'] || 0;
  const separated  = unitsByStatus['Separado']   || 0;
  const inProcess  = unitsByStatus['En Proceso'] || 0;
  const sold       = unitsByStatus['Vendido']    || 0;
  const total      = units.length;
  const soldPct    = total > 0 ? Math.round((sold / total) * 100) : 0;
  const availPct   = total > 0 ? Math.round((available / total) * 100) : 0;

  // Pie data
  const pieData = Object.entries(unitsByStatus)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: UNIT_STATUS_COLORS[name] ?? '#94a3b8' }));

  // Revenue projection (sold + in-process at price)
  const pipelineValue = units
    .filter(u => ['Separado', 'En Proceso'].includes(u.current_status?.name ?? ''))
    .reduce((s, u) => s + Number(u.price), 0);

  // Price range distribution
  const priceRanges = [
    { label: '<200M',     min: 0,           max: 200_000_000 },
    { label: '200-250M',  min: 200_000_000, max: 250_000_000 },
    { label: '250-300M',  min: 250_000_000, max: 300_000_000 },
    { label: '>300M',     min: 300_000_000, max: Infinity     },
  ].map(r => ({
    ...r,
    count: units.filter(u => Number(u.price) >= r.min && Number(u.price) < r.max).length,
  }));

  // Leads metrics
  const totalLeads = leads.length;
  const newLeadsMonth = leads.filter(l => {
    const d = new Date(l.created_at);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
  const wonLeads  = leads.filter(l => l.status === 'won').length;
  const convRate  = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

  const leadsByStatus: Record<string, number> = {};
  leads.forEach(l => { leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1; });

  const leadsBySource: Record<string, number> = {};
  leads.forEach(l => { if (l.source) leadsBySource[l.source] = (leadsBySource[l.source] || 0) + 1; });

  // Monthly leads trend
  const monthlyLeads = Array.from({ length: 6 }, (_, i) => {
    const d    = new Date(year, month - 5 + i, 1);
    const next = new Date(year, month - 5 + i + 1, 1);
    return {
      name: MONTHS[d.getMonth()],
      leads: leads.filter(l => { const ld = new Date(l.created_at); return ld >= d && ld < next; }).length,
    };
  });

  // ── AI ────────────────────────────────────────────────────────────────
  const handleAI = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const res = await fetch('/api/analytics/project-insights', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName,
          summary: {
            totalUnits: total, available, separated, inProcess, sold,
            availPct, soldPct, soldValue, pipelineValue,
            totalLeads, newLeadsMonth, wonLeads, conversionRate: convRate,
            leadsByStatus, leadsBySource,
          },
        }),
      });
      if (res.ok) setAiResult(await res.json());
      else setAiError('Error al generar el análisis.');
    } catch {
      setAiError('No se pudo conectar con el servidor.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Sub-nav helper ────────────────────────────────────────────────────
  const SubNav = () => (
    <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 mb-6">
      {[
        { label: 'Resumen',     to: `/crm/projects/${projectId}` },
        { label: 'Unidades',    to: `/crm/projects/${projectId}/units` },
        { label: 'Documentos',  to: `/crm/projects/${projectId}/documents` },
        { label: 'Analítica',   to: `/crm/projects/${projectId}/analytics`, active: true },
      ].map(({ label, to, active }) => (
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
      ))}
    </div>
  );

  if (loading) {
    return (
      <CrmLayout title="Analítica del Proyecto" subtitle="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600" />
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout
      title={`Analítica — ${projectName}`}
      subtitle="Métricas detalladas del proyecto con análisis de inteligencia artificial"
      actions={
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold hover:bg-slate-50 transition-colors text-slate-700 dark:text-slate-200">
          <span className="material-symbols-outlined text-sm">refresh</span>
          Actualizar
        </button>
      }
    >
      <SubNav />

      <div className="space-y-6 max-w-7xl">

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Vendidas',      value: sold,              sub: `${soldPct}% del total`,        icon: 'check_circle',  color: 'text-emerald-600' },
            { label: 'Disponibles',   value: available,         sub: `${availPct}% del total`,        icon: 'apartment',     color: 'text-blue-600'    },
            { label: 'Valor Vendido', value: fmtCOP(soldValue), sub: 'COP acumulado',                 icon: 'payments',      color: 'text-violet-600'  },
            { label: 'Leads',         value: totalLeads,        sub: `${newLeadsMonth} este mes`,     icon: 'group',         color: 'text-amber-600'   },
          ].map((k, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <span className={`material-symbols-outlined text-2xl ${k.color}`}>{k.icon}</span>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{k.value}</p>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">{k.label}</p>
              <p className="text-[11px] text-slate-400">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left col ──────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Leads trend */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Tendencia de Leads</h3>
              <p className="text-xs text-slate-400 mb-5">Últimos 6 meses — {projectName}</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyLeads}>
                    <defs>
                      <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 12 }} />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2.5} fill="url(#aGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory status bars */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Estado del Inventario</h3>
                  <p className="text-xs text-slate-400">{total} unidades en total</p>
                </div>
                <Link to={`/crm/projects/${projectId}/units`} className="text-xs text-blue-600 font-bold hover:underline">
                  Ver unidades →
                </Link>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Disponibles',  count: available, color: '#22c55e' },
                  { label: 'Separadas',    count: separated, color: '#3b82f6' },
                  { label: 'En Proceso',   count: inProcess, color: '#f59e0b' },
                  { label: 'Vendidas',     count: sold,      color: '#ef4444' },
                ].map(({ label, count, color }) => {
                  const pctVal = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {count} <span className="text-slate-400 font-normal text-xs">({pctVal.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pctVal}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leads by status */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-900 dark:text-white">Pipeline de Leads</h3>
                <span className="text-xs text-slate-400">Conv. {convRate.toFixed(1)}%</span>
              </div>
              {Object.keys(leadsByStatus).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Sin leads para este proyecto aún</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(leadsByStatus).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                    const pctVal = totalLeads > 0 ? (count / totalLeads) * 100 : 0;
                    const colors: Record<string, string> = { new: '#94a3b8', contacted: '#3b82f6', qualified: '#10b981', negotiation: '#f59e0b', won: '#8b5cf6', lost: '#ef4444' };
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-24 shrink-0">{STATUS_LABELS[status] ?? status}</span>
                        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pctVal}%`, backgroundColor: colors[status] ?? '#94a3b8' }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* ── Right col ─────────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Pie chart */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Distribución</h3>
              {pieData.length > 0 ? (
                <>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2 mt-2">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                          <span className="text-slate-600 dark:text-slate-400">{d.name}</span>
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">Sin datos de unidades</p>
              )}
            </div>

            {/* Revenue */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Ingresos</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Valor Vendido</p>
                  <p className="text-2xl font-black text-emerald-600">{fmtCOP(soldValue)}</p>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">En Pipeline</p>
                  <p className="text-xl font-black text-blue-600">{fmtCOP(pipelineValue)}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{separated + inProcess} unidades Separadas + En Proceso</p>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Potencial Total</p>
                  <p className="text-lg font-black text-slate-700 dark:text-slate-200">
                    {fmtCOP(soldValue + pipelineValue + units.filter(u => u.current_status?.name === 'Disponible').reduce((s, u) => s + Number(u.price), 0))}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Si se venden todas las unidades</p>
                </div>
              </div>
            </div>

            {/* ── AI Panel ───────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 border border-violet-200 dark:border-violet-500/20 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-violet-600">auto_awesome</span>
                <h3 className="font-bold text-slate-900 dark:text-white">Análisis IA</h3>
              </div>

              {!aiResult && !aiLoading && (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Claude analiza los datos reales de {projectName} y genera recomendaciones específicas.
                  </p>
                  <button
                    onClick={handleAI}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/20"
                  >
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    Analizar proyecto
                  </button>
                  {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
                </>
              )}

              {aiLoading && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-600" />
                  <p className="text-xs text-slate-400">Analizando {projectName}...</p>
                </div>
              )}

              {aiResult && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{aiResult.resumen}</p>

                  {aiResult.insights.map((ins, i) => {
                    const s = INSIGHT_STYLES[ins.tipo] ?? INSIGHT_STYLES.tendencia;
                    return (
                      <div key={i} className={`p-3 rounded-lg border ${s.bg}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`material-symbols-outlined text-[16px] ${s.color}`}>{s.icon}</span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{ins.titulo}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">{ins.descripcion}</p>
                        <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1">→ {ins.accion}</p>
                      </div>
                    );
                  })}

                  <div className="bg-violet-100/60 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-500/20 p-3 rounded-lg">
                    <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Recomendación Principal</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">{aiResult.recomendacion_principal}</p>
                  </div>

                  <button onClick={handleAI} className="w-full text-xs text-violet-600 hover:text-violet-700 font-bold flex items-center justify-center gap-1 py-1">
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    Regenerar
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default ProjectAnalyticsPage;
