import React, { useState } from 'react';
import CrmLayout from './CrmLayout';

// Mock Data for Automations
const automations = [
  {
    id: 1,
    title: 'Nutrición de Leads Premium',
    project: 'Residencial Esmeralda',
    status: 'active',
    activeLeads: '1,240',
    conversion: '18.5%',
    icon: 'apartment'
  },
  {
    id: 2,
    title: 'Seguimiento Post-Visita',
    project: 'Brighthouse Towers',
    status: 'active',
    activeLeads: '458',
    conversion: '12.2%',
    icon: 'apartment'
  },
  {
    id: 3,
    title: 'Campaña Hot Sale 2024',
    project: 'Villas del Mar',
    status: 'paused',
    activeLeads: '0',
    conversion: '--',
    icon: 'apartment'
  },
  {
    id: 4,
    title: 'Recuperación de Leads Fríos',
    project: 'Global Portfolio',
    status: 'draft',
    activeLeads: '--',
    conversion: '--',
    icon: 'apartment'
  }
];

const AutomationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'paused' | 'draft'>('active');

  const filteredAutomations = automations.filter(auto => {
    if (activeTab === 'active') return auto.status === 'active';
    if (activeTab === 'paused') return auto.status === 'paused';
    if (activeTab === 'draft') return auto.status === 'draft';
    return true;
  });

  return (
    <CrmLayout 
      title="Automatizaciones Inteligentes" 
      subtitle="Gestiona y optimiza tus flujos de conversión de leads con IA."
      actions={
        <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all transform active:scale-95">
          <span className="material-symbols-outlined">add</span>
          <span>Nueva automatización</span>
        </button>
      }
    >
      <div className="flex flex-col gap-8">
        
        {/* Tabs Navigation */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('active')}
              className={`pb-4 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'active' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              <span>Activos</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'active' ? 'bg-blue-600/10' : 'bg-slate-100 dark:bg-slate-800'}`}>12</span>
            </button>
            <button 
              onClick={() => setActiveTab('paused')}
              className={`pb-4 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'paused' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              <span>Pausados</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'paused' ? 'bg-blue-600/10' : 'bg-slate-100 dark:bg-slate-800'}`}>4</span>
            </button>
            <button 
              onClick={() => setActiveTab('draft')}
              className={`pb-4 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'draft' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              <span>Borradores</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'draft' ? 'bg-blue-600/10' : 'bg-slate-100 dark:bg-slate-800'}`}>8</span>
            </button>
          </div>
        </div>

        {/* Automation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAutomations.map(auto => (
            <div key={auto.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border ${auto.status === 'draft' ? 'border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-600/50' : 'border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-blue-600/5'} transition-all ${auto.status === 'paused' ? 'opacity-80 hover:opacity-100' : ''}`}>
              
              <div className="flex justify-between items-start mb-4">
                {auto.status === 'active' && (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <span className="size-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Activo
                  </div>
                )}
                {auto.status === 'paused' && (
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Pausado
                  </div>
                )}
                {auto.status === 'draft' && (
                  <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Borrador
                  </div>
                )}
                <button className="text-slate-400 hover:text-blue-600 transition-colors">
                  <span className="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-slate-900 dark:text-white text-lg font-bold mb-1">{auto.title}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                  <span className="material-symbols-outlined text-[16px]">{auto.icon}</span>
                  {auto.project}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Leads Activos</p>
                  <p className="text-slate-900 dark:text-white text-lg font-extrabold tracking-tight">{auto.activeLeads}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Conversión</p>
                  <p className={`${auto.status === 'active' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'} text-lg font-extrabold tracking-tight`}>{auto.conversion}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {auto.status === 'draft' ? (
                  <button className="flex-1 bg-blue-600 text-white hover:bg-blue-700 transition-all py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 shadow-md shadow-blue-600/10">
                    Continuar
                  </button>
                ) : (
                  <button className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    Editar
                  </button>
                )}
                
                {auto.status !== 'draft' && (
                  <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Duplicar">
                    <span className="material-symbols-outlined text-[20px]">content_copy</span>
                  </button>
                )}
                
                {auto.status === 'active' && (
                  <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Pausar">
                    <span className="material-symbols-outlined text-[20px]">pause_circle</span>
                  </button>
                )}
                 {auto.status === 'paused' && (
                  <button className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Reanudar">
                    <span className="material-symbols-outlined text-[20px]">play_circle</span>
                  </button>
                )}
                {auto.status === 'draft' && (
                   <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                   <span className="material-symbols-outlined text-[20px]">delete</span>
                 </button>
                )}
              </div>
            </div>
          ))}

          {/* Add New Automation Placeholder - Always visible or only on some tabs? Assuming always or active */}
          <button className="group flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:bg-blue-600/5 hover:border-blue-600 transition-all gap-4 min-h-[300px]">
            <div className="size-14 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">add_circle</span>
            </div>
            <div className="text-center">
              <p className="text-slate-900 dark:text-white font-bold">Crear automatización</p>
              <p className="text-slate-500 text-xs">Usa una plantilla o empieza de cero</p>
            </div>
          </button>
        </div>

        {/* Stats Overview Summary */}
        <div className="mt-4 p-8 bg-[#0B1120] rounded-2xl text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-10">
            <span className="material-symbols-outlined text-[120px]">auto_awesome</span>
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="text-2xl font-bold mb-2">Impacto en el Negocio</h2>
              <p className="text-slate-400">Tus automatizaciones han ahorrado un total de <span className="text-emerald-500 font-bold">142 horas</span> de trabajo manual este mes.</p>
            </div>
            <div className="flex gap-12">
              <div className="text-center">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Tasa Promedio</p>
                <p className="text-4xl font-extrabold">15.4%</p>
                <p className="text-emerald-500 text-xs font-bold mt-1 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> +2.1%
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Leads</p>
                <p className="text-4xl font-extrabold">4.8k</p>
                <p className="text-emerald-500 text-xs font-bold mt-1 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> +12%
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </CrmLayout>
  );
};

export default AutomationsPage;