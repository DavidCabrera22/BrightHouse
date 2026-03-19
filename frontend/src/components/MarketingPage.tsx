import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';

interface Lead {
  id: string;
  source: string;
  status: string;
  created_at: string;
  potential_value?: number;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  image: string;
  status: 'En Curso' | 'Próximo' | 'Finalizado' | 'Webinar';
  location: string;
  date: string;
  stats: {
    label1: string;
    value1: string | number;
    label2: string;
    value2: string;
    highlight2?: boolean;
  };
  agents: string[];
}

const MarketingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeEvents: 12,
    physicalLeads: 0,
    digitalLeads: 0,
    conversion: 0,
    roi: 240, // Mocked for now
    closedSales: 0,
    physicalGrowth: 15, // Mocked
    digitalGrowth: 8, // Mocked
    conversionGrowth: 1.2, // Mocked
    roiGrowth: 15 // Mocked
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch('/api/leads', { headers });
      
      if (res.ok) {
        const leads: Lead[] = await res.json();
        processLeads(leads);
      }
    } catch (error) {
      console.error('Error fetching marketing data', error);
    } finally {
      setLoading(false);
    }
  };

  const processLeads = (leads: Lead[]) => {
    const digitalSources = ['instagram', 'website', 'facebook', 'linkedin', 'email', 'digital', 'google'];
    
    let physical = 0;
    let digital = 0;
    let won = 0;

    leads.forEach(lead => {
      const source = lead.source?.toLowerCase() || '';
      if (digitalSources.some(ds => source.includes(ds))) {
        digital++;
      } else {
        physical++;
      }

      if (lead.status === 'won') {
        won++;
      }
    });

    const totalLeads = leads.length;
    const conversion = totalLeads > 0 ? (won / totalLeads) * 100 : 0;

    setMetrics(prev => ({
      ...prev,
      physicalLeads: physical,
      digitalLeads: digital,
      closedSales: won,
      conversion: parseFloat(conversion.toFixed(1))
    }));
  };

  // Mock Events Data matching the design
  const events: EventData[] = [
    {
      id: '1',
      title: 'Feria Inmobiliaria 2024',
      description: 'Promoción exclusiva de Torre Altavista y Residencial Cumbres.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANnVKsO-KrqOaDapr30SJjZj3yUIqr-8KzcL3JTgOf4Pz8D3ARMZ91HAroymABhuhhpOURVzd1-H32XrRuslWP22srfY0baA_mK1Xq94E4rkbP_7BsKFPiu0HjNSxO3BHqF_fg6brCnQorXfVpZpRXQrThS2gskC-vOlPWOh6roQcMblA6mfOmK-my-12ipPrwOtiQWFZgUbFPI4RFJGG_YYR5CjuQmhzX6WZqf5VluSq176QNMIb1dgOptqHy-jEkypd-juQyKRk',
      status: 'En Curso',
      location: 'Centro de Convenciones, CDMX',
      date: '10-12 Nov',
      stats: { label1: 'Leads Totales', value1: 124, label2: 'Interés Alto', value2: '42%', highlight2: true },
      agents: ['https://lh3.googleusercontent.com/aida-public/AB6AXuCDcvRyqy9OHdni76wkmhUQFF6EaoHLUYsJsHvZ_ozzvBlsAuaAyKkyFVbF4PG76u9IxXDA8JHwVPRM6m0Gu3UgSepAmLV0Rf_Q9rgkrX6bJH5rr5Frr9-O2G5t3daMTgxc9cm9Uwcun9FZI0dMSYksMPu5G_o2yygDisjdITHe7IRK7WLM_cQ6z8Iwmn7PLDo7-JDr6aIHWUagI-ppYTtI0zoVmGUua1C0_PetdbQxLWeZJkA_tQm8Ljj9qLnuPkJOJoLSHNxqo14', 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7n_Yot5t1g7KnIBuqZaQH_65-KsBS9Xs0lBKpLQKbms1x3336TTGKU_KaMZH2a7nWnX79SM1NVs_kDRmRI-3pBKYEYMQZDJkCN7RiMRyyV0J4eCmeVCjw4vOCBHLwdiECIBzfLxv4FW4E1mSeZS02PvAZZNfqzslLXSPmF-_GU0DaoWawt-D1xLtaC9lQtaR9K4tqCamuLbUvm5lEInyY-2Adu1Q9QyRB01g05wmrf1c-zPKdpPuXnEwNPHVQEgw1cZbDww9g9EI']
    },
    {
      id: '2',
      title: 'Open House: Green Park',
      description: 'Lanzamiento oficial de la fase 2 con descuentos de preventa.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmJ1fhtjunXbVhmA3T8LfxhXeWUKoC8NXHQ3ibpr1ILYLFZNxCpABcaOOLWHICfpB83S7MGisw4CUVmDLT101HgkoDwLeiOPGezl28Pw-C7DMBjwqWrIi4eQxTJ87iauTkFMOfsxcKiqcIuVD6OalkUDOh7-4u60IQfQl70HT2KS1ABu6ieOjAxbmdGQtk6HA4-8TDDK6cXWGXG_Yw78X7SSqeucc9oUe6Ir9UP7BmJFLZnaIUYK6ULI8oD2WeZ_gUGdXxNiaHA8o',
      status: 'Próximo',
      location: 'Showroom Polanco',
      date: '15 Nov',
      stats: { label1: 'Registrados', value1: 85, label2: 'Confirmados', value2: '68%', highlight2: false },
      agents: ['https://lh3.googleusercontent.com/aida-public/AB6AXuAMnHLanSZsY7k5FR1xYaHFf1Ii8TrFvL_B-2L05LAevv9FPxZJjGrNg9LdFm2Rhyq95EHuYvNsOBVJC2hppwiJobf8X-Gxkqadb-pjRN4TZVY8qKUIbAQ_l1lMGICzQxrjkbJ4e58z6mExXyfjlDC_Y8TIXDts5y0xuyIkzrUZvqAA8qloJo1k_bLMrUfRg5nS8jZeROiLtalMzHHKT8XPwNJT7YArcG1RKnOzoajdAVs0UxYxSMrkSzHGW4bHmIhKknZ4XpGMIfE']
    },
    {
      id: '3',
      title: 'Inversión Inteligente',
      description: 'Masterclass sobre plusvalía en zonas emergentes de la ciudad.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzQDLv8qzepFCmd95PwCGt3PST0eHfgg_H-lvobtBYgNnMMBnYMkioEhwSK_xp5koD4GYPkEv_ve19GwDFW5JwdLGmXvTJusdiVLL8z9ZYeaa0alUxq-4F4qLlilFd0oAdW3F9lrFsoZu8Ojq_rPqnsnv4CgV9kGaKn-xyc00x0jYPV6akr9UoHAZh4zdsSOMKOP0iYOizhFrLH6uwbKXYTkGucr74pGR8BrJ9TVlSJeZCuMljBQHj2lVlB4NL421jTqsDDZ6jXcY',
      status: 'Webinar',
      location: 'Zoom Live Stream',
      date: '20 Nov',
      stats: { label1: 'Asistentes', value1: 340, label2: 'Engagement', value2: 'High', highlight2: true },
      agents: ['https://lh3.googleusercontent.com/aida-public/AB6AXuCrRB3MVhBafnPyEjRPe_LsMD2884eHXbEq7rUjy_My0ORpvbmlD58wqF4RbPvCxw_P6op-VQwMYsVxfhRj48FdR5P3MgikDvk5l-KY8p25HFCb5hRxUiTNHYvqYpilTuFPJWaA-aRZslpvRKNuWtWmHbXlrW58z9qu5ued_JnrWm8gC0BcD1vmG79UMaLzVQzXAd94exnhJXng_N0Cq4vuR-M0Fo3G4gOtpDq1sMG3Ox_HrOleHOu9lhfmV-tGYMbZSNtL5T39ukk']
    },
    {
      id: '4',
      title: 'Visita Guiada VIP',
      description: 'Tour privado para inversionistas extranjeros en propiedades de lujo.',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCIjKp2GII5hvAaeHGvjaCsN6Kvl9_JBIf7JVGphZ2y52cRJO-txA1go8makyWFg6Be39Ckfe6BZVkAqaG2uwcRuuOtYCAS_zqCO4PxlXj6ZD-z7KmyKnMoxsyKvRuRdhZGCyRKLbq-cMoyx8_P_kyvyLgxYW-wC5yPpFnzTmXBGW4gOgrAF4Vgf36vGq6rp0viBPkJYCaHHizbsM8aChilPQEm1qJuwoSrioV811V-BaXrPRTMyMdhzqI7065c5rT738USU1uwWpE',
      status: 'Finalizado',
      location: 'Residencial Los Robles',
      date: '05 Oct',
      stats: { label1: 'Cierres', value1: 4, label2: 'ROI Evento', value2: '520%', highlight2: true },
      agents: ['https://lh3.googleusercontent.com/aida-public/AB6AXuA_fEcSmZxDUc8ehQF_EArgO_lcIurNW8PzbudxczDbwHe97HTC4bZGHPBsuiY2hOwIymV4Yghw1wQmKSTh9MK-JEZ-oH1Qz_YBMahA6E8zwL3EKAni2DMqMgG5KyEnhhzsl4hMJTZnPMSX5UBKeg3EyFXMHifWeITWnbxI1qCp9eQDvmkKN-qHTI1yhy_vbTewI5mSK-QCmt9PxZf6Pk-PsTRnIvyuOCEnJ-3uVmZq5XycUa5w79E1Fz7r97ifzYndkxzmDiOoEEQ', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAp3gOy1kRawyAcgwZ6kIj8DNxi9X7g7dQ0FP63I529iWSTCKPVtCAiE8YdJnMzk_Udgkk6iXxxzM28euUFlv0lIhff897Sbgd-FxK8kPBiQH5a41WFm5G25e1LCh8gWtEIaz__KelGemiunjiJZ7XqFXOKBGquUysCURqt4Fl3RyOkapMwrmmqSY8Hx121BEN4hlK9dhBF0ggQp8x_6EP63k6EaqlupZCTWMHH5kID8I0DWpsXq1Nd1bQ7thb08bPFqNLKVdyrMfs']
    }
  ];

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
      subtitle="Gestión unificada de experiencias físicas y digitales"
      actions={
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              className="pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/50 w-64 text-slate-700 dark:text-slate-200" 
              placeholder="Buscar evento..." 
              type="text"
            />
          </div>
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-blue-600/20">
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nuevo Evento
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* Main Column (Stats & Grid) */}
        <div className="xl:col-span-3 flex flex-col gap-8">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Active Events */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                  <span className="material-symbols-outlined">event</span>
                </div>
                <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded-full">+2 este mes</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Eventos Activos</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.activeEvents}</h3>
            </div>
            {/* Physical Leads */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">
                  <span className="material-symbols-outlined">person_pin_circle</span>
                </div>
                <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> {metrics.physicalGrowth}%
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Leads Físicos</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.physicalLeads}</h3>
            </div>
            {/* Digital Leads */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600">
                  <span className="material-symbols-outlined">devices</span>
                </div>
                <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span> {metrics.digitalGrowth}%
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Leads Digitales</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.digitalLeads.toLocaleString()}</h3>
            </div>
            {/* Conversion */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600">
                  <span className="material-symbols-outlined">sync_alt</span>
                </div>
                <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded-full">+{metrics.conversionGrowth}%</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Conversión</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.conversion}%</h3>
            </div>
            {/* ROI */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-pink-50 dark:bg-pink-900/20 rounded-lg text-pink-600">
                  <span className="material-symbols-outlined">monetization_on</span>
                </div>
                <span className="bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded-full">+{metrics.roiGrowth}%</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">ROI Total</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.roi}%</h3>
            </div>
            {/* Closed Sales */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded-full">Estable</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Ventas Cerradas</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{metrics.closedSales}</h3>
            </div>
          </div>

          {/* Events Section */}
          <div>
            <div className="flex justify-between items-end mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Eventos Destacados</h3>
              <button className="text-blue-600 text-sm font-semibold hover:underline flex items-center gap-1">
                Ver todos <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {events.map(event => (
                <div key={event.id} className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all duration-300">
                  <div className="h-48 bg-slate-200 relative overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
                      style={{ backgroundImage: `url('${event.image}')` }}
                    ></div>
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-lg text-xs font-bold shadow-sm ${
                      event.status === 'En Curso' ? 'bg-white/90 dark:bg-black/60 text-slate-800 dark:text-white backdrop-blur-sm' :
                      event.status === 'Próximo' ? 'bg-blue-600 text-white' :
                      event.status === 'Webinar' ? 'bg-purple-600 text-white' :
                      'bg-slate-600 text-white'
                    }`}>
                      {event.status}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <span className="material-symbols-outlined text-[18px]">{event.status === 'Webinar' ? 'videocam' : 'location_on'}</span>
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{event.title}</h4>
                      <div className="flex -space-x-2">
                        {event.agents.map((agent, i) => (
                          <img key={i} alt={`Agent ${i}`} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800" src={agent}/>
                        ))}
                        {event.agents.length > 1 && (
                          <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-600 dark:text-slate-300 font-bold">+{event.agents.length + 1}</div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{event.description}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{event.stats.label1}</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">{event.stats.value1}</span>
                      </div>
                      <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">{event.stats.label2}</span>
                        <span className={`text-lg font-bold ${event.stats.highlight2 ? 'text-emerald-500' : 'text-blue-600'}`}>{event.stats.value2}</span>
                      </div>
                      <button className="p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar (AI Suggestions) */}
        <div className="xl:col-span-1">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl p-6 text-white h-full relative overflow-hidden shadow-xl border border-slate-700/50">
            {/* Abstract Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-emerald-500 animate-pulse">auto_awesome</span>
                <h3 className="text-lg font-bold tracking-tight">Optimización IA</h3>
              </div>
              <div className="space-y-6 flex-1">
                {/* Insight 1 */}
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-semibold text-white/90">Horario Ideal</h4>
                    <span className="material-symbols-outlined text-xs text-emerald-500">trending_up</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Los eventos de tipo <span className="text-white font-medium">Open House</span> tienen un 35% más de asistencia los Jueves a las 18:00 hrs.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors">Agendar</button>
                  </div>
                </div>
                {/* Insight 2 */}
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-semibold text-white/90">Lead Scoring</h4>
                    <span className="material-symbols-outlined text-xs text-orange-400">warning</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Detectamos 15 leads del evento <span className="text-white font-medium">Feria 2024</span> con alta probabilidad de compra que no han sido contactados.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button className="text-[10px] bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded transition-colors">Ver lista</button>
                  </div>
                </div>
                {/* Insight 3 */}
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-semibold text-white/90">Perfil Ideal</h4>
                    <span className="material-symbols-outlined text-xs text-blue-400">person_search</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-500/20 p-1.5 rounded-full">
                      <span className="material-symbols-outlined text-sm text-blue-300">family_restroom</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold">Familias Jóvenes</p>
                      <p className="text-[10px] text-slate-400">Ingreso: $45k - $60k</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Este segmento está mostrando mayor interés en propiedades con amenidades infantiles este mes.
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 text-center">
                <button className="w-full py-2 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg text-xs font-bold text-white hover:shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-sm">rocket_launch</span>
                  Generar Campaña Automática
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CrmLayout>
  );
};

export default MarketingPage;
