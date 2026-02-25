import React from 'react';
import CrmLayout from './CrmLayout';
import { useParams, Link } from 'react-router-dom';

interface Unit {
  id: string;
  code: string;
  tower: string;
  floor: number;
  area: number;
  price: number;
  status: 'available' | 'process' | 'reserved' | 'sold';
  agent?: string;
}

const ProjectUnitsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Mock User Role (Same as ProjectsPage)
  const userRole = localStorage.getItem('user_role') || 'admin';

  // Mock data for units
  const allUnits: Unit[] = [
    { id: '1', code: 'A-204', tower: 'Torre Norte', floor: 2, area: 85, price: 450000000, status: 'available', agent: 'Carlos Ruiz' },
    { id: '2', code: 'B-501', tower: 'Torre Sur', floor: 5, area: 120, price: 620000000, status: 'process', agent: 'Ana Milena' },
    { id: '3', code: 'A-102', tower: 'Torre Norte', floor: 1, area: 92, price: 480000000, status: 'reserved', agent: 'Roberto Gómez' },
    { id: '4', code: 'C-303', tower: 'Torre Este', floor: 3, area: 78, price: 390000000, status: 'reserved', agent: 'Lucía Fernández' },
    { id: '5', code: 'B-804', tower: 'Torre Sur', floor: 8, area: 110, price: 580000000, status: 'sold', agent: 'Carlos Ruiz' },
    { id: '6', code: 'A-405', tower: 'Torre Norte', floor: 4, area: 85, price: 455000000, status: 'sold', agent: 'Elena Pardo' },
  ];

  // Filter units for Agents: Agents can see all units but with restricted actions
  const units = allUnits;

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'available':
        return <span className="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Disponible</span>;
      case 'process':
        return <span className="bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> En proceso</span>;
      case 'reserved':
        return <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Separada</span>;
      case 'sold':
        return <span className="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Vendida</span>;
      default:
        return null;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <CrmLayout 
      title="Unidades (Apartamentos)" 
      subtitle="Inventario en tiempo real y gestión comercial por torre."
      actions={
        <div className="flex items-center gap-3">
           <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar
          </button>
          <button className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
            <span className="material-symbols-outlined">add_circle</span>
            {userRole === 'admin' ? 'Nueva Unidad' : 'Registrar Venta'}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        
        {/* Breadcrumbs / Project Context */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
           <Link to="/crm/projects" className="hover:text-blue-600">Proyectos</Link>
           <span className="material-symbols-outlined text-sm">chevron_right</span>
           <Link to={`/crm/projects/${projectId}`} className="hover:text-blue-600">Residencial Central Park</Link>
           <span className="material-symbols-outlined text-sm">chevron_right</span>
           <span className="text-slate-900 dark:text-white font-medium">Unidades</span>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Torre</label>
                <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200 min-w-[150px]">
                    <option>Todas las Torres</option>
                    <option>Torre Norte</option>
                    <option>Torre Sur</option>
                    <option>Torre Este</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200 min-w-[150px]">
                    <option>Todos los Estados</option>
                    <option>Disponible</option>
                    <option>En proceso</option>
                    <option>Separada</option>
                    <option>Vendida</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agente</label>
                <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200 min-w-[150px]">
                    <option>Cualquier Agente</option>
                    <option>Carlos Ruiz</option>
                    <option>Ana Milena</option>
                </select>
            </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rango de Precio</label>
                <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200 min-w-[150px]">
                    <option>Cualquier precio</option>
                    <option>Menos de $400M</option>
                    <option>$400M - $600M</option>
                    <option>Más de $600M</option>
                </select>
            </div>
            <div className="ml-auto pt-5">
                <button className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Limpiar Filtros
                </button>
            </div>
        </div>

        {/* Units Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Torre</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Piso</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Área M²</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Agente Asignado</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{unit.code}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{unit.tower}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-center">{unit.floor}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-center">{unit.area} m²</td>
                        <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(unit.price)}</td>
                        <td className="px-6 py-4">
                            {getStatusBadge(unit.status)}
                        </td>
                        <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <div className="size-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                    {unit.agent?.substring(0,2).toUpperCase()}
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-300">{unit.agent}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                             {/* Actions Menu - Simplified for now */}
                             <div className="flex items-center justify-end gap-2">
                               {userRole === 'admin' && (
                                 <button className="text-slate-400 hover:text-blue-600 transition-colors" title="Editar">
                                    <span className="material-symbols-outlined">edit</span>
                                </button>
                               )}
                               {userRole === 'agent' && unit.status === 'available' && (
                                 <button className="text-emerald-500 hover:text-emerald-700 transition-colors bg-emerald-50 px-2 py-1 rounded text-xs font-bold" title="Reservar">
                                    Reservar
                                </button>
                               )}
                               <button className="text-slate-400 hover:text-blue-600 transition-colors">
                                  <span className="material-symbols-outlined">more_vert</span>
                              </button>
                             </div>
                        </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
           {/* Pagination */}
           <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <span className="text-sm text-slate-500">Mostrando <span className="font-bold text-slate-900 dark:text-white">1</span> a <span className="font-bold text-slate-900 dark:text-white">6</span> de <span className="font-bold text-slate-900 dark:text-white">142</span> unidades</span>
                <div className="flex gap-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">1</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-colors text-sm font-medium">2</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-colors text-sm font-medium">3</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
           </div>
        </div>

        {/* Footer Summary */}
        <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <div className="flex gap-4">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Resumen:</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 42 Disponibles</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 18 En proceso</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> 82 Vendidas</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-slate-400">Ventas totales:</span>
                <span className="text-xl font-black text-blue-600">$45.280.000.000</span>
            </div>
        </div>

      </div>
    </CrmLayout>
  );
};

export default ProjectUnitsPage;