import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';

interface Lead {
  id: string;
  source: string;
  status: string;
  created_at: string;
  potential_value?: number;
}

interface Unit {
  id: string;
  current_status?: { name: string };
}

interface Project {
  id: string;
  name: string;
}

interface Campaign {
  id: string;
  name: string;
  budget: number | string;
  start_date: string;
  end_date: string;
  cost_per_lead?: number | string;
  leads_generated: number;
  project?: Project;
  project_id: string;
}

interface Insight {
  tipo: string;
  titulo: string;
  descripcion: string;
  accion?: string;
}

interface Metrics {
  activeCampaigns: number;
  physicalLeads: number;
  digitalLeads: number;
  conversion: number;
  closedSales: number;
  /** null when there is no campaign budget to measure a return against. */
  roi: number | null;
  physicalGrowth: number | null;
  digitalGrowth: number | null;
  conversionDelta: number | null;
  salesGrowth: number | null;
}

const DIGITAL_SOURCES = [
  'instagram',
  'website',
  'web',
  'facebook',
  'linkedin',
  'email',
  'digital',
  'google',
  'ads',
  'whatsapp',
];

const isDigital = (source: string) => {
  const s = source?.toLowerCase() || '';
  return DIGITAL_SOURCES.some((d) => s.includes(d));
};

/** Percentage change between two periods. Null when the baseline is zero. */
const growth = (current: number, previous: number): number | null => {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

const emptyCampaignForm = {
  name: '',
  project_id: '',
  budget: '',
  start_date: '',
  end_date: '',
  cost_per_lead: '',
};

const currency = (value: number) =>
  value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** Small trend pill. Renders neutral when there is no baseline to compare against. */
const Trend: React.FC<{ value: number | null; suffix?: string; label?: string }> = ({
  value,
  suffix = '%',
  label,
}) => {
  if (value === null) {
    return (
      <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
        {label || 'Sin histórico'}
      </span>
    );
  }

  const up = value >= 0;
  return (
    <span
      className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${
        up ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
      }`}
      title="Comparado con el mes anterior"
    >
      <span className="material-symbols-outlined text-[14px]">
        {up ? 'trending_up' : 'trending_down'}
      </span>
      {up ? '+' : ''}
      {value.toFixed(1)}
      {suffix}
    </span>
  );
};

const MarketingPage: React.FC = () => {
  const token = localStorage.getItem('access_token');
  const authHeader = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...authHeader, 'Content-Type': 'application/json' };

  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');

  const [metrics, setMetrics] = useState<Metrics>({
    activeCampaigns: 0,
    physicalLeads: 0,
    digitalLeads: 0,
    conversion: 0,
    closedSales: 0,
    roi: null,
    physicalGrowth: null,
    digitalGrowth: null,
    conversionDelta: null,
    salesGrowth: null,
  });

  const [insights, setInsights] = useState<Insight[]>([]);
  const [recommendation, setRecommendation] = useState('');
  const [insightsLoading, setInsightsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyCampaignForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadsRes, campaignsRes, projectsRes, unitsRes] = await Promise.all([
        fetch('/api/leads', { headers: authHeader }),
        fetch('/api/campaigns', { headers: authHeader }),
        fetch('/api/projects', { headers: authHeader }),
        fetch('/api/units', { headers: authHeader }),
      ]);

      const leads: Lead[] = leadsRes.ok ? await leadsRes.json() : [];
      const campaignList: Campaign[] = campaignsRes.ok ? await campaignsRes.json() : [];
      const units: Unit[] = unitsRes.ok ? await unitsRes.json() : [];
      if (projectsRes.ok) setProjects(await projectsRes.json());

      setCampaigns(campaignList);
      const computed = computeMetrics(leads, campaignList);
      setMetrics(computed);
      fetchInsights(leads, units, computed);
    } catch (error) {
      console.error('Error fetching marketing data', error);
    } finally {
      setLoading(false);
    }
  };

  const computeMetrics = (leads: Lead[], campaignList: Campaign[]): Metrics => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const inThisMonth = (d: string) => new Date(d) >= thisMonthStart;
    const inLastMonth = (d: string) => {
      const date = new Date(d);
      return date >= lastMonthStart && date < thisMonthStart;
    };

    let physical = 0;
    let digital = 0;
    let won = 0;
    let wonValue = 0;

    // Month-over-month baselines, so the trend pills reflect real movement.
    let physicalNow = 0;
    let physicalPrev = 0;
    let digitalNow = 0;
    let digitalPrev = 0;
    let wonNow = 0;
    let wonPrev = 0;
    let leadsNow = 0;
    let leadsPrev = 0;

    for (const lead of leads) {
      const digitalLead = isDigital(lead.source);
      if (digitalLead) digital++;
      else physical++;

      if (lead.status === 'won') {
        won++;
        wonValue += Number(lead.potential_value) || 0;
      }

      if (inThisMonth(lead.created_at)) {
        leadsNow++;
        if (digitalLead) digitalNow++;
        else physicalNow++;
        if (lead.status === 'won') wonNow++;
      } else if (inLastMonth(lead.created_at)) {
        leadsPrev++;
        if (digitalLead) digitalPrev++;
        else physicalPrev++;
        if (lead.status === 'won') wonPrev++;
      }
    }

    const conversion = leads.length > 0 ? (won / leads.length) * 100 : 0;
    const conversionNow = leadsNow > 0 ? (wonNow / leadsNow) * 100 : 0;
    const conversionPrev = leadsPrev > 0 ? (wonPrev / leadsPrev) * 100 : 0;

    const totalBudget = campaignList.reduce((sum, c) => sum + (Number(c.budget) || 0), 0);
    const today = new Date();
    const activeCampaigns = campaignList.filter(
      (c) => new Date(c.start_date) <= today && new Date(c.end_date) >= today,
    ).length;

    return {
      activeCampaigns,
      physicalLeads: physical,
      digitalLeads: digital,
      conversion: parseFloat(conversion.toFixed(1)),
      closedSales: won,
      // Return on the money actually committed to campaigns. Without a budget
      // there is nothing to measure a return against, so this stays null
      // rather than showing an invented figure.
      roi: totalBudget > 0 ? ((wonValue - totalBudget) / totalBudget) * 100 : null,
      physicalGrowth: growth(physicalNow, physicalPrev),
      digitalGrowth: growth(digitalNow, digitalPrev),
      // Conversion moves in percentage points, not percent of a percent.
      conversionDelta: leadsPrev > 0 ? conversionNow - conversionPrev : null,
      salesGrowth: growth(wonNow, wonPrev),
    };
  };

  const fetchInsights = async (leads: Lead[], units: Unit[], computed: Metrics) => {
    setInsightsLoading(true);
    try {
      const leadsByStatus: Record<string, number> = {};
      const leadsBySource: Record<string, number> = {};
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      let newLeadsThisMonth = 0;

      for (const lead of leads) {
        leadsByStatus[lead.status] = (leadsByStatus[lead.status] || 0) + 1;
        const source = lead.source || 'desconocido';
        leadsBySource[source] = (leadsBySource[source] || 0) + 1;
        if (new Date(lead.created_at) >= thisMonthStart) newLeadsThisMonth++;
      }

      const unitsByStatus: Record<string, number> = {};
      for (const unit of units) {
        const name = unit.current_status?.name || 'Sin estado';
        unitsByStatus[name] = (unitsByStatus[name] || 0) + 1;
      }

      const topSources = Object.entries(leadsBySource)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);

      const res = await fetch('/api/analytics/insights', {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          totalLeads: leads.length,
          leadsByStatus,
          leadsBySource,
          newLeadsThisMonth,
          totalUnits: units.length,
          unitsByStatus,
          conversionRate: computed.conversion,
          topSources,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setInsights(Array.isArray(data.insights) ? data.insights : []);
        setRecommendation(data.recomendacion_principal || '');
      }
    } catch (error) {
      console.error('Error fetching insights', error);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');

    const payload: Record<string, unknown> = {
      name: form.name,
      project_id: form.project_id,
      budget: Number(form.budget),
      start_date: new Date(form.start_date).toISOString(),
      end_date: new Date(form.end_date).toISOString(),
    };
    if (form.cost_per_lead) payload.cost_per_lead = Number(form.cost_per_lead);

    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowModal(false);
      setForm(emptyCampaignForm);
      fetchData();
    } else {
      const body = await res.json().catch(() => ({}));
      const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      setFormError(message || 'No se pudo crear la campaña.');
    }
    setSaving(false);
  };

  const campaignState = (c: Campaign): { label: string; className: string } => {
    const today = new Date();
    if (new Date(c.start_date) > today) {
      return { label: 'Próxima', className: 'bg-blue-600 text-white' };
    }
    if (new Date(c.end_date) < today) {
      return { label: 'Finalizada', className: 'bg-slate-600 text-white' };
    }
    return { label: 'En curso', className: 'bg-emerald-600 text-white' };
  };

  const visibleCampaigns = campaigns.filter((c) => {
    const term = search.trim().toLowerCase();
    return !term || c.name.toLowerCase().includes(term);
  });

  const insightIcon: Record<string, { icon: string; color: string }> = {
    oportunidad: { icon: 'trending_up', color: 'text-emerald-500' },
    alerta: { icon: 'warning', color: 'text-orange-400' },
    tendencia: { icon: 'insights', color: 'text-blue-400' },
  };

  if (loading) {
    return (
      <CrmLayout title="Marketing Figital" subtitle="Cargando datos...">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout
      title="Marketing Figital"
      subtitle="Campañas, origen de los leads y retorno de la inversión"
      actions={
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 w-64 text-slate-700 dark:text-slate-200"
              placeholder="Buscar campaña..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              setForm(emptyCampaignForm);
              setFormError('');
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-600/20"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nueva Campaña
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="xl:col-span-3 flex flex-col gap-8">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                  <span className="material-symbols-outlined">campaign</span>
                </div>
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                  {campaigns.length} en total
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Campañas Activas</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.activeCampaigns}
              </h3>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                  <span className="material-symbols-outlined">person_pin_circle</span>
                </div>
                <Trend value={metrics.physicalGrowth} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Leads Físicos</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.physicalLeads.toLocaleString()}
              </h3>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
                  <span className="material-symbols-outlined">devices</span>
                </div>
                <Trend value={metrics.digitalGrowth} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Leads Digitales</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.digitalLeads.toLocaleString()}
              </h3>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600">
                  <span className="material-symbols-outlined">sync_alt</span>
                </div>
                <Trend value={metrics.conversionDelta} suffix=" pts" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Conversión</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.conversion}%
              </h3>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-pink-600">
                  <span className="material-symbols-outlined">monetization_on</span>
                </div>
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">
                  Valor ganado vs. presupuesto
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">ROI de Campañas</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.roi === null ? (
                  <span className="text-slate-400 text-xl font-semibold">Sin presupuesto</span>
                ) : (
                  `${metrics.roi.toFixed(0)}%`
                )}
              </h3>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <Trend value={metrics.salesGrowth} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Leads Ganados</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                {metrics.closedSales}
              </h3>
            </div>
          </div>

          {/* Campaigns */}
          <div>
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Campañas</h3>
              <span className="text-sm text-slate-400">
                {visibleCampaigns.length} de {campaigns.length}
              </span>
            </div>

            {visibleCampaigns.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
                <span className="material-symbols-outlined text-5xl mb-3 block">campaign</span>
                <p className="font-medium">
                  {campaigns.length === 0
                    ? 'Todavía no hay campañas registradas'
                    : 'Ninguna campaña coincide con la búsqueda'}
                </p>
                {campaigns.length === 0 && (
                  <p className="text-sm mt-1">
                    Crea una campaña para medir el retorno de tu inversión en marketing
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleCampaigns.map((c) => {
                  const state = campaignState(c);
                  const budget = Number(c.budget) || 0;
                  const costPerLead =
                    c.leads_generated > 0
                      ? budget / c.leads_generated
                      : Number(c.cost_per_lead) || null;

                  return (
                    <div
                      key={c.id}
                      className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2 gap-3">
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                            {c.name}
                          </h4>
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 ${state.className}`}
                          >
                            {state.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                          {c.project?.name || 'Proyecto sin nombre'}
                        </p>
                        <p className="text-xs text-slate-400 mb-4">
                          {new Date(c.start_date).toLocaleDateString('es')} –{' '}
                          {new Date(c.end_date).toLocaleDateString('es')}
                        </p>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                              Presupuesto
                            </span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white">
                              {currency(budget)}
                            </span>
                          </div>
                          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                              Leads
                            </span>
                            <span className="text-lg font-bold text-blue-600">
                              {c.leads_generated}
                            </span>
                          </div>
                          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                              Costo / Lead
                            </span>
                            <span className="text-lg font-bold text-emerald-500">
                              {costPerLead === null ? '—' : currency(costPerLead)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI insights, generated from this tenant's real leads and units */}
        <div className="xl:col-span-1">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-6 text-white h-full relative overflow-hidden shadow-xl border border-slate-700/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-emerald-500 animate-pulse">
                  auto_awesome
                </span>
                <h3 className="text-lg font-bold tracking-tight">Optimización IA</h3>
              </div>

              <div className="space-y-6 flex-1">
                {insightsLoading ? (
                  <div className="space-y-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="h-3 w-1/2 bg-white/20 rounded animate-pulse mb-3" />
                        <div className="h-2 w-full bg-white/10 rounded animate-pulse mb-2" />
                        <div className="h-2 w-4/5 bg-white/10 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : insights.length === 0 ? (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Aún no hay suficientes datos para generar recomendaciones. Registra más leads
                      y campañas para que el análisis sea útil.
                    </p>
                  </div>
                ) : (
                  insights.map((insight, i) => {
                    const style = insightIcon[insight.tipo] || insightIcon.tendencia;
                    return (
                      <div
                        key={i}
                        className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <h4 className="text-sm font-semibold text-white/90">{insight.titulo}</h4>
                          <span className={`material-symbols-outlined text-xs ${style.color}`}>
                            {style.icon}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {insight.descripcion}
                        </p>
                        {insight.accion && (
                          <p className="mt-3 text-[11px] text-blue-300 font-medium">
                            {insight.accion}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {recommendation && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-2">
                    Prioridad de la semana
                  </p>
                  <p className="text-xs text-white/90 leading-relaxed">{recommendation}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nueva Campaña</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Lanzamiento fase 2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Proyecto <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.project_id}
                  onChange={(e) => setForm({ ...form, project_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Selecciona un proyecto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Presupuesto (COP) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="5000000"
                    value={form.budget}
                    onChange={(e) => setForm({ ...form, budget: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Costo por lead <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="25000"
                    value={form.cost_per_lead}
                    onChange={(e) => setForm({ ...form, cost_per_lead: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Inicio <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fin <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="date"
                    min={form.start_date || undefined}
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {formError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2.5">
                  {formError}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-lg transition-all"
                >
                  {saving ? 'Guardando...' : 'Crear Campaña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CrmLayout>
  );
};

export default MarketingPage;
