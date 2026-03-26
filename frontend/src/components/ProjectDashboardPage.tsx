import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';
import { useParams, Link } from 'react-router-dom';

interface Project {
  id: string;
  name: string;
  description?: string;
  location?: string;
  total_units: number;
  status: string;
  marketing_plan_type?: string;
  created_at: string;
}

interface Unit {
  id: string;
  code: string;
  status?: string;
  price: number;
  current_status?: { name: string; color_hex: string };
}

interface UnitStats {
  total: number;
  available: number;
  inProcess: number;
  reserved: number;
  sold: number;
  soldValue: number;
}

const ProjectDashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const userRole = localStorage.getItem('user_role') || 'admin';
  const token = localStorage.getItem('access_token');
  const headers = { 'Authorization': `Bearer ${token}` };

  const [project, setProject] = useState<Project | null>(null);
  const [unitStats, setUnitStats] = useState<UnitStats>({
    total: 0, available: 0, inProcess: 0, reserved: 0, sold: 0, soldValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const [projectRes, unitsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { headers }),
        fetch(`/api/units?project_id=${projectId}`, { headers }),
      ]);

      if (projectRes.ok) {
        setProject(await projectRes.json());
      }

      if (unitsRes.ok) {
        const units: Unit[] = await unitsRes.json();
        const filtered = units.filter(u => u);

        const stats: UnitStats = {
          total: filtered.length,
          available: 0,
          inProcess: 0,
          reserved: 0,
          sold: 0,
          soldValue: 0,
        };

        filtered.forEach(unit => {
          const statusName = unit.current_status?.name?.toLowerCase() || unit.status?.toLowerCase() || '';
          if (statusName.includes('disponible') || statusName.includes('available')) {
            stats.available++;
          } else if (statusName.includes('proceso') || statusName.includes('process')) {
            stats.inProcess++;
          } else if (statusName.includes('separ') || statusName.includes('reserv')) {
            stats.reserved++;
          } else if (statusName.includes('vend') || statusName.includes('sold')) {
            stats.sold++;
            stats.soldValue += Number(unit.price) || 0;
          } else {
            stats.available++;
          }
        });

        setUnitStats(stats);
      }
    } catch (err) {
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (userRole === 'agent') {
    return (
      <CrmLayout title="Proyecto" subtitle={project?.name || 'Cargando...'}>
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4">
            <span className="material-symbols-outlined text-4xl text-blue-600">apartment</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Bienvenido al proyecto {project?.name}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            Como agente inmobiliario, puedes consultar el inventario de unidades disponibles.
          </p>
          <Link
            to={`/crm/projects/${projectId}/units`}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined">grid_view</span>
            Ver Unidades Disponibles
          </Link>
        </div>
      </CrmLayout>
    );
  }

  const soldPct = unitStats.total > 0 ? Math.round((unitStats.sold / unitStats.total) * 100) : 0;
  const availPct = unitStats.total > 0 ? Math.round((unitStats.available / unitStats.total) * 100) : 0;
  const procPct = unitStats.total > 0 ? Math.round((unitStats.inProcess / unitStats.total) * 100) : 0;
  const resvPct = unitStats.total > 0 ? Math.round((unitStats.reserved / unitStats.total) * 100) : 0;

  return (
    <CrmLayout
      title={loading ? 'Cargando...' : `Dashboard — ${project?.name}`}
      subtitle={project?.location || ''}
      actions={
        <div className="flex items-center gap-3">
          <Link
            to={`/crm/projects/${projectId}/units`}
            className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
          >
            <span className="material-symbols-outlined">grid_view</span>
            Ver Unidades
          </Link>
          <button className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">

        {/* Sub-navigation */}
        <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800">
          <Link to={`/crm/projects/${projectId}`} className="pb-3 border-b-2 border-blue-600 text-blue-600 font-bold text-sm">Resumen</Link>
          <Link to={`/crm/projects/${projectId}/units`} className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium text-sm">Unidades</Link>
          <Link to={`/crm/projects/${projectId}/documents`} className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium text-sm">Documentos</Link>
          <Link to={`/crm/projects/${projectId}/analytics`} className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium text-sm">Analítica</Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Project Info */}
            {project && (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">{project.name}</h3>
                  {project.description && <p className="text-slate-500 mt-1">{project.description}</p>}
                  <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                    {project.location && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {project.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                      Desde {new Date(project.created_at).toLocaleDateString('es')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      project.status === 'active'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {project.status === 'active' ? 'Activo' : project.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={fetchProjectData}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                  >
                    <span className="material-symbols-outlined text-blue-600 text-[18px]">refresh</span>
                    Actualizar
                  </button>
                  <Link
                    to={`/crm/projects/${projectId}/units`}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 transition-all"
                  >
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">add</span>
                    Agregar unidades
                  </Link>
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: 'Total unidades', value: unitStats.total, color: 'bg-blue-600', pct: 100, indicator: '' },
                { label: 'Disponibles', value: unitStats.available, color: 'bg-emerald-500', pct: availPct, indicator: 'text-emerald-500' },
                { label: 'En proceso', value: unitStats.inProcess, color: 'bg-amber-400', pct: procPct, indicator: 'text-amber-500' },
                { label: 'Separadas', value: unitStats.reserved, color: 'bg-blue-400', pct: resvPct, indicator: 'text-blue-400' },
                { label: 'Vendidas', value: unitStats.sold, color: 'bg-blue-600', pct: soldPct, indicator: 'text-emerald-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{stat.value}</span>
                    {stat.pct !== 100 && (
                      <span className={`text-xs font-bold ${stat.indicator}`}>{stat.pct}%</span>
                    )}
                  </div>
                  <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${stat.color} rounded-full transition-all`} style={{ width: `${stat.pct}%` }}></div>
                  </div>
                </div>
              ))}

              {/* Valor vendido */}
              <div className="bg-blue-600 p-5 rounded-2xl border border-blue-600 shadow-lg shadow-blue-600/10">
                <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Valor vendido</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">
                    ${unitStats.soldValue >= 1000000
                      ? `${(unitStats.soldValue / 1000000).toFixed(1)}M`
                      : unitStats.soldValue >= 1000
                      ? `${(unitStats.soldValue / 1000).toFixed(0)}k`
                      : unitStats.soldValue}
                  </span>
                </div>
                <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{ width: `${soldPct}%` }}></div>
                </div>
              </div>
            </div>

            {/* Visual Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Bar Chart Placeholder */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white">Distribución de Unidades</h4>
                    <p className="text-sm text-slate-500">Estado actual del inventario</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Vendidas', value: unitStats.sold, total: unitStats.total, color: 'bg-blue-600' },
                    { label: 'Disponibles', value: unitStats.available, total: unitStats.total, color: 'bg-emerald-500' },
                    { label: 'En Proceso', value: unitStats.inProcess, total: unitStats.total, color: 'bg-amber-400' },
                    { label: 'Separadas', value: unitStats.reserved, total: unitStats.total, color: 'bg-blue-400' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {item.value} ({item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%)
                        </span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-500`}
                          style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut Chart */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Estado de Unidades</h4>
                <p className="text-sm text-slate-500 mb-6">Distribución por fase de venta</p>
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="relative size-40">
                    <svg className="size-full" viewBox="0 0 36 36">
                      <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                      <path className="text-blue-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${soldPct}, 100`} strokeLinecap="round" strokeWidth="4"></path>
                      <path className="text-emerald-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${availPct}, 100`} strokeDashoffset={`-${soldPct}`} strokeLinecap="round" strokeWidth="4"></path>
                      <path className="text-amber-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${procPct}, 100`} strokeDashoffset={`-${soldPct + availPct}`} strokeLinecap="round" strokeWidth="4"></path>
                      <path className="text-blue-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${resvPct}, 100`} strokeDashoffset={`-${soldPct + availPct + procPct}`} strokeLinecap="round" strokeWidth="4"></path>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{unitStats.total}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Unidades</span>
                    </div>
                  </div>
                  <div className="w-full mt-6 grid grid-cols-2 gap-3">
                    {[
                      { label: `Vendidas (${soldPct}%)`, color: 'bg-blue-600' },
                      { label: `Dispon. (${availPct}%)`, color: 'bg-emerald-500' },
                      { label: `Proceso (${procPct}%)`, color: 'bg-amber-400' },
                      { label: `Separ. (${resvPct}%)`, color: 'bg-blue-400' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className={`size-3 rounded-full ${item.color}`}></div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Acceso Rápido</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link
                  to={`/crm/projects/${projectId}/units`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                    <span className="material-symbols-outlined text-blue-600 group-hover:text-white transition-colors">grid_view</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Inventario</p>
                    <p className="text-xs text-slate-500">{unitStats.available} disponibles</p>
                  </div>
                </Link>
                <Link
                  to="/crm/leads"
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                    <span className="material-symbols-outlined text-emerald-600 group-hover:text-white transition-colors">group</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Leads</p>
                    <p className="text-xs text-slate-500">Ver prospectos</p>
                  </div>
                </Link>
                <Link
                  to={`/crm/projects/${projectId}/analytics`}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-900 hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-all group"
                >
                  <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                    <span className="material-symbols-outlined text-purple-600 group-hover:text-white transition-colors">analytics</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">Analítica</p>
                    <p className="text-xs text-slate-500">Reportes IA</p>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </CrmLayout>
  );
};

export default ProjectDashboardPage;
