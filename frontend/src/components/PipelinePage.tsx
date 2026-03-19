import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';

// Define types based on backend entity + new fields
interface Lead {
  id: string;
  name: string;
  project_id: string;
  status: string;
  source: string;
  created_at: string;
  project?: { name: string };
  potential_value?: number;
  ai_score?: number;
  priority?: string;
  interested_in?: string;
  assigned_agent?: { name: string; avatar?: string };
}

// Map frontend status columns to backend status values
const PIPELINE_COLUMNS = [
  { id: 'new', title: 'Nuevo', color: 'blue' },
  { id: 'contacted', title: 'Contactado', color: 'indigo' },
  { id: 'qualified', title: 'Calificado', color: 'teal' },
  { id: 'visit_scheduled', title: 'Visita Agendada', color: 'orange' },
  { id: 'negotiation', title: 'Negociación', color: 'yellow' },
  { id: 'won', title: 'Ganado', color: 'emerald' },
  { id: 'lost', title: 'Perdido', color: 'red' }
];

const colorMap: Record<string, { bg: string, border: string, bar: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-500', bar: 'bg-blue-500' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-500', bar: 'bg-indigo-500' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-500', bar: 'bg-teal-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-500', bar: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-500', bar: 'bg-yellow-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-500', bar: 'bg-emerald-500' },
  red: { bg: 'bg-red-50', border: 'border-red-500', bar: 'bg-red-500' },
};

const PipelinePage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState('All Projects');
  const [selectedAdvisor, setSelectedAdvisor] = useState('All Advisors');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const res = await fetch('/api/leads', { headers });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('leadId', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('leadId');
    if (!leadId) return;

    // Optimistic update
    const leadToUpdate = leads.find(l => l.id === leadId);
    if (leadToUpdate && leadToUpdate.status !== newStatus) {
      const originalStatus = leadToUpdate.status;
      
      // Update local state immediately
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      setUpdatingId(leadId);

      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`/api/leads/${leadId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });

        if (!res.ok) {
          throw new Error('Failed to update status');
        }
      } catch (error) {
        console.error('Error updating lead status:', error);
        // Revert on error
        setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: originalStatus } : l));
        alert('No se pudo actualizar el estado del lead');
      } finally {
        setUpdatingId(null);
      }
    }
  };

  // Calculate Metrics
  const totalPipelineValue = leads.reduce((sum, lead) => sum + (Number(lead.potential_value) || 0), 0);
  const activeOpportunities = leads.filter(l => l.status !== 'won' && l.status !== 'lost').length;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const lostLeads = leads.filter(l => l.status === 'lost').length;
  const totalClosed = wonLeads + lostLeads;
  const conversionRate = totalClosed > 0 ? ((wonLeads / totalClosed) * 100).toFixed(1) : '0.0';
  
  // Group leads by status
  const leadsByStatus = PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.id] = leads.filter(l => l.status === col.id || (col.id === 'visit_scheduled' && l.status === 'pending')); 
    return acc;
  }, {} as Record<string, Lead[]>);

  // Helper to get column total value
  const getColumnValue = (statusId: string) => {
    const columnLeads = leadsByStatus[statusId] || [];
    const total = columnLeads.reduce((sum, lead) => sum + (Number(lead.potential_value) || 0), 0);
    return total >= 1000000 
      ? `$${(total / 1000000).toFixed(1)}M` 
      : `$${(total / 1000).toFixed(0)}k`;
  };

  if (loading) {
    return (
      <CrmLayout title="Pipeline de Ventas" subtitle="Cargando...">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout 
      title="Pipeline de Ventas Inteligente" 
      subtitle="Q3 2024 Targets"
      actions={
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <select 
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option>Todos los Proyectos</option>
                <option>Skyline Tower</option>
                <option>Ocean Breeze</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">expand_more</span>
            </div>
            <div className="relative">
              <select 
                value={selectedAdvisor}
                onChange={(e) => setSelectedAdvisor(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option>Todos los Asesores</option>
                <option>David Miller</option>
                <option>Sarah Jenkins</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-lg pointer-events-none">expand_more</span>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Nueva oportunidad</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full gap-6">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
          {/* Total Pipeline Value */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Valor Total Pipeline</p>
              <span className="bg-emerald-50 dark:bg-emerald-900/30 p-1.5 rounded-md text-emerald-500">
                <span className="material-symbols-outlined text-lg">paid</span>
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              ${(totalPipelineValue / 1000000).toFixed(1)}M
            </h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-emerald-500 text-xs font-bold flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-xs mr-0.5">trending_up</span> 12%
              </span>
              <span className="text-slate-400 text-xs">vs mes anterior</span>
            </div>
          </div>

          {/* Active Opportunities */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Oportunidades Activas</p>
              <span className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md text-blue-500">
                <span className="material-symbols-outlined text-lg">groups</span>
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{activeOpportunities}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-emerald-500 text-xs font-bold flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-xs mr-0.5">trending_up</span> 5
              </span>
              <span className="text-slate-400 text-xs">nuevos esta semana</span>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Tasa de Conversión</p>
              <span className="bg-purple-50 dark:bg-purple-900/30 p-1.5 rounded-md text-purple-600">
                <span className="material-symbols-outlined text-lg">filter_alt</span>
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{conversionRate}%</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-emerald-500 text-xs font-bold flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-xs mr-0.5">trending_up</span> 2.1%
              </span>
              <span className="text-slate-400 text-xs">sobre objetivo</span>
            </div>
          </div>

          {/* Avg Closing Time */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">Tiempo Cierre Prom.</p>
              <span className="bg-orange-50 dark:bg-orange-900/30 p-1.5 rounded-md text-orange-600">
                <span className="material-symbols-outlined text-lg">timer</span>
              </span>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">24 Días</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-emerald-500 text-xs font-bold flex items-center bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                <span className="material-symbols-outlined text-xs mr-0.5">arrow_downward</span> 3 días
              </span>
              <span className="text-slate-400 text-xs">más rápido que prom.</span>
            </div>
          </div>

          {/* AI Prediction */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 shadow-lg border border-slate-700 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wide flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">auto_awesome</span> Predicción IA
              </p>
            </div>
            <h3 className="text-2xl font-bold tracking-tight relative z-10">$1.8M</h3>
            <div className="flex items-center gap-1.5 mt-2 relative z-10">
              <span className="text-emerald-400 text-xs font-bold">94% Confianza</span>
              <span className="text-blue-300/60 text-xs">Cierre este mes</span>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex h-full gap-4 min-w-max">
            {PIPELINE_COLUMNS.map(col => {
              const colLeads = leadsByStatus[col.id] || [];
              const colValue = getColumnValue(col.id);
              const colors = colorMap[col.color];
              
              return (
                <div 
                  key={col.id} 
                  className="w-80 flex flex-col shrink-0"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-700 dark:text-slate-200">{col.title}</h3>
                      <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded-full">
                        {colLeads.length}
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-blue-600 transition-colors">
                      <span className="material-symbols-outlined text-lg">add</span>
                    </button>
                  </div>

                  {/* Value Bar */}
                  <div className={`bg-white dark:bg-slate-800 rounded-t-lg border-x border-t border-slate-100 dark:border-slate-700 p-3 pb-2 border-b-4 ${colors.border}`}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500 font-medium">Valor Potencial</span>
                      <span className="text-slate-900 dark:text-white font-bold">{colValue}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full ${colors.bar} w-1/2 rounded-full`}></div>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className={`bg-slate-50/50 dark:bg-slate-800/30 rounded-b-lg border-x border-b border-slate-100 dark:border-slate-700 p-2 flex-1 overflow-y-auto space-y-3 min-h-[200px] transition-colors ${colLeads.length === 0 ? 'border-dashed' : ''}`}>
                    {colLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        className={`bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md cursor-grab active:cursor-grabbing group transition-all relative overflow-hidden ${updatingId === lead.id ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
                      >
                        
                        {/* Tags */}
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-1">
                            {lead.ai_score && lead.ai_score > 70 && (
                              <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded flex items-center gap-1">
                                <span className="material-symbols-outlined text-[10px]">auto_awesome</span> {lead.ai_score}
                              </span>
                            )}
                            {lead.priority === 'high' && (
                              <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-0.5 rounded">High</span>
                            )}
                             {(!lead.ai_score && !lead.priority) && (
                               <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">Lead</span>
                             )}
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600">
                            <span className="material-symbols-outlined text-lg">more_horiz</span>
                          </button>
                        </div>

                        {/* Content */}
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-0.5">{lead.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                          {lead.project?.name || 'Proyecto General'} 
                          {lead.interested_in ? ` - ${lead.interested_in}` : ''}
                        </p>

                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            ${Number(lead.potential_value || 0).toLocaleString()}
                          </span>
                          <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            {lead.name.charAt(0)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {colLeads.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-24 text-slate-400 dark:text-slate-500 text-xs italic border-2 border-dashed border-slate-200 dark:border-slate-700/50 rounded-lg">
                        Sin leads
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default PipelinePage;
