import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
  total_units: number;
  image?: string;
  slug?: string;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active:       { label: 'Activo',            className: 'bg-emerald-500 text-white' },
  preventa:     { label: 'Preventa',          className: 'bg-amber-500 text-white'   },
  construction: { label: 'En Construcción',   className: 'bg-blue-600 text-white'    },
  finished:     { label: 'Entrega Inmediata', className: 'bg-slate-700 text-white'   },
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800&auto=format&fit=crop';

const LandingPage: React.FC = () => {
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [comingSoonName, setComingSoonName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects/public')
      .then(r => r.ok ? r.json() : [])
      .then((data: Project[]) => setProjects(data.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="bg-background-light dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-x-hidden font-display transition-colors duration-300">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 w-fit">
                <span className="flex h-2 w-2 rounded-full bg-primary"></span>
                <span className="text-xs font-semibold text-primary dark:text-blue-400 uppercase tracking-wide">PropTech Platform v2.0</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold text-deep-blue dark:text-white leading-[1.1] tracking-tight">
                Proyectos inmobiliarios impulsados por <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">tecnología inteligente</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                Plataforma premium que utiliza IA y automatización para acelerar las ventas, optimizar la captación de leads y transformar el desarrollo inmobiliario.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <Link to="/proyectos" className="bg-primary hover:bg-blue-700 text-white text-base font-bold px-8 py-3.5 rounded-lg transition-all shadow-xl shadow-primary/25 flex items-center gap-2">
                  Ver proyectos
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
                <button onClick={() => setIsDemoOpen(true)} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-base font-bold px-8 py-3.5 rounded-lg transition-all flex items-center gap-2">
                  Solicitar asesoría
                </button>
              </div>
              <div className="flex items-center gap-4 mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="flex -space-x-3">
                  <img alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsgMHP25W6uzq4L7HV_-c_NuinXldJteiUm7sJpaJpzSohq8CaxzbBg_jhDSEdJVGC_coHfWJ8X1tOKx9fg3k-dchem5-KjmWk0NP3bBH4R0S-RbT9O4x6MGdoPu0eyd3baQMPolUjEP5Jvg_MhK0lU9RHTa33S2aJL8RsMqug6umfZb1AQ5LESJHOpPu8eihxx_MgbAUzPoLo5S8fNtKtiMeECnSck_TGRXbiXC0Du3xEdio6qp7HBI353S_2kOipP5M013sjYDM" />
                  <img alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJWnufzEStolEoL3XpCaeZ6DJZ5ZJAT0KyzCvKG24JOVTDtRkAd8oHPlEfN6ho0SPiuhgJXP6mqi6fYOEuFto5MhxTRkguCKoP5A7L5-IOU2aSeysXRtLdHx6Zuok9eZqsytjTfHoOCP0K0OcftZ-gx25JJ7gTLbiWzMcwwUnZZNsbNytrS2kMWjqxkOjw_FFy0CXx5Xmfk5aPrNazJm3t2nFkEfp_7izb9rhMGv3P0cQanBepfmmhQHFulKevW8xNKaN5i9Y7t3E" />
                  <img alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBzdP68J7T4UZ7BSSUtU7596z7l27xPR6E0KsuVX2us_vzR9xoA7YoUeqjj0WIFVq9dzvs3LLhh5DB42_PYytqyTT7SI-dHIZvrbpiNhVZoST4kt-SWWLGCCXoPHvVaBNElZwVKFF1FqixJtVBlCCgRQHkOmdE8qeLn5phXp5qXp8vm9QvfA1OJ0Ftr9y1i5pR1HOnKrCQBH5ksWgKbxVJG5V61N2rGg3mWKzCJEnKICYW63VZgn_SH4CzlZ6J8G0Ey2cuXITD4ZY" />
                  <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">+2k</div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Confían en nosotros <span className="font-bold text-slate-900 dark:text-white">más de 150 desarrolladoras</span></p>
              </div>
            </div>
            <div className="relative group perspective-1000">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 rounded-2xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800">
                <img alt="Modern luxury apartment interior with floor to ceiling windows" className="w-full h-[500px] object-cover transition-transform duration-700 group-hover:scale-105" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7aBGYMPnFZV6AVN0M1JnhtZSZ5gDAmVHNu-9EOCCQvdMgGOPpEjFRRzmaViuNj9BTzSt_wTF_SnDPDrf7PoKPm0sI-hcVqrvAnSI0AnzW9LjSLaUc3JmkWtv342kwYosAdapl0rnIbfGPmINVc6xe3YwA_pSq57VBOpqmRnc1TkOMUX1pALhvCQvkKfgECmCBJkeXjVrpNiAnmeCd-zipmTuvXRwLKMIiVE_qhoKWKWvitX6hzwy2qMgyAwh_3LNdEPe3KoBwXOY" />
                {/* Floating Glass UI Card 1 */}
                <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/50 max-w-[200px] animate-[float_4s_ease-in-out_infinite]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-100 rounded-lg text-emerald-accent">
                      <span className="material-symbols-outlined text-xl">trending_up</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Ventas Mensuales</p>
                      <p className="text-lg font-bold text-slate-900">$4.2M</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[75%]"></div>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 text-right">+24% vs mes anterior</p>
                </div>
                {/* Floating Glass UI Card 2 */}
                <div className="absolute bottom-8 left-8 bg-deep-blue/95 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/10 max-w-[240px] animate-[float_5s_ease-in-out_infinite_1s]">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-400 font-medium">Leads Calificados</p>
                    <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-white">847</p>
                    <span className="text-xs text-slate-400 mb-1">nuevos hoy</span>
                  </div>
                  <div className="flex gap-1 mt-3">
                    <span className="h-8 w-1 bg-primary/20 rounded-sm"></span>
                    <span className="h-8 w-1 bg-primary/40 rounded-sm"></span>
                    <span className="h-8 w-1 bg-primary/60 rounded-sm"></span>
                    <span className="h-8 w-1 bg-primary rounded-sm"></span>
                    <span className="h-8 w-1 bg-primary/80 rounded-sm"></span>
                    <span className="h-8 w-1 bg-primary/50 rounded-sm"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portals / Integrations Strip */}
      <section className="py-10 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700/50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8">Conectamos tu inventario con los principales portales</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 grayscale opacity-60">
            {['Inmuebles24', 'Lamudi', 'Metros Cúbicos', 'Vivanuncios', 'Trovit'].map(name => (
              <span key={name} className="text-lg font-bold text-slate-600 dark:text-slate-300 tracking-tight whitespace-nowrap">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 bg-white dark:bg-slate-800 border-y border-slate-100 dark:border-slate-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-extrabold text-primary">150+</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Proyectos activos</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-primary">48k+</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Leads gestionados</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-primary">$2.1B</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">MXN en ventas</p>
            </div>
            <div>
              <p className="text-4xl font-extrabold text-primary">35%</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Reducción en ciclo de venta</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why BrightHouse Section */}
      <section className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-deep-blue dark:text-white mb-4">¿Por qué elegir BrightHouse?</h2>
            <p className="text-slate-600 dark:text-slate-400">Nuestra tecnología se integra perfectamente con tus procesos, eliminando la fricción y maximizando el retorno de inversión.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 hover:border-blue-100 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">smart_toy</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue dark:text-white mb-3">Tecnología que automatiza ventas</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Nuestros algoritmos de IA califican prospectos 24/7, asegurando que tu equipo comercial solo hable con compradores listos para invertir.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 hover:border-emerald-100 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">insights</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue dark:text-white mb-3">Gestión inteligente de leads</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Centraliza toda la información en un dashboard intuitivo que predice el comportamiento de compra y sugiere las mejores acciones.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 hover:border-purple-100 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">handshake</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue dark:text-white mb-3">Acompañamiento estratégico</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Más que software, somos socios. Nuestro equipo de expertos inmobiliarios te ayuda a configurar la estrategia perfecta para tu desarrollo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Section (Deep Blue Theme) */}
      <section className="py-24 bg-deep-blue text-white overflow-hidden relative">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 w-fit mb-6">
                <span className="material-symbols-outlined text-emerald-400 text-sm">bolt</span>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Potencia tus datos</span>
              </div>
              <h2 className="text-3xl lg:text-5xl font-bold mb-6 leading-tight">
                Automatización comercial y análisis de comportamiento
              </h2>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                Deja de perder tiempo en tareas manuales. Nuestra suite tecnológica se encarga del seguimiento, nutrición y calificación de tus prospectos inmobiliarios.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 mt-1">check_circle</span>
                  <div>
                    <h4 className="font-bold text-white">Scoring Predictivo</h4>
                    <p className="text-sm text-slate-400">Identifica quién comprará antes de que lo sepan.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 mt-1">check_circle</span>
                  <div>
                    <h4 className="font-bold text-white">CRM Integrado</h4>
                    <p className="text-sm text-slate-400">Conexión total con tu inventario en tiempo real.</p>
                  </div>
                </li>
              </ul>
              <button className="text-white border-b border-primary pb-1 hover:text-primary transition-colors flex items-center gap-2 group">
                Explorar características técnicas
                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
            {/* Abstract Dashboard Graphic */}
            <div className="relative bg-slate-900/50 border border-white/10 rounded-xl p-6 lg:p-10 backdrop-blur-sm shadow-2xl">
              {/* Fake UI Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-xs text-slate-500 font-mono">dashboard.brighthouse.io</div>
              </div>
              {/* Charts Area */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-lg border border-white/5">
                  <p className="text-xs text-slate-400 mb-2">Conversión Lead a Cita</p>
                  <div className="flex items-end gap-2 h-24">
                    <div className="w-1/5 bg-primary/30 h-[40%] rounded-t"></div>
                    <div className="w-1/5 bg-primary/50 h-[60%] rounded-t"></div>
                    <div className="w-1/5 bg-primary/70 h-[50%] rounded-t"></div>
                    <div className="w-1/5 bg-primary/90 h-[80%] rounded-t"></div>
                    <div className="w-1/5 bg-emerald-500 h-[95%] rounded-t"></div>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-lg border border-white/5 flex flex-col justify-between">
                  <p className="text-xs text-slate-400">Total Unidades Vendidas</p>
                  <div>
                    <p className="text-3xl font-bold text-white">124</p>
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">arrow_upward</span> 12% vs objetivo
                    </p>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full mt-2">
                    <div className="w-[85%] h-full bg-emerald-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              {/* Table Rows */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">JL</div>
                    <div>
                      <p className="text-sm font-medium text-white">Juan López</p>
                      <p className="text-xs text-slate-500">Interesado en PH-04</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">Alta Probabilidad</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold">MR</div>
                    <div>
                      <p className="text-sm font-medium text-white">María Rodríguez</p>
                      <p className="text-xs text-slate-500">Interesada en T2-302</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20">En Seguimiento</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-background-light dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-primary font-bold text-sm tracking-widest uppercase mb-2 block">Proceso</span>
            <h2 className="text-3xl font-bold text-deep-blue dark:text-white">Cómo funciona BrightHouse</h2>
          </div>
          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-700 -translate-y-1/2 z-0"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 group-hover:border-primary flex items-center justify-center shadow-lg transition-all duration-300 mb-6 relative">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-hover:text-primary text-2xl transition-colors">cloud_upload</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</div>
                </div>
                <h3 className="text-lg font-bold text-deep-blue dark:text-white mb-2">Publicamos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 px-4">Conectamos tu inventario a los portales más relevantes automáticamente.</p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 group-hover:border-primary flex items-center justify-center shadow-lg transition-all duration-300 mb-6 relative">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-hover:text-primary text-2xl transition-colors">hub</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</div>
                </div>
                <h3 className="text-lg font-bold text-deep-blue dark:text-white mb-2">Captamos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 px-4">Centralizamos leads de todas las fuentes en un solo lugar.</p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 group-hover:border-primary flex items-center justify-center shadow-lg transition-all duration-300 mb-6 relative">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-2xl transition-colors">smart_toy</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</div>
                </div>
                <h3 className="text-lg font-bold text-deep-blue dark:text-white mb-2">Automatizamos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 px-4">IA califica y nutre a los prospectos para prepararlos para la venta.</p>
              </div>
              {/* Step 4 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border-4 border-slate-100 dark:border-slate-700 group-hover:border-emerald-400 flex items-center justify-center shadow-lg transition-all duration-300 mb-6 relative">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 text-2xl transition-colors">paid</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">4</div>
                </div>
                <h3 className="text-lg font-bold text-deep-blue dark:text-white mb-2">Convertimos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 px-4">Tu equipo cierra más ventas con información precisa y oportuna.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section className="py-24 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-deep-blue dark:text-white mb-2">Proyectos Destacados</h2>
              <p className="text-slate-500 dark:text-slate-400">Explora desarrollos que ya usan nuestra tecnología.</p>
            </div>
            <Link className="hidden sm:flex items-center text-primary font-bold hover:underline" to="/proyectos">
              Ver todos los proyectos <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {projects.map(project => {
              const badge   = STATUS_BADGE[project.status] ?? { label: project.status, className: 'bg-slate-600 text-white' };
              const imgSrc  = project.image ?? FALLBACK_IMG;
              const NAME_SLUGS: Record<string,string> = { 'Oasis Park': 'oasis-park' };
              const resolvedSlug = project.slug || NAME_SLUGS[project.name] || null;
              const hasPage = !!resolvedSlug;
              const href = `/proyectos/${resolvedSlug}`;
              return (
                <div key={project.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-2xl hover:border-blue-100 transition-all group">
                  <div className="relative h-64 overflow-hidden">
                    <span className={`absolute top-4 left-4 text-xs font-bold px-3 py-1 rounded-full z-10 ${badge.className}`}>
                      {badge.label}
                    </span>
                    <img
                      alt={project.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      src={imgSrc}
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-deep-blue dark:text-white">{project.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {project.location}
                    </p>
                    <div className="my-4 border-t border-slate-100 dark:border-slate-700 pt-4 flex justify-between items-center">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Unidades</p>
                        <p className="text-lg font-bold text-deep-blue dark:text-white">{project.total_units} aptos</p>
                      </div>
                      {hasPage ? (
                        <Link
                          to={href}
                          className="text-primary font-semibold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2 rounded transition-colors"
                        >
                          Ver detalles
                        </Link>
                      ) : (
                        <button
                          onClick={() => setComingSoonName(project.name)}
                          className="text-primary font-semibold text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 px-4 py-2 rounded transition-colors"
                        >
                          Ver detalles
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && [1, 2, 3].map(i => (
              <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-xl h-80 animate-pulse" />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link className="inline-flex items-center text-primary font-bold hover:underline" to="/proyectos">
              Ver todos los proyectos <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-deep-blue dark:text-white text-center mb-16">Lo que dicen los líderes del sector</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative">
              <span className="material-symbols-outlined text-slate-200 dark:text-slate-600 text-6xl absolute top-4 right-4">format_quote</span>
              <div className="relative z-10">
                <div className="h-8 mb-6 grayscale opacity-70">
                  {/* Placeholder for company logo */}
                  <div className="text-xl font-black text-slate-800 dark:text-slate-200 tracking-tighter">URBAN<span className="text-slate-400 dark:text-slate-500">CORP</span></div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">"La implementación de BrightHouse redujo nuestro ciclo de ventas en un 35%. La calidad de los leads automatizados es impresionante."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
                    <img alt="Executive portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnVDL7JlmkRlhwDWIYvMG_ftc093ofeHPb-UOvBBX3uXhV6FmDItjrN9wXt9O81uZBIbMPC4JEr90Bz0tUxeMRVu-eu0xvRDEiBLveZW66UIeVr1Kp097_kCwnIVzuX4FMkyyDcmxX91mddm1pqWSj6bhPMyjwLmTYJDP8K3qJqQPu_S9CB9IyswpOE_eACGbUumXGpYlXBVPsfP_lDrmgmyUX9CsYaJGXG8ONwWcblTpNOLVzmtLlU3K9BzS2Mse740okQ4Exwk0" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-deep-blue dark:text-white">Roberto Sánchez</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Director Comercial, UrbanCorp</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Testimonial 2 */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative">
              <span className="material-symbols-outlined text-slate-200 dark:text-slate-600 text-6xl absolute top-4 right-4">format_quote</span>
              <div className="relative z-10">
                <div className="h-8 mb-6 grayscale opacity-70">
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200 flex gap-1 items-center"><span className="material-symbols-outlined">apartment</span> HABITAT</div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">"Necesitábamos una solución que integrara marketing y ventas. BrightHouse no solo los integró, los potenció con inteligencia artificial."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
                    <img alt="Executive portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC58CKa6GCHmzaDXm1K45DJoZuAH4oWpZQiWliMaz9MSMCAz9pkWktGEYNQx3hssBoC9rtJD1nAGgthbBTfDLklv8xSHMQt6YbhXc-nurPWQIHOc1ObU2P1Df_l2cOZmHZlVNxRQH9sOwbIBe9rc3oMJlAanCBVBoljNLr6SBO4HRLmDJYZsyfu-7Tdk9fR8b-C2L4OGmkwZQEbmYGaeigdmjqTgUIUMfXInsQ3glyfF0IZneNHAYtgo84w0abpRWYu9YfDr1XWGFs" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-deep-blue dark:text-white">Ana Martínez</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">CEO, Habitat Desarrollos</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Testimonial 3 */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 relative hidden lg:block">
              <span className="material-symbols-outlined text-slate-200 dark:text-slate-600 text-6xl absolute top-4 right-4">format_quote</span>
              <div className="relative z-10">
                <div className="h-8 mb-6 grayscale opacity-70">
                  <div className="text-xl font-serif font-bold text-slate-800 dark:text-slate-200 italic">Prestige</div>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">"El soporte estratégico que recibimos ha sido clave. Entienden el mercado inmobiliario mejor que cualquier otra empresa de tecnología."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
                    <img alt="Executive portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdFgPOuR4fj6DSp7byZcravqcECsncLb5gszvxw3wsveVR4XXmUHYGO-z5_pXR46_NDGFxxaB_KaHJyCnhJrgPAnJblITC6AydElgMsY1AtgKW6NzMLCHB6P8jXbYT6DIbiA3YoeejVb_SrdCohflapJ7YgDIFxepR-UJcjhCNyjVmGiBuSLoHkhDcYej7t1sFnynsCBXxL1ymzelzzXF0BkvWVIJyHI7qQ1hx9wvDaFMkUNoHGlrmlJwy12KFh1XIsX7nsl8zyxg" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-deep-blue dark:text-white">Carlos Ruiz</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Gerente de Ventas, Prestige</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="demo" className="py-24 bg-white dark:bg-slate-900 relative overflow-hidden transition-colors duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-deep-blue dark:text-white mb-6 tracking-tight">Impulsa tu proyecto inmobiliario con tecnología inteligente</h2>
          <p className="text-lg text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto">Únete a la plataforma que está redefiniendo cómo se venden y gestionan las propiedades en Latinoamérica.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => setIsDemoOpen(true)} className="bg-primary hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-lg transition-all shadow-xl shadow-primary/30">
              Publicar mi proyecto
            </button>
            <button onClick={() => setIsDemoOpen(true)} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700 text-lg font-bold px-8 py-4 rounded-lg transition-all">
              Solicitar demo
            </button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/521XXXXXXXXXX?text=Hola,%20me%20interesa%20conocer%20más%20sobre%20BrightHouse"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110"
        aria-label="Contactar por WhatsApp"
      >
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 2.822.737 5.469 2.027 7.769L0 32l8.469-2.001A15.942 15.942 0 0016 32c8.837 0 16-7.163 16-16S24.837 0 16 0zm0 29.333a13.27 13.27 0 01-6.771-1.853l-.485-.287-5.027 1.187 1.24-4.887-.317-.501A13.267 13.267 0 012.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.307-9.92c-.4-.2-2.365-1.168-2.732-1.301-.367-.133-.634-.2-.9.2-.267.4-1.033 1.301-1.267 1.568-.233.267-.467.3-.867.1-.4-.2-1.689-.623-3.216-1.984-1.189-1.06-1.991-2.369-2.224-2.769-.233-.4-.025-.616.175-.815.18-.18.4-.467.6-.7.2-.233.267-.4.4-.667.133-.267.067-.5-.033-.7-.1-.2-.9-2.168-1.233-2.968-.325-.78-.655-.675-.9-.687l-.767-.013c-.267 0-.7.1-1.067.5-.367.4-1.4 1.368-1.4 3.335s1.433 3.869 1.633 4.136c.2.267 2.82 4.304 6.832 6.035.955.412 1.7.658 2.281.843.958.305 1.831.262 2.52.159.769-.114 2.365-.967 2.699-1.901.333-.933.333-1.733.233-1.901-.1-.167-.367-.267-.767-.467z"/>
        </svg>
      </a>

      {/* Coming Soon Modal */}
      {comingSoonName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setComingSoonName(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-slate-200 dark:border-slate-700 text-center"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setComingSoonName(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-primary text-3xl">construction</span>
            </div>
            <h3 className="text-xl font-bold text-deep-blue dark:text-white mb-2">{comingSoonName}</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Este proyecto está en desarrollo. Muy pronto tendrás acceso a toda la información, planos y disponibilidad.
            </p>
            <p className="mt-3 text-xs font-semibold text-primary uppercase tracking-wide">Próximamente disponible</p>
            <button
              onClick={() => setComingSoonName(null)}
              className="mt-6 w-full bg-primary hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Demo Modal */}
      {isDemoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsDemoOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setIsDemoOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
              </div>
              <h3 className="text-2xl font-bold text-deep-blue dark:text-white">Solicitar Demo</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Un especialista te contactará en menos de 24 horas.</p>
            </div>
            <form
              onSubmit={e => { e.preventDefault(); setIsDemoOpen(false); }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Sánchez"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="roberto@empresa.com"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Empresa / Proyecto</label>
                <input
                  type="text"
                  placeholder="Nombre de tu desarrolladora"
                  className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-primary/20 text-sm mt-2"
              >
                Enviar solicitud
              </button>
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">Al enviar aceptas nuestra política de privacidad.</p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
