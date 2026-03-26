import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CrmLayout from './CrmLayout';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  name: string;
  phone?: string;
  project_id: string;
  status: string;
  source?: string;
  created_at: string;
  project?: { name: string };
  assigned_agent?: { id: string; name: string };
  potential_value?: number;
  ai_score?: number;
  priority?: string;
  interested_in?: string;
}

interface Project { id: string; name: string; }
interface Agent   { id: string; name: string; }

// ─── Pipeline columns (match backend status strings) ──────────────────────────
const COLUMNS = [
  { id: 'new',         label: 'Nuevo',          color: 'blue',    icon: 'person_add' },
  { id: 'contacted',   label: 'Contactado',     color: 'indigo',  icon: 'call' },
  { id: 'qualified',   label: 'Calificado',     color: 'teal',    icon: 'verified' },
  { id: 'pending',     label: 'Visita Agendada',color: 'orange',  icon: 'event' },
  { id: 'negotiation', label: 'Negociación',    color: 'yellow',  icon: 'handshake' },
  { id: 'won',         label: 'Ganado',         color: 'emerald', icon: 'emoji_events' },
  { id: 'lost',        label: 'Perdido',        color: 'red',     icon: 'cancel' },
];

const COL_STYLES: Record<string, { border: string; bar: string; badge: string; dropBg: string }> = {
  blue:    { border: 'border-blue-500',    bar: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',    dropBg: 'bg-blue-50/60 dark:bg-blue-900/10' },
  indigo:  { border: 'border-indigo-500',  bar: 'bg-indigo-500',  badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',  dropBg: 'bg-indigo-50/60 dark:bg-indigo-900/10' },
  teal:    { border: 'border-teal-500',    bar: 'bg-teal-500',    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',    dropBg: 'bg-teal-50/60 dark:bg-teal-900/10' },
  orange:  { border: 'border-orange-500',  bar: 'bg-orange-500',  badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',  dropBg: 'bg-orange-50/60 dark:bg-orange-900/10' },
  yellow:  { border: 'border-yellow-500',  bar: 'bg-yellow-500',  badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',  dropBg: 'bg-yellow-50/60 dark:bg-yellow-900/10' },
  emerald: { border: 'border-emerald-500', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dropBg: 'bg-emerald-50/60 dark:bg-emerald-900/10' },
  red:     { border: 'border-red-400',     bar: 'bg-red-400',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',     dropBg: 'bg-red-50/60 dark:bg-red-900/10' },
};

const SOURCE_ICONS: Record<string, string> = {
  whatsapp: 'chat', web: 'language', referral: 'group',
  ads: 'campaign', event: 'event', default: 'help_outline',
};

function daysAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function fmtValue(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
const PipelinePage: React.FC = () => {
  const navigate = useNavigate();

  const [leads, setLeads]         = useState<Lead[]>([]);
  const [projects, setProjects]   = useState<Project[]>([]);
  const [agents, setAgents]       = useState<Agent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Filters
  const [projectFilter, setProjectFilter] = useState('all');
  const [agentFilter, setAgentFilter]     = useState('all');

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    'Content-Type': 'application/json',
  });

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    const res = await fetch('/api/leads', { headers: authHeaders() });
    if (res.ok) setLeads(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    fetch('/api/projects', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : []).then(setProjects);
    fetch('/api/users', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setAgents(data.filter((u: any) => u.role?.name === 'Agent')));
  }, []);

  // ─── Drag & drop ────────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    const prev = lead.status;
    setLeads(ls => ls.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    setUpdatingId(leadId);

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      // Update local score from response
      const updated: Lead = await res.json();
      setLeads(ls => ls.map(l => l.id === leadId ? { ...l, ai_score: updated.ai_score } : l));
    } catch {
      setLeads(ls => ls.map(l => l.id === leadId ? { ...l, status: prev } : l));
    } finally {
      setUpdatingId(null);
    }
  };

  // ─── Filter ─────────────────────────────────────────────────────────────────
  const visibleLeads = leads.filter(l => {
    const mp = projectFilter === 'all' || l.project_id === projectFilter;
    const ma = agentFilter   === 'all' || l.assigned_agent?.id === agentFilter;
    return mp && ma;
  });

  const byStatus = (status: string) => visibleLeads.filter(l => l.status === status);

  // ─── Metrics ────────────────────────────────────────────────────────────────
  const activeLeads     = leads.filter(l => l.status !== 'won' && l.status !== 'lost');
  const wonLeads        = leads.filter(l => l.status === 'won');
  const lostLeads       = leads.filter(l => l.status === 'lost');
  const totalClosed     = wonLeads.length + lostLeads.length;
  const convRate        = totalClosed > 0 ? ((wonLeads.length / totalClosed) * 100).toFixed(1) : '0.0';
  const pipelineValue   = activeLeads.reduce((s, l) => s + Number(l.potential_value || 0), 0);

  // AI forecast: sum of potential_value for qualified + negotiation (high probability)
  const forecastValue   = leads
    .filter(l => ['qualified', 'negotiation'].includes(l.status))
    .reduce((s, l) => s + Number(l.potential_value || 0), 0);

  // Avg days to close (won leads, days from created_at — approximation)
  const avgCloseDays = wonLeads.length > 0
    ? Math.round(wonLeads.reduce((s, l) => s + daysAgo(l.created_at), 0) / wonLeads.length)
    : null;

  // New leads this week
  const d7 = new Date(Date.now() - 7 * 86_400_000);
  const newThisWeek = leads.filter(l => new Date(l.created_at) >= d7).length;

  // Max column value (for bar width %)
  const maxColValue = Math.max(
    1,
    ...COLUMNS.map(c => byStatus(c.id).reduce((s, l) => s + Number(l.potential_value || 0), 0))
  );

  if (loading) {
    return (
      <CrmLayout title="Pipeline de Ventas">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout
      title="Pipeline de Ventas"
      subtitle={`${activeLeads.length} oportunidades activas`}
      actions={
        <div className="flex items-center gap-3">
          {/* Project filter */}
          <div className="relative hidden md:block">
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              <option value="all">Todos los proyectos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">expand_more</span>
          </div>

          {/* Agent filter */}
          {agents.length > 0 && (
            <div className="relative hidden md:block">
              <select
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value)}
                className="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="all">Todos los asesores</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">expand_more</span>
            </div>
          )}

          <button
            onClick={() => navigate('/crm/leads')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nueva oportunidad
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-5 h-full">

        {/* ── Metrics ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Valor pipeline</p>
              <span className="bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-md text-emerald-600">
                <span className="material-symbols-outlined text-[18px]">paid</span>
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{fmtValue(pipelineValue)}</h3>
            <p className="text-xs text-slate-400 mt-1">{activeLeads.length} oportunidades activas</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Nuevos / semana</p>
              <span className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md text-blue-600">
                <span className="material-symbols-outlined text-[18px]">groups</span>
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{newThisWeek}</h3>
            <p className="text-xs text-slate-400 mt-1">{leads.length} leads en total</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Tasa de cierre</p>
              <span className="bg-purple-50 dark:bg-purple-900/30 p-1.5 rounded-md text-purple-600">
                <span className="material-symbols-outlined text-[18px]">filter_alt</span>
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{convRate}%</h3>
            <p className="text-xs text-slate-400 mt-1">{wonLeads.length} ganados · {lostLeads.length} perdidos</p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Días prom. cierre</p>
              <span className="bg-orange-50 dark:bg-orange-900/30 p-1.5 rounded-md text-orange-600">
                <span className="material-symbols-outlined text-[18px]">timer</span>
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {avgCloseDays !== null ? `${avgCloseDays}d` : '—'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">{avgCloseDays !== null ? 'promedio real' : 'sin cierres aún'}</p>
          </div>

          {/* AI Forecast card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-4 shadow-lg border border-slate-700 text-white relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-blue-300 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">auto_awesome</span> Pronóstico IA
              </p>
            </div>
            <h3 className="text-2xl font-bold relative z-10">{fmtValue(forecastValue)}</h3>
            <p className="text-blue-300/70 text-xs mt-1 relative z-10">
              {leads.filter(l => ['qualified', 'negotiation'].includes(l.status)).length} leads en etapa caliente
            </p>
          </div>
        </div>

        {/* ── Kanban ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-x-auto pb-2">
          <div className="flex gap-3 h-full min-w-max">
            {COLUMNS.map(col => {
              const colLeads = byStatus(col.id);
              const colValue = colLeads.reduce((s, l) => s + Number(l.potential_value || 0), 0);
              const barPct   = Math.round((colValue / maxColValue) * 100);
              const styles   = COL_STYLES[col.color];
              const isOver   = dragOverCol === col.id;

              return (
                <div
                  key={col.id}
                  className="w-72 flex flex-col shrink-0"
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, col.id)}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                        {col.label}
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                        {colLeads.length}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {colValue > 0 ? fmtValue(colValue) : ''}
                    </span>
                  </div>

                  {/* Value progress bar */}
                  <div className={`bg-white dark:bg-slate-800 rounded-t-xl border-x border-t border-slate-100 dark:border-slate-700 px-3 pt-2.5 pb-2 border-b-[3px] ${styles.border}`}>
                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${styles.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Cards container */}
                  <div className={`rounded-b-xl border-x border-b border-slate-100 dark:border-slate-700 p-2 flex-1 overflow-y-auto space-y-2 min-h-[300px] transition-all duration-150 ${
                    isOver
                      ? `${styles.dropBg} border-dashed ring-2 ring-inset ring-offset-0 ring-blue-300 dark:ring-blue-700`
                      : 'bg-slate-50/50 dark:bg-slate-800/20'
                  }`}>
                    {colLeads.map(lead => {
                      const days = daysAgo(lead.created_at);
                      const score = lead.ai_score ?? 0;
                      const scoreColor = score >= 75 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : score >= 45 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'text-red-500 bg-red-50 dark:bg-red-900/30 dark:text-red-400';

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={e => handleDragStart(e, lead.id)}
                          className={`bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md cursor-grab active:cursor-grabbing group transition-all ${
                            updatingId === lead.id ? 'opacity-40 scale-95' : ''
                          }`}
                        >
                          {/* Top row: name + score */}
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                {lead.name.charAt(0).toUpperCase()}
                              </div>
                              <p className="font-semibold text-slate-800 dark:text-white text-sm truncate">{lead.name}</p>
                            </div>
                            {score > 0 && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5 ${scoreColor}`}>
                                <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
                                {score}
                              </span>
                            )}
                          </div>

                          {/* Project + unit */}
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2.5 pl-9">
                            {lead.project?.name || 'Sin proyecto'}
                            {lead.interested_in && ` · ${lead.interested_in}`}
                          </p>

                          {/* Footer row */}
                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700/50">
                            <div className="flex items-center gap-2">
                              {/* Source icon */}
                              <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[14px]" title={lead.source || ''}>
                                {SOURCE_ICONS[lead.source || ''] || SOURCE_ICONS.default}
                              </span>
                              {/* Days in pipeline */}
                              <span className={`text-[10px] font-medium ${days > 7 ? 'text-amber-500' : 'text-slate-400'}`}>
                                {days === 0 ? 'Hoy' : `${days}d`}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Potential value */}
                              {Number(lead.potential_value) > 0 && (
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                  {fmtValue(Number(lead.potential_value))}
                                </span>
                              )}
                              {/* WhatsApp quick action */}
                              {lead.phone && (
                                <a
                                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center"
                                  title={`WhatsApp ${lead.name}`}
                                >
                                  <svg viewBox="0 0 32 32" className="w-3 h-3 fill-white"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.469 2.027 7.769L0 32l8.469-2.001A15.942 15.942 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm7.307 19.413c-.4-.2-2.365-1.168-2.732-1.301-.367-.133-.634-.2-.9.2-.267.4-1.033 1.301-1.267 1.568-.233.267-.467.3-.867.1-.4-.2-1.689-.623-3.216-1.984-1.189-1.06-1.991-2.369-2.224-2.769-.233-.4-.025-.616.175-.815.18-.18.4-.467.6-.7.2-.233.267-.4.4-.667.133-.267.067-.5-.033-.7-.1-.2-.9-2.168-1.233-2.968-.325-.78-.655-.675-.9-.687l-.767-.013c-.267 0-.7.1-1.067.5-.367.4-1.4 1.368-1.4 3.335s1.433 3.869 1.633 4.136c.2.267 2.82 4.304 6.832 6.035.955.412 1.7.658 2.281.843.958.305 1.831.262 2.52.159.769-.114 2.365-.967 2.699-1.901.333-.933.333-1.733.233-1.901-.1-.167-.367-.267-.767-.467z"/></svg>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {colLeads.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-20 text-slate-300 dark:text-slate-700 text-xs gap-1 border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-xl">
                        <span className="material-symbols-outlined text-[20px]">{col.icon}</span>
                        Arrastra aquí
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default PipelinePage;
