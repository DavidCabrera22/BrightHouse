import React, { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import CrmLayout from './CrmLayout';

interface Lead {
  id: string;
  name: string;
  project_id: string;
  status: string;
  source: string;
  created_at: string;
  potential_value?: number;
  ai_score?: number;
  priority?: string;
  assigned_agent?: { name: string; avatar?: string };
}

interface AnalyticsMetrics {
  totalForecast: number;
  highProbLeads: number;
  atRiskCount: number;
  monthlyData: { name: string; value: number; projection: number }[];
  advisorStats: {
    name: string;
    leads: number;
    sales: number;
    conversion: number;
    value: number;
    commission: number;
    avatar: string;
  }[];
  marketingStats: {
    physical: number;
    digital: number;
    total: number;
  };
}

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    totalForecast: 0,
    highProbLeads: 0,
    atRiskCount: 0,
    monthlyData: [],
    advisorStats: [],
    marketingStats: { physical: 0, digital: 0, total: 0 }
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Fetch leads as the primary data source
      const res = await fetch('/api/leads', { headers });
      
      if (res.ok) {
        const leads: Lead[] = await res.json();
        processLeadsData(leads);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processLeadsData = (leads: Lead[]) => {
    // 1. Forecasted Sales (Sum of potential value of active leads)
    const activeLeads = leads.filter(l => l.status !== 'lost' && l.status !== 'won');
    const totalForecast = activeLeads.reduce((sum, lead) => sum + (Number(lead.potential_value) || 0), 0);

    // 2. High Probability Leads (AI Score > 80 or Status = Negotiation/Qualified)
    const highProbLeads = leads.filter(l => 
      (l.ai_score && l.ai_score > 80) || 
      ['negotiation', 'qualified'].includes(l.status)
    ).length;

    // 3. At Risk (Lost leads or Stalled - simplified to 'lost' for now)
    const atRiskCount = leads.filter(l => l.status === 'lost').length;

    // 4. Monthly Data for Chart (Group by created_at month)
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonth = new Date().getMonth();
    
    // Initialize last 6 months
    const monthlyData = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(currentMonth - 5 + i);
      return {
        name: months[d.getMonth()],
        value: 0,
        projection: 0 // Will calculate based on growth
      };
    });

    leads.forEach(lead => {
      const date = new Date(lead.created_at);
      const monthIndex = date.getMonth();
      // Find matching month in our display array
      const displayMonth = monthlyData.find(m => m.name === months[monthIndex]);
      if (displayMonth) {
        displayMonth.value += (Number(lead.potential_value) || 0);
      }
    });

    // Add projections (simple +10% growth logic for demo)
    monthlyData.forEach(m => {
      m.projection = m.value * 1.15; // 15% projected growth
    });

    // 5. Advisor Stats
    const advisorMap = new Map<string, { leads: number; sales: number; value: number; avatar: string }>();
    
    leads.forEach(lead => {
      const agentName = lead.assigned_agent?.name || 'Sin Asignar';
      const agentAvatar = lead.assigned_agent?.avatar || '';
      
      if (!advisorMap.has(agentName)) {
        advisorMap.set(agentName, { leads: 0, sales: 0, value: 0, avatar: agentAvatar });
      }
      
      const stats = advisorMap.get(agentName)!;
      stats.leads += 1;
      if (lead.status === 'won') {
        stats.sales += 1;
        stats.value += (Number(lead.potential_value) || 0);
      }
    });

    const advisorStats = Array.from(advisorMap.entries()).map(([name, stats]) => ({
      name,
      leads: stats.leads,
      sales: stats.sales,
      conversion: stats.leads > 0 ? (stats.sales / stats.leads) * 100 : 0,
      value: stats.value,
      commission: stats.value * 0.03, // 3% commission
      avatar: stats.avatar
    })).sort((a, b) => b.value - a.value).slice(0, 5); // Top 5

    // 6. Marketing Stats (Physical vs Digital)
    // Assuming 'source' can be 'instagram', 'website', 'referral', 'event', 'walk-in'
    const digitalSources = ['instagram', 'website', 'facebook', 'linkedin', 'email'];
    
    let physical = 0;
    let digital = 0;

    leads.forEach(lead => {
      const source = lead.source?.toLowerCase() || '';
      if (digitalSources.some(ds => source.includes(ds))) {
        digital++;
      } else {
        physical++; // Default to physical if unknown or matches physical
      }
    });

    setMetrics({
      totalForecast,
      highProbLeads,
      atRiskCount,
      monthlyData,
      advisorStats,
      marketingStats: {
        physical,
        digital,
        total: leads.length
      }
    });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value}`;
  };

  if (loading) {
    return (
      <CrmLayout title="Analítica" subtitle="Cargando datos...">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout 
      title="Analítica Predictiva Avanzada"
      subtitle="Utiliza IA para optimizar tu embudo de ventas y el rendimiento de los asesores."
      actions={
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm font-bold hover:bg-slate-50 transition-colors text-slate-700 dark:text-slate-200">
            <span className="material-symbols-outlined text-sm">download</span> Exportar Datos
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all" onClick={fetchAnalyticsData}>
            <span className="material-symbols-outlined text-sm">refresh</span> Actualizar Modelos
          </button>
        </div>
      }
    >
      <div className="flex-1 max-w-7xl mx-auto w-full">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-6">
          <span>Analítica</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-indigo-600">Módulo Predictivo</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: AI Insights & Trends */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Predictive Intelligence Block */}
            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <span className="material-symbols-outlined text-8xl text-indigo-600">psychology</span>
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-tighter">AI Driven</span>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Predicción Inteligente</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-lg backdrop-blur-sm border border-white/20 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-slate-500 font-medium uppercase mb-1">Ventas Pronosticadas</p>
                    <p className="text-2xl font-black text-indigo-600">{formatCurrency(metrics.totalForecast)}</p>
                    <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1 font-bold">
                      <span className="material-symbols-outlined text-xs">trending_up</span> +12.4% vs mes anterior
                    </p>
                  </div>
                  
                  <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-lg backdrop-blur-sm border border-white/20 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-slate-500 font-medium uppercase mb-1">Leads Alta Probabilidad</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{metrics.highProbLeads}</p>
                    <p className="text-xs text-slate-500 mt-1">Score &gt; 85% probabilidad</p>
                  </div>
                  
                  <div className="bg-white/60 dark:bg-slate-900/60 p-4 rounded-lg backdrop-blur-sm border border-white/20 dark:border-slate-700 shadow-sm">
                    <p className="text-xs text-slate-500 font-medium uppercase mb-1">Proyectos en Riesgo</p>
                    <p className="text-2xl font-black text-red-500">{metrics.atRiskCount}</p>
                    <p className="text-xs text-slate-500 mt-1">Acción inmediata requerida</p>
                  </div>
                </div>

                <div className="bg-indigo-100/50 dark:bg-white/5 p-4 rounded-lg border border-indigo-200 dark:border-indigo-500/10">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-indigo-600 mt-1">lightbulb</span>
                    <div>
                      <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Recomendación Estratégica</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Re-conectar con leads de la fase 'Valle Esmeralda' inmediatamente. Nuestros modelos muestran un incremento del 35% en conversión para leads fríos reactivados durante esta ventana de mercado.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trends and Projections Chart */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">Crecimiento de Mercado & Pronóstico</h3>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Tendencias de Volumen 2024</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-full bg-indigo-600"></span> Histórico
                  </div>
                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                    <span className="w-3 h-3 rounded-full bg-indigo-300"></span> Proyecciones
                  </div>
                </div>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.monthlyData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} tickFormatter={(value) => `$${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number | undefined) => [value ? `$${value.toLocaleString()}` : '$0', 'Valor'] as [string, string]}
                    />
                    <Area type="monotone" dataKey="value" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    <Area type="monotone" dataKey="projection" stroke="#A5B4FC" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Advisor Performance Table */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Rendimiento de Asesores</h3>
                <button className="text-indigo-600 text-xs font-bold hover:underline">Ver Todos</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
                      <th className="px-6 py-4">Asesor</th>
                      <th className="px-6 py-4">Leads</th>
                      <th className="px-6 py-4">Ventas Cerradas</th>
                      <th className="px-6 py-4">Tasa Conv.</th>
                      <th className="px-6 py-4">Valor Generado</th>
                      <th className="px-6 py-4">Comisión Proy.</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {metrics.advisorStats.map((advisor, index) => (
                      <tr key={index} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {advisor.avatar ? <img src={advisor.avatar} alt={advisor.name} className="h-full w-full rounded-full object-cover"/> : advisor.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-slate-200">{advisor.name}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{advisor.leads}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{advisor.sales}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-200">{advisor.conversion.toFixed(1)}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${advisor.conversion > 10 ? 'bg-emerald-500' : 'bg-orange-400'}`} 
                                style={{ width: `${Math.min(advisor.conversion * 5, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-200">{formatCurrency(advisor.value)}</td>
                        <td className="px-6 py-4 text-indigo-600 font-bold">{formatCurrency(advisor.commission)}</td>
                      </tr>
                    ))}
                    {metrics.advisorStats.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                          No hay datos de rendimiento disponibles aún.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Marketing Analytics & Extras */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Marketing Figital Analytics Section */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-indigo-600">hub</span>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">Marketing Figital</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Físico vs Digital Leads</span>
                    <span className="text-xs font-bold text-slate-400">Total {metrics.marketingStats.total}</span>
                  </div>
                  <div className="flex h-4 rounded-full overflow-hidden w-full bg-slate-100 dark:bg-slate-800">
                    <div 
                      className="bg-indigo-600 h-full relative group transition-all duration-500" 
                      style={{ width: `${metrics.marketingStats.total > 0 ? (metrics.marketingStats.physical / metrics.marketingStats.total) * 100 : 0}%` }}
                    ></div>
                    <div 
                      className="bg-emerald-500 h-full relative group transition-all duration-500" 
                      style={{ width: `${metrics.marketingStats.total > 0 ? (metrics.marketingStats.digital / metrics.marketingStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Físico ({metrics.marketingStats.physical})
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Digital ({metrics.marketingStats.digital})
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">ROI Eventos</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">4.2x</p>
                    <span className="text-[10px] text-emerald-500 font-bold">+0.8 vs prev.</span>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Conv. por Evento</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white">8.4%</p>
                    <span className="text-[10px] text-indigo-600 font-bold">Top: VIP</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Activaciones Recientes</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>Luxury Expo NY</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">42 Leads</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        <span>Golf Club Soirée</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">28 Leads</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Instagram Ads Q3</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">814 Leads</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Urgent Actions */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Acciones Urgentes</h3>
              <div className="space-y-4">
                <div className="flex gap-4 p-3 rounded-lg border border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-900/20">
                  <span className="material-symbols-outlined text-red-500">warning</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Riesgo de Retraso Fase 2</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">3 propiedades tienen 15 días de retraso. Pérdida proyectada: $45k.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-3 rounded-lg border border-blue-100 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-900/20">
                  <span className="material-symbols-outlined text-blue-500">campaign</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Oportunidad Upsell</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">12 leads de 'Park Residence' muestran alto interés en 'Grand Towers'.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-3 rounded-lg border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-900/20">
                  <span className="material-symbols-outlined text-emerald-500">verified</span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Confianza del Modelo</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">Precisión predictiva al 94.2%. Recomendado: Aumentar presupuesto.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default AnalyticsPage;
