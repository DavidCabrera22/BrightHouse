import React, { useEffect, useMemo, useState } from 'react';

/**
 * Formulario de cierre de venta, compartido por la ficha del lead y la página
 * de Ventas.
 *
 * Manda un solo `POST /api/sales/register`: el backend crea el comprador, la
 * venta y cambia el estado de la unidad en ese orden. Aquí no se encadenan tres
 * llamadas a propósito — si el orden viviera en el navegador, una a medias
 * dejaría la unidad vendida sin comisión, que es el fallo que esta pantalla
 * viene a cerrar.
 */

export interface SalePrefill {
  name?: string;
  phone?: string;
  email?: string;
  project_id?: string;
}

interface Project { id: string; name: string; }
interface Agent { id: string; name: string; }
interface UnitStatus { id: string; name: string; triggers_commission?: boolean }
interface Unit {
  id: string;
  code: string;
  tower?: string;
  floor?: number;
  area?: number;
  price?: number;
  current_status?: { name: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  prefill?: SalePrefill;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  'Content-Type': 'application/json',
});

const cop = (v: number) =>
  '$' + Number(v).toLocaleString('es-CO', { maximumFractionDigits: 0 });

const SaleFormModal: React.FC<Props> = ({ open, onClose, onSaved, prefill }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [statuses, setStatuses] = useState<UnitStatus[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [projectId, setProjectId] = useState('');
  const [form, setForm] = useState({
    unit_id: '',
    sale_value: '',
    client_name: '',
    client_document_number: '',
    client_phone: '',
    client_email: '',
    agent_id: '',
    notes: '',
  });
  // "Separado" o "Vendido": el nombre, no el id, porque el id cambia por entorno.
  const [statusName, setStatusName] = useState('Vendido');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({
      unit_id: '',
      sale_value: '',
      client_name: prefill?.name ?? '',
      client_document_number: '',
      client_phone: prefill?.phone ?? '',
      client_email: prefill?.email ?? '',
      agent_id: localStorage.getItem('user_id') ?? '',
      notes: '',
    });
    setStatusName('Vendido');
    setProjectId(prefill?.project_id ?? '');

    fetch('/api/projects', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Project[]) => {
        setProjects(data);
        if (!prefill?.project_id && data.length === 1) setProjectId(data[0].id);
      });

    fetch('/api/unit-statuses', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then(setStatuses);

    fetch('/api/users', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) =>
        setAgents(data.filter((u) => (u.role?.name ?? u.role) === 'Agent')),
      );
  }, [open, prefill?.name, prefill?.phone, prefill?.email, prefill?.project_id]);

  // Las unidades dependen del proyecto elegido.
  useEffect(() => {
    if (!open || !projectId) {
      setUnits([]);
      return;
    }
    setLoadingUnits(true);
    fetch(`/api/units?project_id=${projectId}`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Unit[]) => setUnits(data))
      .finally(() => setLoadingUnits(false));
  }, [open, projectId]);

  // Una unidad ya vendida no se vuelve a vender.
  const sellableUnits = useMemo(
    () => units.filter((u) => u.current_status?.name !== 'Vendido'),
    [units],
  );

  const selectedUnit = sellableUnits.find((u) => u.id === form.unit_id);

  const chosenStatus = statuses.find((s) => s.name === statusName);
  const generaComision = chosenStatus?.triggers_commission ?? statusName === 'Vendido';

  const pickUnit = (id: string) => {
    const unit = sellableUnits.find((u) => u.id === id);
    setForm((f) => ({
      ...f,
      unit_id: id,
      // El precio de lista precarga el valor, pero se puede editar: casi nunca
      // se cierra exactamente en el precio de lista.
      sale_value: unit?.price != null && !f.sale_value ? String(unit.price) : f.sale_value,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!chosenStatus) {
      setError('No se encontró el estado de unidad. Recarga la página e intenta de nuevo.');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/sales/register', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        unit_id: form.unit_id,
        new_status_id: chosenStatus.id,
        sale_value: Number(form.sale_value),
        client_name: form.client_name.trim(),
        client_document_number: form.client_document_number.trim(),
        client_phone: form.client_phone.trim(),
        client_email: form.client_email.trim(),
        agent_id: form.agent_id || undefined,
        notes: form.notes.trim() || undefined,
      }),
    });
    setSaving(false);

    if (res.ok) {
      onSaved();
      onClose();
      return;
    }

    const body = await res.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    setError(message || 'No se pudo registrar la venta.');
  };

  if (!open) return null;

  const input =
    'w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none';
  const label = 'block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Registrar venta</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          {/* ── Comprador ── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Comprador
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>
                  Cédula <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="1047123456"
                  value={form.client_document_number}
                  onChange={(e) =>
                    setForm({ ...form, client_document_number: e.target.value })
                  }
                  className={input}
                />
              </div>
              <div>
                <label className={label}>
                  Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.client_phone}
                  onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>
                  Correo <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="email"
                  value={form.client_email}
                  onChange={(e) => setForm({ ...form, client_email: e.target.value })}
                  className={input}
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Si esta cédula ya está registrada, se reutiliza el cliente existente en lugar de
              duplicarlo.
            </p>
          </div>

          {/* ── Apartamento ── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Apartamento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label}>
                  Proyecto <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setForm((f) => ({ ...f, unit_id: '', sale_value: '' }));
                  }}
                  className={input}
                >
                  <option value="">Selecciona…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>
                  Unidad <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  disabled={!projectId || loadingUnits}
                  value={form.unit_id}
                  onChange={(e) => pickUnit(e.target.value)}
                  className={`${input} disabled:opacity-50`}
                >
                  <option value="">
                    {!projectId
                      ? 'Elige un proyecto primero'
                      : loadingUnits
                        ? 'Cargando…'
                        : sellableUnits.length === 0
                          ? 'Sin unidades disponibles'
                          : 'Selecciona…'}
                  </option>
                  {sellableUnits.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.code}
                      {u.tower ? ` · Torre ${u.tower}` : ''}
                      {u.floor != null ? ` · Piso ${u.floor}` : ''}
                      {u.area != null ? ` · ${u.area} m²` : ''}
                      {u.price != null ? ` · ${cop(u.price)}` : ''}
                      {u.current_status?.name ? ` — ${u.current_status.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>
                  Valor de la venta <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  value={form.sale_value}
                  onChange={(e) => setForm({ ...form, sale_value: e.target.value })}
                  className={input}
                />
                {selectedUnit?.price != null && (
                  <p className="mt-1 text-xs text-slate-400">
                    Precio de lista: {cop(selectedUnit.price)}
                  </p>
                )}
              </div>
              <div>
                <label className={label}>Asesora</label>
                <select
                  value={form.agent_id}
                  onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                  className={input}
                >
                  <option value="">Quien registra</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">De aquí sale el 3% de comisión.</p>
              </div>
            </div>
          </div>

          {/* ── Estado ── */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              La unidad queda como
            </h3>
            <div className="flex flex-wrap gap-3">
              {['Separado', 'Vendido'].map((name) => (
                <label
                  key={name}
                  className={`flex-1 min-w-[160px] cursor-pointer rounded-xl border-2 px-4 py-3 transition-colors ${
                    statusName === name
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="unit-status"
                    className="sr-only"
                    checked={statusName === name}
                    onChange={() => setStatusName(name)}
                  />
                  <span className="block font-semibold text-slate-900 dark:text-white">{name}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {name === 'Vendido' ? 'Genera la comisión' : 'Sin comisión todavía'}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {generaComision
                ? 'Al guardar se crea la comisión: 3% para la asesora y 2% para la plataforma.'
                : 'La comisión se generará cuando la unidad pase a Vendido.'}
            </p>
          </div>

          <div>
            <label className={label}>Notas</label>
            <input
              placeholder="Opcional — queda en el historial de la unidad"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className={input}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-crm-primary text-white font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Registrando…' : 'Registrar venta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaleFormModal;
