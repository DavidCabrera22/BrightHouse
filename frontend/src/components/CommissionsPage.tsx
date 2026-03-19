import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';
import { useNavigate } from 'react-router-dom';

interface Commission {
  id: string;
  date: string;
  project: string;
  unit: string;
  client: string;
  agent: {
    name: string;
    avatar?: string;
    initials: string;
    color: string;
  };
  saleValue: number;
  agentPercentage: number;
  agentAmount: number;
  platformPercentage: number;
  platformAmount: number;
  status: 'paid' | 'payable' | 'projected' | 'caused';
}

interface CommissionMetrics {
  totalProjected: number;
  totalCaused: number;
  avgCommission: number;
  totalSales: number;
  platformShare: number;
  agentShare: number;
  growth: {
    projected: number;
    caused: number;
    commission: number;
    sales: number;
    platform: number;
    agent: number;
  };
}

const CommissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin] = useState(() => {
    const role = localStorage.getItem('user_role');
    return role === 'admin' || role === 'super_admin';
  });
  const [metrics, setMetrics] = useState<CommissionMetrics>({
    totalProjected: 2400000,
    totalCaused: 850000,
    avgCommission: 2.4,
    totalSales: 45200000,
    platformShare: 120000,
    agentShare: 730000,
    growth: {
      projected: 12.5,
      caused: 8.2,
      commission: -0.5,
      sales: 15.3,
      platform: 4.1,
      agent: 9.8
    }
  });

  const [commissions, setCommissions] = useState<Commission[]>([]);

  const agentColors = [
    'bg-blue-100 text-blue-600',
    'bg-purple-100 text-purple-600',
    'bg-emerald-100 text-emerald-600',
    'bg-orange-100 text-orange-600',
    'bg-rose-100 text-rose-600',
  ];

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('/api/commissions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const raw: any[] = await res.json();

        const agentColorMap: Record<string, string> = {};
        let colorIdx = 0;

        const mapped: Commission[] = raw.map(c => {
          const agentName: string = c.sale?.agent?.name || 'Sin Asignar';
          if (!agentColorMap[agentName]) {
            agentColorMap[agentName] = agentColors[colorIdx % agentColors.length];
            colorIdx++;
          }
          const initials = agentName.split(' ').map((w: string) => w[0]).join('').substring(0, 2).toUpperCase();
          const saleValue = Number(c.sale?.sale_value || 0);
          const agentPct = Number(c.agent_percentage || 0);
          const platPct = Number(c.platform_percentage || 0);

          // Normalize status from backend (Projected, Paid, etc) to our keys
          const rawStatus = (c.status || 'projected').toLowerCase();
          const status: Commission['status'] =
            rawStatus.includes('paid') ? 'paid' :
            rawStatus.includes('payable') || rawStatus.includes('pay') ? 'payable' :
            rawStatus.includes('caus') ? 'caused' : 'projected';

          return {
            id: c.id,
            date: new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            project: c.sale?.unit?.project?.name || 'N/A',
            unit: c.sale?.unit?.code || 'N/A',
            client: c.sale?.client?.name || 'N/A',
            agent: { name: agentName, initials, color: agentColorMap[agentName] },
            saleValue,
            agentPercentage: agentPct,
            agentAmount: Number(c.agent_commission || saleValue * agentPct / 100),
            platformPercentage: platPct,
            platformAmount: Number(c.platform_commission || saleValue * platPct / 100),
            status,
          };
        });

        setCommissions(mapped);

        // Calculate real metrics
        const totalSales = mapped.reduce((s, c) => s + c.saleValue, 0);
        const agentShare = mapped.reduce((s, c) => s + c.agentAmount, 0);
        const platformShare = mapped.reduce((s, c) => s + c.platformAmount, 0);
        const totalProjected = mapped.filter(c => c.status === 'projected').reduce((s, c) => s + c.agentAmount, 0);
        const totalCaused = mapped.filter(c => ['caused', 'payable', 'paid'].includes(c.status)).reduce((s, c) => s + c.agentAmount, 0);
        const avgCommission = mapped.length > 0
          ? mapped.reduce((s, c) => s + c.agentPercentage, 0) / mapped.length
          : 0;

        setMetrics({
          totalProjected,
          totalCaused,
          avgCommission,
          totalSales,
          platformShare,
          agentShare,
          growth: { projected: 12.5, caused: 8.2, commission: -0.5, sales: 15.3, platform: 4.1, agent: 9.8 }
        });
      }
    } catch (err) {
      console.error('Error fetching commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      navigate('/crm');
      return;
    }
    
    fetchData();
  }, [isAdmin, navigate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">Pagado</span>;
      case 'payable':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">Por Pagar</span>;
      case 'caused':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">Causado</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">Proyectado</span>;
    }
  };

  if (loading || !isAdmin) {
    return (
      <CrmLayout title="Comisiones" subtitle="Cargando...">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout
      title="Comisiones"
      subtitle="Control y proyección automática de comisiones por ventas."
      actions={
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="relative min-w-[160px] flex-1 xl:flex-none">
            <select className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-xl focus:ring-blue-600 focus:border-blue-600 block p-2.5">
              <option>Todos los Proyectos</option>
              <option>Residencial Esmeralda</option>
              <option>Brighthouse Towers</option>
              <option>Villas del Mar</option>
            </select>
          </div>
          <div className="relative min-w-[160px] flex-1 xl:flex-none">
            <select className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-xl focus:ring-blue-600 focus:border-blue-600 block p-2.5">
              <option>Todos los Asesores</option>
              <option>Ana García</option>
              <option>Carlos Mendoza</option>
              <option>Luis Rodríguez</option>
            </select>
          </div>
          <div className="relative min-w-[200px] flex-1 xl:flex-none">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 text-sm">calendar_today</span>
            </div>
            <input className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-sm rounded-xl focus:ring-blue-600 focus:border-blue-600 block w-full pl-10 p-2.5" placeholder="Rango de fechas" type="text" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#0A192F] dark:bg-slate-800 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-all transform active:scale-95 border border-slate-700">
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Exportar</span>
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Proyectado</p>
          <h3 className="text-slate-900 dark:text-white text-2xl font-extrabold">{formatCompactCurrency(metrics.totalProjected)}</h3>
          <div className="flex items-center gap-1 mt-2 text-emerald-500 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+{metrics.growth.projected}%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Causado</p>
          <h3 className="text-slate-900 dark:text-white text-2xl font-extrabold">{formatCompactCurrency(metrics.totalCaused)}</h3>
          <div className="flex items-center gap-1 mt-2 text-emerald-500 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+{metrics.growth.caused}%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Comisión Prom.</p>
          <h3 className="text-slate-900 dark:text-white text-2xl font-extrabold">{metrics.avgCommission}%</h3>
          <div className="flex items-center gap-1 mt-2 text-rose-500 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">trending_down</span>
            <span>{metrics.growth.commission}%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Ventas Totales</p>
          <h3 className="text-slate-900 dark:text-white text-2xl font-extrabold">{formatCompactCurrency(metrics.totalSales)}</h3>
          <div className="flex items-center gap-1 mt-2 text-emerald-500 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+{metrics.growth.sales}%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-600">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Platform Share</p>
          <h3 className="text-blue-600 text-2xl font-extrabold">{formatCompactCurrency(metrics.platformShare)}</h3>
          <div className="flex items-center gap-1 mt-2 text-emerald-500 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+{metrics.growth.platform}%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-emerald-500">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Agent Share</p>
          <h3 className="text-emerald-500 text-2xl font-extrabold">{formatCompactCurrency(metrics.agentShare)}</h3>
          <div className="flex items-center gap-1 mt-2 text-emerald-500 text-xs font-bold">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+{metrics.growth.agent}%</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Proyecto</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Unidad</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Cliente</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Asesor</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Valor Venta</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Agent %</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Agent $</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Plat. %</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Plat. $</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-center">Estado</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {commissions.map((comm) => (
                <tr key={comm.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{comm.date}</td>
                  <td className="p-4 text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">{comm.project}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{comm.unit}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">{comm.client}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${comm.agent.color}`}>
                        {comm.agent.initials}
                      </div>
                      <span>{comm.agent.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-900 dark:text-white text-right whitespace-nowrap">{formatCurrency(comm.saleValue)}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300 text-right whitespace-nowrap">{comm.agentPercentage.toFixed(1)}%</td>
                  <td className="p-4 text-sm font-semibold text-emerald-500 text-right whitespace-nowrap">{formatCurrency(comm.agentAmount)}</td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300 text-right whitespace-nowrap">{comm.platformPercentage.toFixed(1)}%</td>
                  <td className="p-4 text-sm font-semibold text-blue-600 text-right whitespace-nowrap">{formatCurrency(comm.platformAmount)}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    {getStatusBadge(comm.status)}
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <button className="text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100">
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm text-slate-500">Mostrando <span className="font-bold text-slate-900 dark:text-white">1-6</span> de <span className="font-bold text-slate-900 dark:text-white">124</span></span>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">Anterior</button>
            <button className="px-3 py-1 bg-blue-600 text-white border border-blue-600 rounded-lg text-sm font-medium hover:bg-blue-700">Siguiente</button>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default CommissionsPage;
