import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';

type Status = 'active' | 'paused' | 'draft';
type TriggerType = 'lead_created' | 'lead_status_changed' | 'lead_idle';
type ActionType = 'send_whatsapp' | 'change_lead_status' | 'assign_agent';

interface Project {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  name: string;
}

interface Automation {
  id: string;
  name: string;
  status: Status;
  project_id: string;
  project?: Project;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  action_type: ActionType;
  action_config: Record<string, any>;
  runs_count: number;
  last_run_at?: string;
  last_error?: string;
}

const LEAD_STATUSES: { value: string; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
];

const SOURCES = ['whatsapp', 'instagram', 'web', 'referral', 'event', 'ads'];

const statusLabel = (s: string) => LEAD_STATUSES.find((x) => x.value === s)?.label || s;

const emptyForm = {
  name: '',
  project_id: '',
  status: 'draft' as Status,
  trigger_type: 'lead_created' as TriggerType,
  trigger_source: '',
  trigger_to_status: 'qualified',
  trigger_status: '',
  trigger_days: '3',
  action_type: 'send_whatsapp' as ActionType,
  action_message: '',
  action_status: 'contacted',
  action_agent_id: '',
};

const AutomationsPage: React.FC = () => {
  const token = localStorage.getItem('access_token');
  const userRole = localStorage.getItem('user_role');
  const canEdit =
    userRole === 'Admin' || userRole === 'admin' || userRole === 'SuperAdmin' || userRole === 'super_admin';

  const authHeader = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...authHeader, 'Content-Type': 'application/json' };

  const [automations, setAutomations] = useState<Automation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Status>('active');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const requests = [
        fetch('/api/automations', { headers: authHeader }),
        fetch('/api/projects', { headers: authHeader }),
      ];
      // The user directory is Admin-only; an Agent asking for it gets a 403.
      if (canEdit) requests.push(fetch('/api/users', { headers: authHeader }));

      const [autoRes, projectsRes, usersRes] = await Promise.all(requests);

      if (autoRes.ok) setAutomations(await autoRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (usersRes?.ok) setAgents(await usersRes.json());
    } catch (error) {
      console.error('Error fetching automations', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const counts: Record<Status, number> = {
    active: automations.filter((a) => a.status === 'active').length,
    paused: automations.filter((a) => a.status === 'paused').length,
    draft: automations.filter((a) => a.status === 'draft').length,
  };

  const visible = automations.filter((a) => a.status === activeTab);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, project_id: projects[0]?.id || '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (a: Automation) => {
    setEditing(a);
    setForm({
      name: a.name,
      project_id: a.project_id,
      status: a.status,
      trigger_type: a.trigger_type,
      trigger_source: a.trigger_config?.source || '',
      trigger_to_status: a.trigger_config?.to_status || 'qualified',
      trigger_status: a.trigger_config?.status || '',
      trigger_days: String(a.trigger_config?.days ?? '3'),
      action_type: a.action_type,
      action_message: a.action_config?.message || '',
      action_status: a.action_config?.status || 'contacted',
      action_agent_id: a.action_config?.agent_id || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const buildPayload = () => {
    const trigger_config: Record<string, any> = {};
    if (form.trigger_type === 'lead_created' && form.trigger_source) {
      trigger_config.source = form.trigger_source;
    }
    if (form.trigger_type === 'lead_status_changed') {
      trigger_config.to_status = form.trigger_to_status;
    }
    if (form.trigger_type === 'lead_idle') {
      trigger_config.days = Number(form.trigger_days);
      if (form.trigger_status) trigger_config.status = form.trigger_status;
    }

    const action_config: Record<string, any> = {};
    if (form.action_type === 'send_whatsapp') action_config.message = form.action_message;
    if (form.action_type === 'change_lead_status') action_config.status = form.action_status;
    if (form.action_type === 'assign_agent') action_config.agent_id = form.action_agent_id;

    return {
      name: form.name,
      project_id: form.project_id,
      status: form.status,
      trigger_type: form.trigger_type,
      trigger_config,
      action_type: form.action_type,
      action_config,
    };
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const res = await fetch(editing ? `/api/automations/${editing.id}` : '/api/automations', {
      method: editing ? 'PATCH' : 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(buildPayload()),
    });

    if (res.ok) {
      setShowModal(false);
      setActiveTab(form.status);
      fetchAll();
    } else {
      const body = await res.json().catch(() => ({}));
      const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      setFormError(message || 'No se pudo guardar la automatización.');
    }
    setSaving(false);
  };

  const setStatus = async (a: Automation, status: Status) => {
    const res = await fetch(`/api/automations/${a.id}/status`, {
      method: 'PATCH',
      headers: jsonHeaders,
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchAll();
  };

  const handleDelete = async (a: Automation) => {
    if (!confirm(`¿Eliminar la automatización "${a.name}"?`)) return;
    const res = await fetch(`/api/automations/${a.id}`, { method: 'DELETE', headers: authHeader });
    if (res.ok) fetchAll();
  };

  const describeTrigger = (a: Automation) => {
    switch (a.trigger_type) {
      case 'lead_created':
        return a.trigger_config?.source
          ? `Cuando entra un lead desde ${a.trigger_config.source}`
          : 'Cuando entra un lead nuevo';
      case 'lead_status_changed':
        return `Cuando un lead pasa a "${statusLabel(a.trigger_config?.to_status)}"`;
      case 'lead_idle':
        return a.trigger_config?.status
          ? `Cuando un lead lleva ${a.trigger_config?.days} días en "${statusLabel(a.trigger_config.status)}"`
          : `Cuando un lead lleva ${a.trigger_config?.days} días sin avanzar`;
      default:
        return a.trigger_type;
    }
  };

  const describeAction = (a: Automation) => {
    switch (a.action_type) {
      case 'send_whatsapp':
        return 'Enviar un WhatsApp';
      case 'change_lead_status':
        return `Cambiar el estado a "${statusLabel(a.action_config?.status)}"`;
      case 'assign_agent': {
        const agent = agents.find((x) => x.id === a.action_config?.agent_id);
        return `Asignar a ${agent?.name || 'un asesor'}`;
      }
      default:
        return a.action_type;
    }
  };

  const tabs: { key: Status; label: string }[] = [
    { key: 'active', label: 'Activas' },
    { key: 'paused', label: 'Pausadas' },
    { key: 'draft', label: 'Borradores' },
  ];

  return (
    <CrmLayout
      title="Automatizaciones"
      subtitle="Reglas que actúan sobre tus leads sin intervención manual."
      actions={
        canEdit ? (
          <button
            onClick={openCreate}
            disabled={projects.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title={projects.length === 0 ? 'Necesitas al menos un proyecto' : undefined}
          >
            <span className="material-symbols-outlined">add</span>
            <span>Nueva automatización</span>
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-8">
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-4 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key ? 'bg-blue-600/10' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {counts[tab.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-3 block">smart_toy</span>
            <p className="font-medium">
              {automations.length === 0
                ? 'Todavía no has creado ninguna automatización'
                : `No hay automatizaciones ${tabs.find((t) => t.key === activeTab)?.label.toLowerCase()}`}
            </p>
            {automations.length === 0 && canEdit && (
              <p className="text-sm mt-1">
                Por ejemplo: enviar un WhatsApp de bienvenida en cuanto entra un lead
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((a) => (
              <div
                key={a.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border transition-all ${
                  a.status === 'draft'
                    ? 'border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-600/50'
                    : 'border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-blue-600/5'
                } ${a.status === 'paused' ? 'opacity-80 hover:opacity-100' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  {a.status === 'active' && (
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                      Activa
                    </div>
                  )}
                  {a.status === 'paused' && (
                    <div className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Pausada
                    </div>
                  )}
                  {a.status === 'draft' && (
                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      Borrador
                    </div>
                  )}

                  {canEdit && (
                    <div className="flex items-center gap-1">
                      {a.status !== 'active' && (
                        <button
                          onClick={() => setStatus(a, 'active')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          title="Activar"
                        >
                          <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                        </button>
                      )}
                      {a.status === 'active' && (
                        <button
                          onClick={() => setStatus(a, 'paused')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                          title="Pausar"
                        >
                          <span className="material-symbols-outlined text-[18px]">pause</span>
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(a)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(a)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{a.name}</h3>
                <p className="text-xs text-slate-400 mb-4">{a.project?.name}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-blue-500 mt-0.5">
                      bolt
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {describeTrigger(a)}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-emerald-500 mt-0.5">
                      arrow_forward
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{describeAction(a)}</p>
                  </div>
                </div>

                {a.last_error && (
                  <div className="mb-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    Último error: {a.last_error}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                      Ejecuciones
                    </span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {a.runs_count}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                      Última vez
                    </span>
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {a.last_run_at ? new Date(a.last_run_at).toLocaleDateString('es') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 my-8">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Editar automatización' : 'Nueva automatización'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Bienvenida a leads de WhatsApp"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Proyecto <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecciona un proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trigger */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-3 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                  Cuándo se ejecuta
                </p>
                <select
                  value={form.trigger_type}
                  onChange={(e) =>
                    setForm({ ...form, trigger_type: e.target.value as TriggerType })
                  }
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="lead_created">Cuando entra un lead nuevo</option>
                  <option value="lead_status_changed">Cuando un lead cambia de estado</option>
                  <option value="lead_idle">Cuando un lead lleva días sin avanzar</option>
                </select>

                {form.trigger_type === 'lead_created' && (
                  <select
                    value={form.trigger_source}
                    onChange={(e) => setForm({ ...form, trigger_source: e.target.value })}
                    className="mt-3 w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Desde cualquier origen</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        Solo desde {s}
                      </option>
                    ))}
                  </select>
                )}

                {form.trigger_type === 'lead_status_changed' && (
                  <select
                    value={form.trigger_to_status}
                    onChange={(e) => setForm({ ...form, trigger_to_status: e.target.value })}
                    className="mt-3 w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        Al pasar a {s.label}
                      </option>
                    ))}
                  </select>
                )}

                {form.trigger_type === 'lead_idle' && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <input
                      required
                      type="number"
                      min="1"
                      value={form.trigger_days}
                      onChange={(e) => setForm({ ...form, trigger_days: e.target.value })}
                      placeholder="Días"
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <select
                      value={form.trigger_status}
                      onChange={(e) => setForm({ ...form, trigger_status: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">En cualquier estado</option>
                      {LEAD_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          En {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-3 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  Qué hace
                </p>
                <select
                  value={form.action_type}
                  onChange={(e) => setForm({ ...form, action_type: e.target.value as ActionType })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="send_whatsapp">Enviar un WhatsApp</option>
                  <option value="change_lead_status">Cambiar el estado del lead</option>
                  <option value="assign_agent">Asignar a un asesor</option>
                </select>

                {form.action_type === 'send_whatsapp' && (
                  <div className="mt-3">
                    <textarea
                      required
                      rows={3}
                      value={form.action_message}
                      onChange={(e) => setForm({ ...form, action_message: e.target.value })}
                      placeholder="Hola {{nombre}}, gracias por tu interés en {{proyecto}}."
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Puedes usar <span className="font-mono">{'{{nombre}}'}</span>,{' '}
                      <span className="font-mono">{'{{proyecto}}'}</span> y{' '}
                      <span className="font-mono">{'{{interes}}'}</span>.
                    </p>
                  </div>
                )}

                {form.action_type === 'change_lead_status' && (
                  <select
                    value={form.action_status}
                    onChange={(e) => setForm({ ...form, action_status: e.target.value })}
                    className="mt-3 w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {LEAD_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                )}

                {form.action_type === 'assign_agent' && (
                  <select
                    required
                    value={form.action_agent_id}
                    onChange={(e) => setForm({ ...form, action_agent_id: e.target.value })}
                    className="mt-3 w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecciona un asesor</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 mt-2">
                  Estado
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="draft">Borrador (no se ejecuta)</option>
                  <option value="active">Activa</option>
                  <option value="paused">Pausada</option>
                </select>
              </div>

              {formError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2.5">
                  {formError}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-lg transition-all"
                >
                  {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear automatización'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CrmLayout>
  );
};

export default AutomationsPage;
