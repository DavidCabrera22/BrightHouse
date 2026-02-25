import React from 'react';
import CrmLayout from './CrmLayout';
import { useParams, Link } from 'react-router-dom';

const ProjectDashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const userRole = localStorage.getItem('user_role') || 'admin';

  // Mock data fetching based on projectId would happen here
  const project = {
    id: projectId,
    name: 'Torre Vista Marina',
    total_units: 120,
    available_units: 45,
    process_units: 15,
    reserved_units: 10,
    sold_units: 50,
    sold_value: '$12.5M'
  };

  // Agent restriction: Agents should only see the Units page, not the dashboard
  // Redirect them or show a simplified view
  if (userRole === 'agent') {
    return (
      <CrmLayout title="Proyecto" subtitle={project.name}>
        <div className="flex flex-col items-center justify-center h-[50vh] text-center p-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-full mb-4">
            <span className="material-symbols-outlined text-4xl text-blue-600">apartment</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Bienvenido al proyecto {project.name}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
            Como agente inmobiliario, puedes consultar el inventario de unidades disponibles para este proyecto.
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

  return (
    <CrmLayout 
      title="Dashboard de Proyecto" 
      subtitle="Vista consolidada de métricas clave y rendimiento operativo."
      actions={
        <div className="flex items-center gap-3">
           <Link to={`/crm/projects/${projectId}/units`} className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all">
            <span className="material-symbols-outlined">add_circle</span>
            Agregar unidad
          </Link>
          <button className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar Informe
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        
        {/* Navigation Tabs (Sub-menu for Project) */}
        <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 mb-2">
            <Link to={`/crm/projects/${projectId}`} className="pb-3 border-b-2 border-blue-600 text-blue-600 font-bold text-sm">Resumen</Link>
            <Link to={`/crm/projects/${projectId}/units`} className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium text-sm">Unidades</Link>
            <Link to="#" className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium text-sm">Agentes</Link>
            <Link to="#" className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium text-sm">Documentos</Link>
            <Link to="#" className="pb-3 border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 font-medium text-sm">Analítica</Link>
        </div>

        {/* Quick Actions & Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Resumen Ejecutivo</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Vista consolidada de métricas clave y rendimiento operativo.</p>
          </div>
          <div className="flex gap-3">
             <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              <span className="material-symbols-outlined text-blue-600">groups</span>
              Asignar agentes
            </button>
            <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
              <span className="material-symbols-outlined text-blue-600">auto_fix</span>
              Generar unidades
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total unidades</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{project.total_units}</span>
              <span className="text-xs font-bold text-slate-400">Total</span>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-full"></div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Disponibles</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{project.available_units}</span>
              <span className="text-xs font-bold text-emerald-500">+5%</span>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 w-[37%]"></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">En proceso</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{project.process_units}</span>
              <span className="text-xs font-bold text-red-500">-2%</span>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 w-[12%]"></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Separadas</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{project.reserved_units}</span>
              <span className="text-xs font-bold text-red-500">-1%</span>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 w-[8%]"></div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Vendidas</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{project.sold_units}</span>
              <span className="text-xs font-bold text-emerald-500">+12%</span>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-[41%]"></div>
            </div>
          </div>

          <div className="bg-blue-600 p-5 rounded-2xl border border-blue-600 shadow-lg shadow-blue-600/10">
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Valor vendido</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{project.sold_value}</span>
              <span className="text-xs font-bold text-emerald-400">+8%</span>
            </div>
            <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white w-[65%]"></div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Trend */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Ventas por Mes</h4>
                <p className="text-sm text-slate-500">Volumen de transacciones mensuales</p>
              </div>
              <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200">
                <option>Últimos 6 meses</option>
                <option>Año 2023</option>
              </select>
            </div>
            <div className="flex-1 flex items-end justify-between gap-4 h-64 min-h-[250px] relative">
              {/* Chart Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
                <div className="w-full border-t border-slate-100 dark:border-slate-800"></div>
              </div>
              
              {/* Bars */}
              {[
                { mon: 'ENE', val: '$1.2M', h: '40%' },
                { mon: 'FEB', val: '$2.4M', h: '65%' },
                { mon: 'MAR', val: '$1.9M', h: '55%' },
                { mon: 'ABR', val: '$3.1M', h: '85%' },
                { mon: 'MAY', val: '$3.8M', h: '95%', active: true },
                { mon: 'JUN', val: '$2.8M', h: '75%' },
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col justify-end group z-10">
                  <div className={`${item.active ? 'bg-blue-600' : 'bg-blue-600/20'} hover:bg-blue-600 transition-all rounded-t-lg w-full relative`} style={{ height: item.h }}>
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{item.val}</span>
                  </div>
                  <p className={`text-center text-[10px] mt-4 font-bold ${item.active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{item.mon}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Estado de Unidades</h4>
            <p className="text-sm text-slate-500 mb-8">Distribución por fase de venta</p>
            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="relative size-48">
                {/* Fake Donut Chart SVG */}
                <svg className="size-full" viewBox="0 0 36 36">
                  <path className="text-slate-100 dark:text-slate-800" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4"></path>
                  <path className="text-blue-600" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="41, 100" strokeLinecap="round" strokeWidth="4"></path>
                  <path className="text-emerald-500" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="37, 100" strokeDashoffset="-41" strokeLinecap="round" strokeWidth="4"></path>
                  <path className="text-amber-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="12, 100" strokeDashoffset="-78" strokeLinecap="round" strokeWidth="4"></path>
                  <path className="text-blue-400" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="8, 100" strokeDashoffset="-90" strokeLinecap="round" strokeWidth="4"></path>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">120</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Unidades</span>
                </div>
              </div>
              <div className="w-full mt-8 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-blue-600"></div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Vendidas (41%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Dispon. (37%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-amber-400"></div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Proceso (12%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="size-3 rounded-full bg-blue-400"></div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Separ. (8%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">Últimas Actualizaciones</h4>
            <button className="text-blue-600 text-sm font-bold hover:underline">Ver todo</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Unidad</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Agente</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500 text-sm">home</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">Apartamento 402-B</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-blue-600/10 flex items-center justify-center overflow-hidden">
                        <img alt="Agente" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDaiNopVna7V3raBAFvRFQqCPFe9ZeDXQGNGMi_OiFKP-w-PyufbvspiX1aGwqfIaPQhuI3_3s1mlqoPDf4TdVwatEOjoG_tz2FUmgGI1uVMl_3lmy9M05OU0VHs3DzcfnN4KLrayTYwb26aY0HcIq117rn5Yhw85Of49fBP091gmiF1yCe0NGpru2-p31iryH27JG9cFhQlfnAZkV5Sx1RYn0-tJbSd767AOXtA3ysK_XQCiqeSy2kemjGTHsszj8g51htQX3TEU8" />
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-300">Javier López</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase">Vendido</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">Hoy, 10:45 AM</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right">$245,000</td>
                </tr>
                <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500 text-sm">home</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">Penthouse 1201</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-blue-600/10 flex items-center justify-center overflow-hidden">
                        <img alt="Agente" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBB_gfWFK3aPwbS3JwqY61mY5rg41wiy_w37YzpZ8oKu_kO8dFjjJPg9nhKJQNF1nWR9WycZKM3FU2OsiKPdeguzbz2U--4mEXHMasCfzuE8OyJgq7Wmv7c7oh8mNlCcSc7Vx3C760pePrc5fpia-BYa6rDF_loyEMws5bjQHvN-atiMXEqNacoRyX8q3Na-NVFNa2-849DwZFMokPxMo_o0xFathcj6HmMyKp6UQMLj_TMZ0cufSVNBnfBiid9jkeoFmXomwAN23c" />
                      </div>
                      <span className="text-sm text-slate-600 dark:text-slate-300">Lucía Torres</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-[10px] font-black uppercase">Separado</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">Ayer, 4:20 PM</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right">$520,000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </CrmLayout>
  );
};

export default ProjectDashboardPage;