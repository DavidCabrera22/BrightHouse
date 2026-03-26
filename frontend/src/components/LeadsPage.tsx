import React, { useState, useEffect, useCallback } from 'react';
import CrmLayout from './CrmLayout';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  project_id: string;
  status: string;
  source?: string;
  ai_score?: number;
  priority?: string;
  potential_value?: number;
  interested_in?: string;
  created_at: string;
  project?: { name: string };
  assigned_agent?: { id: string; name: string };
}

interface Project { id: string; name: string; }
interface Agent   { id: string; name: string; }

interface AiSuggestion {
  action: string;
  whatsapp_message: string;
  urgency: 'alta' | 'media' | 'baja';
  reason: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new:         { label: 'Nuevo',       color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/30' },
  contacted:   { label: 'Contactado',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30' },
  qualified:   { label: 'Calificado',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/30' },
  negotiation: { label: 'Negociación', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/30' },
  won:         { label: 'Ganado',      color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30' },
  pending:     { label: 'Pendiente',   color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800/30' },
  lost:        { label: 'Perdido',     color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/30' },
};

const URGENCY_STYLES = {
  alta:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  media: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  baja:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

// ─── Score circle component ───────────────────────────────────────────────────
const ScoreCircle: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 75 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
  const label = score >= 75 ? 'Alto' : score >= 45 ? 'Medio' : 'Bajo';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-9 w-9 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
          <path fill="none" stroke="#e2e8f0" strokeWidth="3" className="dark:stroke-slate-700"
            d="M18 2.0845 a15.9155 15.9155 0 0 1 0 31.831 a15.9155 15.9155 0 0 1 0 -31.831" />
          <path fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${score}, 100`}
            d="M18 2.0845 a15.9155 15.9155 0 0 1 0 31.831 a15.9155 15.9155 0 0 1 0 -31.831" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
          {score}
        </div>
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
const LeadsPage: React.FC = () => {
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [projects, setProjects]     = useState<Project[]>([]);
  const [agents, setAgents]         = useState<Agent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [userRole, setUserRole]     = useState<string | null>(null);

  // Filters
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [agentFilter, setAgentFilter]   = useState('all');
  const [scoreSort, setScoreSort]       = useState<'desc' | 'asc'>('desc');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating]     = useState(false);
  const [newLead, setNewLead]       = useState({
    name: '', email: '', phone: '', project_id: '', source: 'web', assigned_agent_id: '',
  });

  // AI suggestion panel
  const [activeSuggestion, setActiveSuggestion] = useState<{ lead: Lead; data: AiSuggestion | null; loading: boolean } | null>(null);

  const token = () => localStorage.getItem('access_token');
  const authHeaders = () => ({ Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' });

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    const res = await fetch('/api/leads', { headers: authHeaders() });
    if (res.ok) setLeads(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    setUserRole(localStorage.getItem('user_role'));
    fetchLeads();

    fetch('/api/projects', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setProjects);

    fetch('/api/users', { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then((data: any[]) => setAgents(data.filter((u: any) => u.role?.name === 'Agent' || u.role === 'Agent')));
  }, []);

  // ─── Create lead ────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const userId = localStorage.getItem('user_id');
    const payload: any = { ...newLead, status: 'new' };
    if (userRole === 'Agent' && userId) payload.assigned_agent_id = userId;

    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    setCreating(false);
    if (res.ok) {
      setShowCreate(false);
      setNewLead({ name: '', email: '', phone: '', project_id: projects[0]?.id || '', source: 'web', assigned_agent_id: '' });
      fetchLeads();
    }
  };

  // ─── AI Suggestion ──────────────────────────────────────────────────────────
  const requestSuggestion = async (lead: Lead) => {
    setActiveSuggestion({ lead, data: null, loading: true });
    try {
      const res = await fetch(`/api/leads/${lead.id}/suggest`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data: AiSuggestion = res.ok ? await res.json() : null;
      setActiveSuggestion({ lead, data, loading: false });
    } catch {
      setActiveSuggestion(prev => prev ? { ...prev, loading: false } : null);
    }
  };

  // ─── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = leads
    .filter(l => {
      const q = search.toLowerCase();
      const matchSearch = !q || l.name.toLowerCase().includes(q) || l.phone?.includes(q) || l.email?.toLowerCase().includes(q);
      const matchStatus  = statusFilter  === 'all' || l.status === statusFilter;
      const matchProject = projectFilter === 'all' || l.project_id === projectFilter;
      const matchAgent   = agentFilter   === 'all' || l.assigned_agent?.id === agentFilter;
      return matchSearch && matchStatus && matchProject && matchAgent;
    })
    .sort((a, b) => scoreSort === 'desc'
      ? (b.ai_score ?? 0) - (a.ai_score ?? 0)
      : (a.ai_score ?? 0) - (b.ai_score ?? 0)
    );

  // ─── Metrics ────────────────────────────────────────────────────────────────
  const now = new Date();
  const d7  = new Date(now.getTime() - 7 * 86400_000);
  const d14 = new Date(now.getTime() - 14 * 86400_000);
  const newCount      = leads.filter(l => new Date(l.created_at) >= d7).length;
  const newPrevCount  = leads.filter(l => { const d = new Date(l.created_at); return d >= d14 && d < d7; }).length;
  const newPct        = newPrevCount > 0 ? Math.round(((newCount - newPrevCount) / newPrevCount) * 100) : 0;
  const qualCount     = leads.filter(l => ['qualified', 'won', 'negotiation'].includes(l.status)).length;
  const activeCount   = leads.filter(l => ['contacted', 'negotiation', 'pending'].includes(l.status)).length;
  const highScore     = leads.filter(l => (l.ai_score ?? 0) >= 75).length;

  return (
    <CrmLayout
      title="Gestión de Prospectos"
      subtitle="Puntaje y sugerencias con IA"
      actions={
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-5 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo Prospecto
          </button>
        </div>
      }
    >
      {/* ── Create Modal ─────────────────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nuevo Prospecto</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {[
                { label: 'Nombre completo', key: 'name', type: 'text', placeholder: 'Juan Pérez', required: true },
                { label: 'Teléfono / WhatsApp', key: 'phone', type: 'tel', placeholder: '+57 300 000 0000', required: true },
                { label: 'Correo electrónico', key: 'email', type: 'email', placeholder: 'juan@email.com', required: false },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{f.label}</label>
                  <input
                    type={f.type} required={f.required}
                    placeholder={f.placeholder}
                    value={(newLead as any)[f.key]}
                    onChange={e => setNewLead({ ...newLead, [f.key]: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proyecto de interés</label>
                <select
                  required
                  value={newLead.project_id}
                  onChange={e => setNewLead({ ...newLead, project_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="" disabled>Seleccionar...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fuente</label>
                <select
                  value={newLead.source}
                  onChange={e => setNewLead({ ...newLead, source: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                >
                  <option value="web">Sitio Web</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="referral">Referido</option>
                  <option value="ads">Publicidad</option>
                  <option value="event">Evento</option>
                </select>
              </div>
              {(userRole === 'Admin') && agents.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asignar agente</label>
                  <select
                    value={newLead.assigned_agent_id}
                    onChange={e => setNewLead({ ...newLead, assigned_agent_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  >
                    <option value="">Sin asignar</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={creating} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow transition-all disabled:opacity-60">
                  {creating ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AI Suggestion Panel ───────────────────────────────────────────────── */}
      {activeSuggestion && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setActiveSuggestion(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[20px]">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Sugerencia IA</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{activeSuggestion.lead.name}</p>
              </div>
              <button onClick={() => setActiveSuggestion(null)} className="ml-auto text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {activeSuggestion.loading ? (
              <div className="p-8 flex flex-col items-center gap-3 text-slate-500">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
                <p className="text-sm">Analizando prospecto con IA...</p>
              </div>
            ) : activeSuggestion.data ? (
              <div className="p-5 space-y-4">
                {/* Urgency */}
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${URGENCY_STYLES[activeSuggestion.data.urgency]}`}>
                    Urgencia {activeSuggestion.data.urgency}
                  </span>
                  <span className="text-xs text-slate-400">{activeSuggestion.data.reason}</span>
                </div>

                {/* Action */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Acción recomendada</p>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{activeSuggestion.data.action}</p>
                </div>

                {/* WhatsApp message */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Mensaje sugerido</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">"{activeSuggestion.data.whatsapp_message}"</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {activeSuggestion.lead.phone && (
                    <a
                      href={`https://wa.me/${activeSuggestion.lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(activeSuggestion.data.whatsapp_message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      <svg viewBox="0 0 32 32" className="w-4 h-4 fill-white"><path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.469 2.027 7.769L0 32l8.469-2.001A15.942 15.942 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm7.307 19.413c-.4-.2-2.365-1.168-2.732-1.301-.367-.133-.634-.2-.9.2-.267.4-1.033 1.301-1.267 1.568-.233.267-.467.3-.867.1-.4-.2-1.689-.623-3.216-1.984-1.189-1.06-1.991-2.369-2.224-2.769-.233-.4-.025-.616.175-.815.18-.18.4-.467.6-.7.2-.233.267-.4.4-.667.133-.267.067-.5-.033-.7-.1-.2-.9-2.168-1.233-2.968-.325-.78-.655-.675-.9-.687l-.767-.013c-.267 0-.7.1-1.067.5-.367.4-1.4 1.368-1.4 3.335s1.433 3.869 1.633 4.136c.2.267 2.82 4.304 6.832 6.035.955.412 1.7.658 2.281.843.958.305 1.831.262 2.52.159.769-.114 2.365-.967 2.699-1.901.333-.933.333-1.733.233-1.901-.1-.167-.367-.267-.767-.467z"/></svg>
                      Enviar por WhatsApp
                    </a>
                  )}
                  <button
                    onClick={() => requestSuggestion(activeSuggestion.lead)}
                    className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    title="Regenerar"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">Error al obtener sugerencia. Intenta de nuevo.</div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">

        {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: 'Nuevos (7 días)', value: newCount, sub: `${newPct >= 0 ? '+' : ''}${newPct}% vs semana ant.`, icon: 'person_add', iconColor: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-50 dark:bg-blue-900/20', positive: newPct >= 0 },
            { label: 'Calificados',     value: qualCount, sub: `${Math.round((qualCount / Math.max(leads.length,1)) * 100)}% del total`, icon: 'verified', iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-50 dark:bg-emerald-900/20', positive: true },
            { label: 'En seguimiento', value: activeCount, sub: 'Contactado / Negociación', icon: 'timelapse', iconColor: 'text-amber-600 dark:text-amber-400', iconBg: 'bg-amber-50 dark:bg-amber-900/20', positive: true },
            { label: 'Score IA alto',  value: highScore, sub: 'Score ≥ 75 puntos', icon: 'auto_awesome', iconColor: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-50 dark:bg-purple-900/20', positive: true },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-start mb-3">
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-tight">{card.label}</p>
                <span className={`${card.iconBg} ${card.iconColor} p-1.5 rounded-lg`}>
                  <span className="material-symbols-outlined text-[18px]">{card.icon}</span>
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{card.value}</h3>
              <p className={`text-xs font-medium ${card.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>{card.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 outline-none"
              placeholder="Buscar por nombre, teléfono o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm py-2 px-4 focus:ring-blue-500/40 focus:border-blue-500 outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <option value="all">Estado: Todos</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select
            value={projectFilter}
            onChange={e => setProjectFilter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm py-2 px-4 focus:ring-blue-500/40 focus:border-blue-500 outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <option value="all">Proyecto: Todos</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {agents.length > 0 && (
            <select
              value={agentFilter}
              onChange={e => setAgentFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm py-2 px-4 focus:ring-blue-500/40 focus:border-blue-500 outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              <option value="all">Agente: Todos</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}

          <button
            onClick={() => setScoreSort(s => s === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm py-2 px-4 text-slate-600 dark:text-slate-300 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
            Score: {scoreSort === 'desc' ? 'Alto → Bajo' : 'Bajo → Alto'}
          </button>

          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-3 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              <p className="text-sm">Cargando prospectos...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 block mb-2">person_search</span>
              <p className="text-slate-500 dark:text-slate-400 text-sm">No hay prospectos con esos filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Prospecto</th>
                    <th className="px-6 py-4">Proyecto</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Puntaje IA</th>
                    <th className="px-6 py-4">Fuente</th>
                    <th className="px-6 py-4">Agente</th>
                    <th className="px-6 py-4">Registrado</th>
                    <th className="px-6 py-4 text-center">IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filtered.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">{lead.name}</p>
                            <p className="text-xs text-slate-400">{lead.phone || lead.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                        {lead.project?.name || <span className="text-slate-300 dark:text-slate-600">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_MAP[lead.status]?.color ?? 'bg-slate-100 text-slate-600'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full bg-current ${lead.status === 'qualified' ? 'animate-pulse' : ''}`}></span>
                          {STATUS_MAP[lead.status]?.label ?? lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ScoreCircle score={lead.ai_score ?? 0} />
                      </td>
                      <td className="px-6 py-4 capitalize text-slate-600 dark:text-slate-300 text-sm">{lead.source || '—'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 text-sm">
                        {lead.assigned_agent?.name || <span className="text-slate-300 dark:text-slate-600">Sin asignar</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                        {new Date(lead.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => requestSuggestion(lead)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                          title="Sugerencia IA"
                        >
                          <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                          IA
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

export default LeadsPage;
