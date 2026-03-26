import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import CrmLayout from './CrmLayout';

// ── Types ──────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  status: string;
  source: string;
  created_at: string;
  ai_score?: number;
  assigned_agent?: { name: string };
  potential_value?: number;
}

interface Unit {
  id: string;
  current_status?: { name: string; color_hex: string };
  price: number;
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

const STATUS_COLORS: Record<string, string> = {
  new: '#94a3b8', contacted: '#3b82f6', qualified: '#10b981',
  negotiation: '#f59e0b', won: '#8b5cf6', lost: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo', contacted: 'Contactado', qualified: 'Calificado',
  negotiation: 'Negociación', won: 'Ganado', lost: 'Perdido',
};

const INSIGHT_STYLES: Record<string, { bg: string; icon: string; color: string }> = {
  oportunidad: { bg: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-500/20', icon: 'trending_up', color: 'text-emerald-600' },
  alerta:      { bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20',          icon: 'warning',      color: 'text-red-500' },
  tendencia:   { bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-500/20',      icon: 'insights',     color: 'text-blue-600' },
};

function pct(a: number, b: number) {
  if (b === 0) return a > 0 ? 100 : 0;
  return Math.round(((a - b) / b) * 100);
}

// ── Component ──────────────────────────────────────────────────────────────
const AnalyticsPage: React.FC = () => {
  const token = localStorage.getItem('access_token');
  const headers = { Authorization: `Bearer ${token}` };

  const [leads, setLeads]   = useState<Lead[]>([]);
  const [units, setUnits]   = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // AI state
  const [aiResult, setAiResult]     = useState<AiResponse | null>(null);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiError, setAiError]       = useState('');

  // ── Fetch data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes, unitsRes] = await Promise.all([
        fetch('/api/leads',  { headers }),
        fetch('/api/units',  { headers }),
      ]);
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (unitsRes.ok) setUnits(await unitsRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived metrics ───────────────────────────────────────────────────
  const now   = new Date();
  const month = now.getMonth();
  const year  = now.getFullYear();

  const newThisMonth  = leads.filter(l => { const d = new Date(l.created_at); return d.getMonth() === month && d.getFullYear() === year; }).length;
  const lastMonthStart = new Date(year, month - 1, 1);
  const lastMonthEnd   = new Date(year, month, 1);
  const newLastMonth   = leads.filter(l => { const d = new Date(l.created_at); return d >= lastMonthStart && d < lastMonthEnd; }).length;
  const leadsGrowth    = pct(newThisMonth, newLastMonth);

  const won   = leads.filter(l => l.status === 'won').length;
  const total = leads.length;
  const conversionRate = total > 0 ? (won / total) * 100 : 0;

  const highScore = leads.filter(l => l.ai_score && l.ai_score >= 70).length;

  // Units by status
  const unitsByStatus: Record<string, number> = {};
  units.forEach(u => {
    const name = u.current_status?.name ?? 'Sin estado';
    unitsByStatus[name] = (unitsByStatus[name] || 0) + 1;
  });

  // Leads by status (for donut-style bar)
  const leadsByStatus: Record<string, number> = {};
  leads.forEach(l => { leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1; });

  const statusBarData = Object.entries(leadsByStatus).map(([key, val]) => ({
    name: STATUS_LABELS[key] ?? key,
    value: val,
    color: STATUS_COLORS[key] ?? '#94a3b8',
  })).sort((a, b) => b.value - a.value);

  // Leads by source
  const leadsBySource: Record<string, number> = {};
  leads.forEach(l => { if (l.source) leadsBySource[l.source] = (leadsBySource[l.source] || 0) + 1; });
  const topSources = Object.entries(leadsBySource).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Monthly leads trend (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 5 + i, 1);
    const next = new Date(year, month - 5 + i + 1, 1);
    const count = leads.filter(l => { const ld = new Date(l.created_at); return ld >= d && ld < next; }).length;
    return { name: MONTHS[d.getMonth()], leads: count };
  });

  // Agent leaderboard
  const agentMap: Record<string, { leads: number; won: number }> = {};
  leads.forEach(l => {
    const name = l.assigned_agent?.name ?? 'Sin asignar';
    if (!agentMap[name]) agentMap[name] = { leads: 0, won: 0 };
    agentMap[name].leads++;
    if (l.status === 'won') agentMap[name].won++;
  });
  const agentStats = Object.entries(agentMap)
    .map(([name, s]) => ({ name, ...s, conv: s.leads > 0 ? (s.won / s.leads) * 100 : 0 }))
    .sort((a, b) => b.won - a.won).slice(0, 5);

  // ── AI analysis ───────────────────────────────────────────────────────
  const handleGenerateAI = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResult(null);
    try {
      const summary = {
        totalLeads: total,
        newLeadsThisMonth: newThisMonth,
        leadsByStatus,
        leadsBySource,
        totalUnits: units.length,
        unitsByStatus,
        conversionRate,
        topSources: topSources.map(([s]) => s),
      };
      const res = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(summary),
      });
      if (res.ok) {
        setAiResult(await res.json());
      } else {
        setAiError('Error al generar el análisis. Intenta de nuevo.');
      }
    } catch {
      setAiError('No se pudo conectar con el servidor.');
    } finally {
      setAiLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <CrmLayout title="Analítica" subtitle="Cargando datos...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600" />
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout
      title="Analítica"
      subtitle="Métricas reales del negocio con análisis de inteligencia artificial"
      actions={
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Actualizar
        </button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* ── KPI Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Leads', value: total, sub: `+${newThisMonth} este mes`, icon: 'group', color: 'text-blue-600', badge: leadsGrowth !== 0 ? `${leadsGrowth > 0 ? '+' : ''}${leadsGrowth}%` : null, badgeOk: leadsGrowth >= 0 },
            { label: 'Tasa de Conv.', value: `${conversionRate.toFixed(1)}%`, sub: `${won} ganados`, icon: 'check_circle', color: 'text-emerald-600', badge: null, badgeOk: true },
            { label: 'Alta Puntuación', value: highScore, sub: 'Score IA ≥ 70', icon: 'auto_awesome', color: 'text-violet-600', badge: null, badgeOk: true },
            { label: 'Unidades Disp.', value: unitsByStatus['Disponible'] ?? 0, sub: `de ${units.length} totales`, icon: 'apartment', color: 'text-amber-600', badge: null, badgeOk: true },
          ].map((kpi, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <span className={`material-symbols-outlined text-2xl ${kpi.color}`}>{kpi.icon}</span>
                {kpi.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.badgeOk ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {kpi.badge}
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{kpi.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left (2 cols) ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Monthly trend */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Tendencia de Leads</h3>
              <p className="text-xs text-slate-400 mb-5">Últimos 6 meses</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="leads" name="Leads" stroke="#3b82f6" strokeWidth={2.5} fill="url(#leadGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Status breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-5">Leads por Estado</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBarData} layout="vertical">
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={90} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 12 }} />
                    <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]}>
                      {statusBarData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Agent leaderboard */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">Rendimiento por Asesor</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Asesor</th>
                    <th className="px-6 py-3 text-center">Leads</th>
                    <th className="px-6 py-3 text-center">Ganados</th>
                    <th className="px-6 py-3 text-left">Conversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {agentStats.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs">Sin datos aún</td></tr>
                  ) : agentStats.map((a, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600">
                            {a.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center text-slate-600 dark:text-slate-400">{a.leads}</td>
                      <td className="px-6 py-3 text-center font-bold text-emerald-600">{a.won}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(a.conv, 100)}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 w-10 text-right">{a.conv.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right (1 col) ─────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Units by status */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Inventario de Unidades</h3>
              <div className="space-y-3">
                {[
                  { label: 'Disponibles',  key: 'Disponible',  color: '#22c55e' },
                  { label: 'Separadas',    key: 'Separado',    color: '#3b82f6' },
                  { label: 'En Proceso',   key: 'En Proceso',  color: '#f59e0b' },
                  { label: 'Vendidas',     key: 'Vendido',     color: '#ef4444' },
                ].map(({ label, key, color }) => {
                  const count = unitsByStatus[key] ?? 0;
                  const pctVal = units.length > 0 ? (count / units.length) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{label}</span>
                        <span className="font-bold text-slate-900 dark:text-white">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top sources */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Fuentes de Leads</h3>
              {topSources.length === 0 ? (
                <p className="text-xs text-slate-400">Sin datos de fuente aún</p>
              ) : (
                <div className="space-y-3">
                  {topSources.map(([source, count], i) => {
                    const pctVal = total > 0 ? (count / total) * 100 : 0;
                    const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'];
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600 dark:text-slate-400 capitalize">{source}</span>
                          <span className="font-bold text-slate-900 dark:text-white">{count} <span className="text-slate-400 font-normal text-xs">({pctVal.toFixed(0)}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pctVal}%`, backgroundColor: colors[i] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── AI Insights ──────────────────────────────────────────── */}
            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10 border border-violet-200 dark:border-violet-500/20 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-violet-600">auto_awesome</span>
                <h3 className="font-bold text-slate-900 dark:text-white">Análisis con IA</h3>
              </div>

              {!aiResult && !aiLoading && (
                <>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Claude analiza tus datos reales y genera recomendaciones accionables para esta semana.
                  </p>
                  <button
                    onClick={handleGenerateAI}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-2.5 rounded-xl transition-all shadow-lg shadow-violet-600/20"
                  >
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    Generar análisis
                  </button>
                  {aiError && <p className="text-xs text-red-500 mt-2">{aiError}</p>}
                </>
              )}

              {aiLoading && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-violet-600" />
                  <p className="text-xs text-slate-400">Claude está analizando los datos...</p>
                </div>
              )}

              {aiResult && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{aiResult.resumen}</p>

                  {aiResult.insights.map((ins, i) => {
                    const style = INSIGHT_STYLES[ins.tipo] ?? INSIGHT_STYLES.tendencia;
                    return (
                      <div key={i} className={`p-3 rounded-lg border ${style.bg}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`material-symbols-outlined text-[16px] ${style.color}`}>{style.icon}</span>
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

                  <button
                    onClick={handleGenerateAI}
                    className="w-full text-xs text-violet-600 hover:text-violet-700 font-bold flex items-center justify-center gap-1 py-1"
                  >
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

export default AnalyticsPage;
