import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';

interface Role {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  role_id?: string;
  role?: Role;
  project_id?: string;
  project?: Project;
  tenant_id?: string;
  created_at?: string;
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role_id: '',
  project_id: '',
  status: 'active',
  tenant_id: '',
};

const roleColors: Record<string, string> = {
  SuperAdmin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  Admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Agent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const roleLabels: Record<string, string> = {
  SuperAdmin: 'Super Admin',
  Admin: 'Administrador',
  Agent: 'Asesor',
};

const UsersPage: React.FC = () => {
  const token = localStorage.getItem('access_token');
  const currentUserId = localStorage.getItem('user_id');
  const userRole = localStorage.getItem('user_role');
  const isSuperAdmin = userRole === 'SuperAdmin' || userRole === 'super_admin';

  const authHeader = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...authHeader, 'Content-Type': 'application/json' };

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const requests = [
        fetch('/api/users', { headers: authHeader }),
        fetch('/api/roles', { headers: authHeader }),
        fetch('/api/projects', { headers: authHeader }),
      ];
      // The tenant registry is SuperAdmin-only; asking for it as an Admin is a 403.
      if (isSuperAdmin) requests.push(fetch('/api/tenants', { headers: authHeader }));

      const [usersRes, rolesRes, projectsRes, tenantsRes] = await Promise.all(requests);

      if (!usersRes.ok) {
        setError('No se pudieron cargar los usuarios.');
        setLoading(false);
        return;
      }

      setUsers(await usersRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (tenantsRes?.ok) setTenants(await tenantsRes.json());
    } catch {
      setError('Error de conexión con el servidor.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Only a SuperAdmin can hand out the SuperAdmin role; the backend rejects it
  // otherwise, so it is not offered here either.
  const assignableRoles = isSuperAdmin ? roles : roles.filter((r) => r.name !== 'SuperAdmin');

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      password: '',
      role_id: u.role_id || u.role?.id || '',
      project_id: u.project_id || '',
      status: u.status || 'active',
      tenant_id: u.tenant_id || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role_id: form.role_id,
      status: form.status,
    };
    if (form.project_id) payload.project_id = form.project_id;
    if (isSuperAdmin && form.tenant_id) payload.tenant_id = form.tenant_id;
    // Se manda siempre: vaciar el campo en una edición tiene que borrar el teléfono.
    payload.phone = form.phone.trim() || null;
    // On edit an empty field means "leave the current password alone".
    if (form.password) payload.password = form.password;

    const res = await fetch(editing ? `/api/users/${editing.id}` : '/api/users', {
      method: editing ? 'PATCH' : 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      fetchAll();
    } else {
      const body = await res.json().catch(() => ({}));
      const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      setFormError(message || 'No se pudo guardar el usuario.');
    }
    setSaving(false);
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`¿Eliminar a "${u.name}"? Esta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE', headers: authHeader });
    if (res.ok) {
      fetchAll();
    } else {
      const body = await res.json().catch(() => ({}));
      alert(body.message || 'No se pudo eliminar el usuario.');
    }
  };

  const visibleUsers = users.filter((u) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      (u.phone || '').toLowerCase().includes(term);
    const matchesRole = roleFilter === 'all' || u.role?.name === roleFilter;
    return matchesSearch && matchesRole;
  });

  const tenantName = (id?: string) => tenants.find((t) => t.id === id)?.name;

  return (
    <CrmLayout
      title="Usuarios"
      subtitle="Administra quién tiene acceso al CRM, con qué rol y sobre qué proyecto."
    >
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {visibleUsers.length} usuario{visibleUsers.length !== 1 ? 's' : ''}
            {visibleUsers.length !== users.length && ` de ${users.length}`}
          </p>
          <button
            onClick={openCreate}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Nuevo Usuario
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Rol: Todos</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {roleLabels[r.name] || r.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-3 block">error</span>
            <p className="font-medium">{error}</p>
          </div>
        ) : visibleUsers.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-3 block">group</span>
            <p className="font-medium">
              {users.length === 0 ? 'No hay usuarios todavía' : 'Ningún usuario coincide con el filtro'}
            </p>
            {users.length === 0 && <p className="text-sm mt-1">Crea el primero para dar acceso al CRM</p>}
          </div>
        ) : (
          <div className="grid gap-3">
            {visibleUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {u.name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ml-2 text-[11px] font-semibold text-slate-400">(tú)</span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {u.email}
                      {u.phone && <span className="ml-2">· {u.phone}</span>}
                    </p>
                    {isSuperAdmin && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {tenantName(u.tenant_id) || (
                          <span className="text-amber-500 font-medium">Sin empresa asignada</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      roleColors[u.role?.name || ''] ||
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {roleLabels[u.role?.name || ''] || u.role?.name || 'Sin rol'}
                  </span>
                  {u.project?.name && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline">
                      {u.project.name}
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      u.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                  >
                    {u.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => openEdit(u)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                    title="Editar"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={u.id === currentUserId}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 disabled:cursor-not-allowed"
                    title={u.id === currentUserId ? 'No puedes eliminar tu propia cuenta' : 'Eliminar'}
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editing ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Juan Pérez"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Correo <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="juan@empresa.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="3001234567"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contraseña {!editing && <span className="text-red-500">*</span>}
                </label>
                <input
                  required={!editing}
                  type="password"
                  placeholder={editing ? 'Dejar vacío para no cambiarla' : 'Mínimo 6 caracteres'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rol <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.role_id}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Selecciona un rol</option>
                    {assignableRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {roleLabels[r.name] || r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Estado
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Proyecto asignado <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <select
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Sin proyecto específico</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {isSuperAdmin && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 mt-2">
                    Empresa (tenant) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.tenant_id}
                    onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Sin empresa (solo para Super Admin)</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">
                    Un usuario sin empresa no podrá acceder al CRM, salvo que su rol sea Super Admin.
                  </p>
                </div>
              )}

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
                  {saving ? 'Guardando...' : editing ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CrmLayout>
  );
};

export default UsersPage;
