import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface Lead {
  id: string;
  name: string;
  project_id: string;
  status: string;
  source: string;
  created_at: string;
  project?: { name: string };
}

interface Sale {
  id: string;
  sale_value: number;
  status: string;
  sale_date: string;
}

const statusMap: Record<string, string> = {
  'new': 'Nuevo',
  'contacted': 'Contactado',
  'qualified': 'Calificado',
  'lost': 'Perdido',
  'won': 'Ganado',
  'pending': 'Pendiente',
  'negotiation': 'Negociación'
};

const CrmDashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch Leads
        const leadsRes = await fetch('http://localhost:3000/api/leads', { headers });
        if (leadsRes.ok) {
          const leadsData = await leadsRes.json();
          // Sort by created_at desc
          leadsData.sort((a: Lead, b: Lead) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setLeads(leadsData);
        }

        // Fetch Sales
        const salesRes = await fetch('http://localhost:3000/api/sales', { headers });
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          // Sort by sale_date desc
          salesData.sort((a: Sale, b: Sale) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
          setSales(salesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate Metrics
  const totalLeads = leads.length;
  const newLeadsCount = leads.filter(l => {
    const date = new Date(l.created_at);
    const now = new Date();
    return (now.getTime() - date.getTime()) / (1000 * 3600 * 24) < 7; // Last 7 days
  }).length;

  const qualifiedLeadsCount = leads.filter(l => l.status === 'qualified' || l.status === 'won' || l.status === 'negotiation').length;
  
  const totalSalesValue = sales.reduce((sum, sale) => sum + Number(sale.sale_value), 0);
  const salesCount = sales.length;
  const conversionRate = totalLeads > 0 ? ((salesCount / totalLeads) * 100).toFixed(1) : '0.0';

  // Process data for Chart (Group by month)
  const getChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    // Initialize last 6 months
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      chartData.push({
        name: months[d.getMonth()],
        leads: 0,
        sales: 0
      });
    }

    // Populate Leads
    leads.forEach(l => {
      const date = new Date(l.created_at);
      if (date.getFullYear() === currentYear) {
        const monthName = months[date.getMonth()];
        const entry = chartData.find(d => d.name === monthName);
        if (entry) entry.leads++;
      }
    });

    // Populate Sales
    sales.forEach(s => {
      const date = new Date(s.sale_date);
      if (date.getFullYear() === currentYear) {
        const monthName = months[date.getMonth()];
        const entry = chartData.find(d => d.name === monthName);
        if (entry) entry.sales++;
      }
    });

    return chartData;
  };

  const chartData = getChartData();

  const newLeadButton = (
    <button 
      className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-5 rounded-lg shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
      onClick={() => alert("Nuevo Lead Modal próximamente")}
    >
      <span className="material-symbols-outlined text-[20px]">add</span>
      <span>Nuevo Lead</span>
    </button>
  );

  return (
    <CrmLayout title="Resumen del Panel" actions={newLeadButton}>
      <div className="flex flex-col gap-8">
        
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Nuevos Leads</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{newLeadsCount}</h3>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">group_add</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 12%
              </span>
              <span className="text-slate-400">vs semana anterior</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Calificados por IA</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{qualifiedLeadsCount}</h3>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">auto_awesome</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 8%
              </span>
              <span className="text-slate-400">Alta Intención</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Tasa de Conversión</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{conversionRate}%</h3>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">swap_horiz</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 0.5%
              </span>
              <span className="text-slate-400">Crecimiento estable</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Ventas Proyectadas</p>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-white">${totalSalesValue.toLocaleString()}</h3>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">attach_money</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> 15%
              </span>
              <span className="text-slate-400">Pronóstico Q3</span>
            </div>
          </div>
        </div>

        {/* Middle Section: Chart & Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Rendimiento General</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Leads Generados vs. Ventas Cerradas</p>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button className="px-3 py-1 text-xs font-semibold rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm">6 Meses</button>
                <button className="px-3 py-1 text-xs font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">Año</button>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                  <Area type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">psychology</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">Insights de IA</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 uppercase tracking-wide">En vivo</span>
            </div>

            <div className="flex-1 flex flex-col gap-6">
              {/* Dynamic Insights based on real data */}
              {leads.filter(l => l.status === 'qualified').slice(0, 1).map(lead => (
                <div key={`insight-qual-${lead.id}`} className="relative pl-4 border-l-2 border-emerald-500">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Lead de Alta Prioridad</h4>
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded">Calificado</span>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{lead.name}</p>
                      <p className="text-[10px] text-slate-400">Interesado en {lead.project?.name || 'Propiedad'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 rounded transition-colors">Contactar</button>
                  </div>
                </div>
              ))}

              {newLeadsCount > 0 && (
                <div className="relative pl-4 border-l-2 border-blue-500">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Actividad Reciente</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                    Se han generado <span className="font-semibold text-slate-700 dark:text-slate-300">{newLeadsCount} nuevos leads</span> en los últimos 7 días.
                  </p>
                </div>
              )}

              {sales.length > 0 && (
                <div className="relative pl-4 border-l-2 border-orange-500">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">Última Venta</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Venta cerrada por <span className="font-semibold text-slate-700 dark:text-slate-300">${Number(sales[0].sale_value).toLocaleString()}</span> el {new Date(sales[0].sale_date).toLocaleDateString()}.
                  </p>
                </div>
              )}
              
              {leads.length === 0 && sales.length === 0 && !loading && (
                 <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay insights disponibles por el momento.</p>
              )}
            </div>

            <button className="w-full mt-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors">
              Ver Todos los Insights
            </button>
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">Leads Recientes</h3>
            <button className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 text-sm font-medium transition-colors">Ver Todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-6 py-4">Nombre del Lead</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Interés en Propiedad</th>
                  <th className="px-6 py-4">Fuente</th>
                  <th className="px-6 py-4">Último Contacto</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                          {lead.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">{lead.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        lead.status === 'qualified' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                        lead.status === 'contacted' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {statusMap[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{lead.project?.name || 'N/A'}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white capitalize">
                      {lead.source || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-500">{new Date(lead.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {leads.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                      No hay leads recientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default CrmDashboard;