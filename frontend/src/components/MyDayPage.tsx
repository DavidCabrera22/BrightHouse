import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CrmLayout from './CrmLayout';

type Kind = 'reply' | 'lead' | 'followup' | 'visit' | 'quote';
interface DayItem {
  key: string;
  kind: Kind;
  title: string;
  contact: string;
  project: string;
  reason: string;
  due_at: string;
  priority: number;
  url: string;
  phone?: string;
  lead_id?: string;
  completable: boolean;
}
interface DayData {
  today: string;
  generated_at: string;
  completed_today: number;
  items: DayItem[];
  leads: { id: string; name: string; project: string }[];
}
const labels: Record<Kind, string> = {
  reply: 'Por responder',
  lead: 'Por contactar',
  followup: 'Seguimiento',
  visit: 'Visita',
  quote: 'Cotización',
};
const icons: Record<Kind, string> = {
  reply: 'chat_bubble',
  lead: 'person_add',
  followup: 'event_repeat',
  visit: 'location_on',
  quote: 'request_quote',
};
const zone = 'America/Bogota';
function dayOf(value: string) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)?.value)
    .join('-');
}
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('es-CO', {
    timeZone: zone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
function phoneNumber(phone?: string) {
  const digits = (phone || '').replace(/\D/g, '');
  if (/^3\d{9}$/.test(digits)) return `57${digits}`;
  return digits.length >= 7 && digits.length <= 15 ? digits : '';
}
async function request<T>(path = '', body?: unknown): Promise<T> {
  const res = await fetch(`/api/my-day${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      'Content-Type': 'application/json',
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    if (res.status === 401)
      throw new Error('Tu sesión venció. Inicia sesión nuevamente.');
    if (res.status === 404)
      throw new Error(
        'Este pendiente cambió. Actualiza la lista para continuar.',
      );
    if (res.status === 400)
      throw new Error(
        'Revisa los datos: el seguimiento necesita un lead activo y una fecha futura.',
      );
    throw new Error(
      'No pudimos guardar o cargar tus pendientes. Intenta nuevamente.',
    );
  }
  return res.json();
}
const panel =
  'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const button =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800';
const input =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:placeholder:text-slate-400';

export default function MyDayPage() {
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [period, setPeriod] = useState<'today' | 'upcoming'>('today');
  const [kind, setKind] = useState<Kind | 'all' | 'contacts'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ lead_id: '', title: '', due_at: '' });
  const version = useRef(0);

  const load = useCallback(async () => {
    const id = ++version.current;
    try {
      const result = await request<DayData>();
      if (id === version.current) {
        setData(result);
        setError('');
      }
    } catch (e) {
      if (id === version.current)
        setError(e instanceof Error ? e.message : 'No se pudo cargar Mi día.');
    } finally {
      if (id === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 60000);
    const onFocus = () => {
      void load();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      ++version.current;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const complete = async (item: DayItem) => {
    setBusy(item.key);
    setNotice('');
    setError('');
    try {
      await request('/complete', { key: item.key });
      setNotice(
        item.kind === 'lead' || item.kind === 'followup'
          ? 'Seguimiento registrado. Puedes programar el próximo contacto.'
          : 'Actividad marcada como realizada.',
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar.');
    } finally {
      setBusy('');
    }
  };
  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('create');
    setNotice('');
    setError('');
    try {
      await request('/tasks', { ...form, due_at: `${form.due_at}:00-05:00` });
      setShowForm(false);
      setForm({ lead_id: '', title: '', due_at: '' });
      setNotice(
        'Seguimiento programado. Aparecerá en tu día cuando corresponda.',
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo programar.');
    } finally {
      setBusy('');
    }
  };
  const openForm = (leadId = '') => {
    setForm({
      lead_id: leadId,
      title: 'Hacer seguimiento al cliente',
      due_at: '',
    });
    setShowForm(true);
    setNotice('');
    window.setTimeout(
      () => document.getElementById('day-task-title')?.focus(),
      0,
    );
  };
  const today = data?.today || '';
  const due = (item: DayItem) => dayOf(item.due_at) <= today;
  const pending = data?.items.filter(due) || [];
  const upcoming = (data?.items.filter((i) => !due(i)) || []).sort((a, b) =>
    a.due_at.localeCompare(b.due_at),
  );
  const visible = (period === 'today' ? pending : upcoming).filter(
    (i) =>
      (kind === 'all' ||
        (kind === 'contacts'
          ? ['lead', 'followup'].includes(i.kind)
          : i.kind === kind)) &&
      `${i.contact} ${i.project} ${i.title}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const name = (localStorage.getItem('user_name') || 'asesor').split(' ')[0];

  return (
    <CrmLayout
      title="Mi día"
      subtitle="Tu agenda comercial · Hora de Colombia"
      actions={
        <button
          className={`${button} bg-blue-600 !text-white hover:!bg-blue-700`}
          onClick={() => openForm()}
          disabled={!data?.leads.length}
        >
          <span
            className="material-symbols-outlined text-lg"
            aria-hidden="true"
          >
            add
          </span>
          <span className="hidden sm:inline">Seguimiento</span>
          <span className="sr-only sm:hidden">Programar seguimiento</span>
        </button>
      }
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex flex-col justify-between gap-5 rounded-2xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-300">
              Tu siguiente paso
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Hola, {name}. Vamos con tu día.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
              Responde a tus clientes, prepara las visitas y mantén cada
              oportunidad en movimiento.
            </p>
          </div>
          <div className="shrink-0 border-l border-slate-700 pl-5">
            <p className="text-4xl font-bold">{data ? pending.length : '—'}</p>
            <p className="mt-1 text-sm text-slate-300">
              pendientes para atender
            </p>
            <p className="mt-3 text-xs text-emerald-300">
              {data?.completed_today ?? 0}{' '}
              {data?.completed_today === 1
                ? 'actividad completada hoy'
                : 'actividades completadas hoy'}
            </p>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
          >
            <span>{error}</span>
            <button className={button} onClick={() => void load()}>
              Reintentar
            </button>
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          >
            {notice}
          </p>
        )}

        {showForm && (
          <section
            className={`${panel} p-5`}
            aria-labelledby="day-form-heading"
          >
            <div className="mb-4 flex justify-between gap-3">
              <h2 id="day-form-heading" className="font-bold">
                Programar seguimiento
              </h2>
              <button
                className={button}
                disabled={!!busy}
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </button>
            </div>
            <form onSubmit={create} className="grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium">
                Cliente
                <select
                  required
                  className={input}
                  value={form.lead_id}
                  onChange={(e) =>
                    setForm({ ...form, lead_id: e.target.value })
                  }
                >
                  <option value="">Selecciona un lead de tu cartera</option>
                  {data?.leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.project ? ` · ${l.project}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium">
                Qué vas a hacer
                <input
                  id="day-task-title"
                  required
                  maxLength={160}
                  className={input}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </label>
              <label className="text-sm font-medium">
                Fecha y hora de Colombia
                <input
                  required
                  type="datetime-local"
                  className={input}
                  value={form.due_at}
                  onChange={(e) => setForm({ ...form, due_at: e.target.value })}
                />
              </label>
              <div className="md:col-span-3">
                <button
                  disabled={!!busy || !form.title.trim()}
                  className={`${button} bg-blue-600 !text-white hover:!bg-blue-700`}
                  type="submit"
                >
                  {busy === 'create' ? 'Guardando…' : 'Guardar seguimiento'}
                </button>
              </div>
            </form>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              { type: 'reply', label: 'Por responder' },
              { type: 'followup', label: 'Contactos y seguimientos' },
              { type: 'visit', label: 'Visitas' },
              { type: 'quote', label: 'Cotizaciones' },
            ] as const
          ).map((card) => (
            <button
              key={card.type}
              className={`${panel} p-4 text-left transition hover:border-blue-400`}
              onClick={() => {
                setPeriod('today');
                setKind(card.type === 'followup' ? 'contacts' : card.type);
              }}
            >
              <span
                className="material-symbols-outlined text-blue-500"
                aria-hidden="true"
              >
                {icons[card.type]}
              </span>
              <p className="mt-2 text-2xl font-bold">
                {data
                  ? pending.filter((i) =>
                      card.type === 'followup'
                        ? ['lead', 'followup'].includes(i.kind)
                        : i.kind === card.type,
                    ).length
                  : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
            </button>
          ))}
        </div>

        <section
          className={`${panel} overflow-hidden`}
          aria-label="Lista de pendientes"
        >
          <div className="space-y-4 border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {(['today', 'upcoming'] as const).map((p) => (
                  <button
                    key={p}
                    aria-pressed={period === p}
                    onClick={() => setPeriod(p)}
                    className={`${button} ${period === p ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200' : ''}`}
                  >
                    {p === 'today'
                      ? `Hoy y vencidos (${pending.length})`
                      : `Próximos (${upcoming.length})`}
                  </button>
                ))}
              </div>
              <button
                className={button}
                onClick={() => void load()}
                disabled={!!busy}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  aria-hidden="true"
                >
                  refresh
                </span>
                Actualizar
              </button>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex-1">
                <span className="sr-only">Buscar por cliente o proyecto</span>
                <input
                  className={input}
                  placeholder="Buscar cliente o proyecto…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label>
                <span className="sr-only">Tipo de pendiente</span>
                <select
                  className={input}
                  value={kind}
                  onChange={(e) =>
                    setKind(e.target.value as Kind | 'all' | 'contacts')
                  }
                >
                  <option value="all">Todos los pendientes</option>
                  <option value="contacts">Contactos y seguimientos</option>
                  {Object.entries(labels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          {loading ? (
            <div
              className="space-y-5 p-6"
              role="status"
              aria-label="Cargando pendientes"
            >
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : !data ? (
            <p className="p-8 text-center text-slate-500">
              No se pudo cargar tu agenda.
            </p>
          ) : visible.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span
                className="material-symbols-outlined text-4xl text-emerald-500"
                aria-hidden="true"
              >
                task_alt
              </span>
              <h2 className="mt-3 font-bold">
                {search || kind !== 'all'
                  ? 'No hay pendientes con estos filtros'
                  : period === 'today'
                    ? 'Estás al día'
                    : 'Sin actividades próximas'}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {search || kind !== 'all'
                  ? 'Prueba otro cliente o tipo de actividad.'
                  : 'Aquí aparecen tus clientes asignados y seguimientos. Puedes programar el próximo contacto desde esta pantalla.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((item) => {
                const phone = phoneNumber(item.phone);
                const overdue = new Date(item.due_at).getTime() < Date.now();
                const contactTask =
                  item.kind === 'lead' || item.kind === 'followup';
                return (
                  <li key={item.key} className="p-5 sm:p-6">
                    <div className="flex gap-4">
                      <div
                        className={`hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:flex ${item.kind === 'reply' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950' : 'bg-blue-50 text-blue-600 dark:bg-blue-950'}`}
                      >
                        <span
                          className="material-symbols-outlined"
                          aria-hidden="true"
                        >
                          {icons[item.kind]}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-blue-600 dark:text-blue-300">
                            {labels[item.kind]}
                          </span>
                          <span className="text-slate-400">·</span>
                          <time
                            dateTime={item.due_at}
                            className="text-slate-500 dark:text-slate-400"
                          >
                            {dateLabel(item.due_at)}
                          </time>
                          {overdue && item.kind !== 'reply' && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                              Pendiente
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 font-bold">{item.title}</h3>
                        <p className="mt-1 text-sm">
                          {item.contact}
                          {item.project && (
                            <span className="text-slate-500 dark:text-slate-400">
                              {' '}
                              · {item.project}
                            </span>
                          )}
                        </p>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          {item.reason}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            className={`${button} text-blue-600 dark:text-blue-300`}
                            to={item.url}
                          >
                            {item.kind === 'reply' || item.kind === 'visit'
                              ? 'Abrir conversación'
                              : item.kind === 'quote'
                                ? 'Ver cotización'
                                : 'Ver lead'}
                          </Link>
                          {phone && (
                            <a className={button} href={`tel:+${phone}`}>
                              <span
                                className="material-symbols-outlined text-base"
                                aria-hidden="true"
                              >
                                call
                              </span>
                              Llamar
                            </a>
                          )}
                          {phone && (
                            <a
                              className={button}
                              href={`https://wa.me/${phone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              WhatsApp
                            </a>
                          )}
                          {item.lead_id &&
                            data.leads.some((l) => l.id === item.lead_id) && (
                              <button
                                className={button}
                                disabled={!!busy}
                                onClick={() => openForm(item.lead_id)}
                              >
                                Programar seguimiento
                              </button>
                            )}
                          {item.completable && (
                            <button
                              className={`${button} text-emerald-700 dark:text-emerald-300`}
                              disabled={!!busy}
                              onClick={() => void complete(item)}
                            >
                              {busy === item.key
                                ? 'Guardando…'
                                : contactTask
                                  ? 'Registrar contacto realizado'
                                  : item.kind === 'visit'
                                    ? 'Visita realizada'
                                    : 'Marcar revisada'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {data && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Actualizado: {dateLabel(data.generated_at)} · Hora de Colombia. Los
            pendientes se actualizan cada minuto.
          </p>
        )}
      </div>
    </CrmLayout>
  );
}
