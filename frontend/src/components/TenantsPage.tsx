import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  whapi_token?: string;
  default_project_id?: string;
  created_at: string;
}

const emptyForm = { name: '', slug: '', plan: 'basic', whapi_token: '', whapi_api_url: '', instagram_token: '', instagram_account_id: '', default_project_id: '' };

const TenantsPage: React.FC = () => {
  const token = localStorage.getItem('access_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchTenants = async () => {
    setLoading(true);
    const res = await fetch('/api/tenants', { headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) setTenants(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (t: Tenant) => {
    setEditing(t);
    setForm({ name: t.name, slug: t.slug, plan: t.plan, whapi_token: (t as any).whapi_token || '', whapi_api_url: (t as any).whapi_api_url || '', instagram_token: (t as any).instagram_token || '', instagram_account_id: (t as any).instagram_account_id || '', default_project_id: t.default_project_id || '' });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = editing ? 'PATCH' : 'POST';
    const url = editing ? `/api/tenants/${editing.id}` : '/api/tenants';
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
    if (res.ok) {
      setShowModal(false);
      fetchTenants();
    } else {
      const err = await res.json().catch(() => ({}));
      alert('Error: ' + (err.message || 'No se pudo guardar'));
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar el cliente "${name}"? Esto no eliminará sus proyectos ni usuarios.`)) return;
    const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) fetchTenants();
  };

  const planColors: Record<string, string> = {
    basic: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };

  return (
    <CrmLayout title="Clientes B2B" subtitle="Gestiona los tenants del sistema. Cada cliente tiene sus propios proyectos, usuarios y canales.">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">{tenants.length} cliente{tenants.length !== 1 ? 's' : ''} registrado{tenants.length !== 1 ? 's' : ''}</p>
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Nuevo Cliente
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-3 block">corporate_fare</span>
            <p className="font-medium">No hay clientes registrados aún</p>
            <p className="text-sm mt-1">Crea el primer cliente para comenzar</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tenants.map(t => (
              <div key={t.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">corporate_fare</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">slug: <span className="font-mono">{t.slug}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planColors[t.plan] || planColors.basic}`}>{t.plan}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${t.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600'}`}>{t.status}</span>
                  <p className="text-xs text-slate-400 hidden sm:block">Creado {new Date(t.created_at).toLocaleDateString('es')}</p>
                  <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button onClick={() => handleDelete(t.id, t.name)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhook info box */}
      <div className="mx-6 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">URLs de Webhook por Tenant</p>
        <div>
          <p className="text-[11px] font-semibold text-green-600 dark:text-green-400 mb-0.5">WhatsApp (Whapi)</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all">
            {window.location.origin.replace('5173', '3000')}/api/webhooks/whatsapp?tenant=<span className="text-blue-500">slug</span>
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-pink-600 dark:text-pink-400 mb-0.5">Instagram DM (Meta)</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 font-mono break-all">
            {window.location.origin.replace('5173', '3000')}/api/webhooks/instagram?tenant=<span className="text-blue-500">slug</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Verify token: variable de entorno <span className="font-mono">INSTAGRAM_VERIFY_TOKEN</span></p>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editing ? 'Editar Cliente' : 'Nuevo Cliente B2B'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="Inmobiliaria XYZ" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug <span className="text-red-500">*</span></label>
                  <input required type="text" placeholder="inmobiliaria-xyz" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                  <p className="text-xs text-slate-400 mt-1">Se usa en la URL del webhook</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Plan</label>
                  <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="basic">Basic</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proyecto por Defecto (ID)</label>
                  <input type="text" placeholder="UUID del proyecto" value={form.default_project_id} onChange={e => setForm({ ...form, default_project_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Whapi Token</label>
                <input type="text" placeholder="Token de Whapi del cliente" value={form.whapi_token} onChange={e => setForm({ ...form, whapi_token: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Whapi API URL <span className="text-slate-400 font-normal">(opcional)</span></label>
                <input type="text" placeholder="https://gate.whapi.cloud" value={form.whapi_api_url} onChange={e => setForm({ ...form, whapi_api_url: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-pink-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                  Instagram DM
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Access Token</label>
                    <input type="text" placeholder="Token de página de Meta" value={form.instagram_token} onChange={e => setForm({ ...form, instagram_token: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-pink-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Page / Account ID</label>
                    <input type="text" placeholder="ID de la página de Facebook" value={form.instagram_account_id} onChange={e => setForm({ ...form, instagram_account_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-pink-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={saving} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-lg transition-all">
                  {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CrmLayout>
  );
};

export default TenantsPage;
