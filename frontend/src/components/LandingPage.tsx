import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="bg-background-light text-slate-900 overflow-x-hidden font-display">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 w-fit">
                <span className="flex h-2 w-2 rounded-full bg-primary"></span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">PropTech Platform v2.0</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold text-deep-blue leading-[1.1] tracking-tight">
                Proyectos inmobiliarios impulsados por <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">tecnología inteligente</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Plataforma premium que utiliza IA y automatización para acelerar las ventas, optimizar la captación de leads y transformar el desarrollo inmobiliario.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <Link to="/proyectos" className="bg-primary hover:bg-blue-700 text-white text-base font-bold px-8 py-3.5 rounded-lg transition-all shadow-xl shadow-primary/25 flex items-center gap-2">
                  Ver proyectos
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </Link>
                <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-base font-bold px-8 py-3.5 rounded-lg transition-all flex items-center gap-2">
                  Solicitar asesoría
                </button>
              </div>
              <div className="flex items-center gap-4 mt-8 pt-8 border-t border-slate-100">
                <div className="flex -space-x-3">
                  <img alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsgMHP25W6uzq4L7HV_-c_NuinXldJteiUm7sJpaJpzSohq8CaxzbBg_jhDSEdJVGC_coHfWJ8X1tOKx9fg3k-dchem5-KjmWk0NP3bBH4R0S-RbT9O4x6MGdoPu0eyd3baQMPolUjEP5Jvg_MhK0lU9RHTa33S2aJL8RsMqug6umfZb1AQ5LESJHOpPu8eihxx_MgbAUzPoLo5S8fNtKtiMeECnSck_TGRXbiXC0Du3xEdio6qp7HBI353S_2kOipP5M013sjYDM" />
                  <img alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJWnufzEStolEoL3XpCaeZ6DJZ5ZJAT0KyzCvKG24JOVTDtRkAd8oHPlEfN6ho0SPiuhgJXP6mqi6fYOEuFto5MhxTRkguCKoP5A7L5-IOU2aSeysXRtLdHx6Zuok9eZqsytjTfHoOCP0K0OcftZ-gx25JJ7gTLbiWzMcwwUnZZNsbNytrS2kMWjqxkOjw_FFy0CXx5Xmfk5aPrNazJm3t2nFkEfp_7izb9rhMGv3P0cQanBepfmmhQHFulKevW8xNKaN5i9Y7t3E" />
                  <img alt="User avatar" className="w-10 h-10 rounded-full border-2 border-white object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBzdP68J7T4UZ7BSSUtU7596z7l27xPR6E0KsuVX2us_vzR9xoA7YoUeqjj0WIFVq9dzvs3LLhh5DB42_PYytqyTT7SI-dHIZvrbpiNhVZoST4kt-SWWLGCCXoPHvVaBNElZwVKFF1FqixJtVBlCCgRQHkOmdE8qeLn5phXp5qXp8vm9QvfA1OJ0Ftr9y1i5pR1HOnKrCQBH5ksWgKbxVJG5V61N2rGg3mWKzCJEnKICYW63VZgn_SH4CzlZ6J8G0Ey2cuXITD4ZY" />
                  <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">+2k</div>
                </div>
                <p className="text-sm text-slate-500">Confían en nosotros <span className="font-bold text-slate-900">más de 150 desarrolladoras</span></p>
              </div>
            </div>
            <div className="relative group perspective-1000">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-emerald-50 rounded-2xl blur-2xl opacity-50 group-hover:opacity-70 transition-opacity"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
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

      {/* Why BrightHouse Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-deep-blue mb-4">¿Por qué elegir BrightHouse?</h2>
            <p className="text-slate-600">Nuestra tecnología se integra perfectamente con tus procesos, eliminando la fricción y maximizando el retorno de inversión.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-100 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">smart_toy</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-3">Tecnología que automatiza ventas</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Nuestros algoritmos de IA califican prospectos 24/7, asegurando que tu equipo comercial solo hable con compradores listos para invertir.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-emerald-100 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">insights</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-3">Gestión inteligente de leads</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Centraliza toda la información en un dashboard intuitivo que predice el comportamiento de compra y sugiere las mejores acciones.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-slate-50 hover:bg-white border border-slate-100 hover:border-purple-100 hover:shadow-xl transition-all duration-300">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-3xl">handshake</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-3">Acompañamiento estratégico</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
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
      <section className="py-24 bg-background-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <span className="text-primary font-bold text-sm tracking-widest uppercase mb-2 block">Proceso</span>
            <h2 className="text-3xl font-bold text-deep-blue">Cómo funciona BrightHouse</h2>
          </div>
          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6 relative z-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 group-hover:border-primary flex items-center justify-center shadow-lg transition-all duration-300 mb-6 relative">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-2xl transition-colors">cloud_upload</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">1</div>
                </div>
                <h3 className="text-lg font-bold text-deep-blue mb-2">Publicamos</h3>
                <p className="text-sm text-slate-500 px-4">Conectamos tu inventario a los portales más relevantes automáticamente.</p>
              </div>
              {/* Step 2 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 group-hover:border-primary flex items-center justify-center shadow-lg transition-all duration-300 mb-6 relative">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-2xl transition-colors">hub</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">2</div>
                </div>
                <h3 className="text-lg font-bold text-deep-blue mb-2">Captamos</h3>
                <p className="text-sm text-slate-500 px-4">Centralizamos leads de todas las fuentes en un solo lugar.</p>
              </div>
              {/* Step 3 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 group-hover:border-primary flex items-center justify-center shadow-lg transition-all duration-300 mb-6 relative">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-2xl transition-colors">smart_toy</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">3</div>
                </div>
                <h3 className="text-lg font-bold text-deep-blue mb-2">Automatizamos</h3>
                <p className="text-sm text-slate-500 px-4">IA califica y nutre a los prospectos para prepararlos para la venta.</p>
              </div>
              {/* Step 4 */}
              <div className="flex flex-col items-center text-center group">
                <div className="w-16 h-16 rounded-full bg-white border-4 border-slate-100 group-hover:border-emerald-400 flex items-center justify-center shadow-lg transition-all duration-300 mb-6 relative">
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-emerald-500 text-2xl transition-colors">paid</span>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">4</div>
                </div>
                <h3 className="text-lg font-bold text-deep-blue mb-2">Convertimos</h3>
                <p className="text-sm text-slate-500 px-4">Tu equipo cierra más ventas con información precisa y oportuna.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-deep-blue mb-2">Proyectos Destacados</h2>
              <p className="text-slate-500">Explora desarrollos que ya usan nuestra tecnología.</p>
            </div>
            <a className="hidden sm:flex items-center text-primary font-bold hover:underline" href="#">
              Ver todos los proyectos <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-2xl hover:border-blue-100 transition-all group">
              <div className="relative h-64 overflow-hidden">
                <div className="absolute top-4 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">Preventa</div>
                <img alt="Modern glass apartment building exterior at sunset" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2oYf2if6SvckVs15ebCiDig16trAPwRCkkSd1XL9m788RSvL0bnUQd8D-0PDgZFMQLv1T4y26SMbWSXT7o03Gkyb6f6P_RpnSYzVRkEqeBGOAMXjObmSRRJ7d41Cqsu1I9_Z1ERUqxT_252dhyIQxTsx8u8JCuqSmmVjm3u05PtmvpVM4e6pf9RgnsvcdMXL5D5o8KoyDnkjkL4bSFNcSc_uHOd6J1kLrFDAKapZUDi6TJDz7NBKApK4QS23J3uYyG3FYeLPagyQ" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-deep-blue">Torre Aurora</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-sm">location_on</span> Ciudad de México
                    </p>
                  </div>
                </div>
                <div className="my-4 border-t border-slate-100 pt-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Desde</p>
                    <p className="text-lg font-bold text-deep-blue">$4.5M MXN</p>
                  </div>
                  <button className="text-primary font-semibold text-sm hover:bg-blue-50 px-4 py-2 rounded transition-colors">
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
            {/* Card 2 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-2xl hover:border-blue-100 transition-all group">
              <div className="relative h-64 overflow-hidden">
                <div className="absolute top-4 left-4 bg-deep-blue text-white text-xs font-bold px-3 py-1 rounded-full z-10">Entrega Inmediata</div>
                <img alt="High rise corporate building facade with blue glass" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9nbSgnPE0ywgfeaYL2DRPA6S08GQQV3f-spXftouwyydxm6BoGKF93ub1YQaLcqdxmpEFBtEhejqkTnpTl5HPf6zVJM5muUsVf7qN2RR4hRlbuiGtD76dd0GDk7XqHBL18MWM9LmBOEv40vLTwnJGDZzU_SSHMXjOTU8_hbt4N-n7VrC3c2COz7MYSx6XMIMxPrsWyLkqoaOMIvHsWrxRfWEQNqLtkpv2rYnoCaQmxISVd1HzD3Wulr1agdKcOe09vhQtNwUif2I" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-deep-blue">Residencial Vistas</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-sm">location_on</span> Guadalajara
                    </p>
                  </div>
                </div>
                <div className="my-4 border-t border-slate-100 pt-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Desde</p>
                    <p className="text-lg font-bold text-deep-blue">$3.2M MXN</p>
                  </div>
                  <button className="text-primary font-semibold text-sm hover:bg-blue-50 px-4 py-2 rounded transition-colors">
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
            {/* Card 3 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-2xl hover:border-blue-100 transition-all group">
              <div className="relative h-64 overflow-hidden">
                <div className="absolute top-4 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">Últimas Unidades</div>
                <img alt="Modern white residential house with clean lines" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJwIr43tHbkSL3ZxBM15Gk_MXaNpPUoKWGELChqrXRuLaPVL7bU655GoSo6p7Nt8d9_gE7GQCmnjgzckBhRfwsqj8IsoA3pB6pPNNCjOOXjIfTlU4YwLAscfgJ7xMm6LAhWAsF7lKuMrmOnywKCcYmPl36BXGW_Lc2P18nRHu0b2UE_jgpw4hCabAbnc3o7BzGg51rEKnDj5jAwT0Cf3fpV81sc8cNaULUz9g4RHomMkWM4hE1_BowtSzN5JF_Gqp_v7IrbJyJKOw" />
                <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-deep-blue">Altos de San Pedro</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-sm">location_on</span> Monterrey
                    </p>
                  </div>
                </div>
                <div className="my-4 border-t border-slate-100 pt-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Desde</p>
                    <p className="text-lg font-bold text-deep-blue">$5.1M MXN</p>
                  </div>
                  <button className="text-primary font-semibold text-sm hover:bg-blue-50 px-4 py-2 rounded transition-colors">
                    Ver detalles
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 text-center sm:hidden">
            <a className="inline-flex items-center text-primary font-bold hover:underline" href="#">
              Ver todos los proyectos <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-deep-blue text-center mb-16">Lo que dicen los líderes del sector</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative">
              <span className="material-symbols-outlined text-slate-200 text-6xl absolute top-4 right-4">format_quote</span>
              <div className="relative z-10">
                <div className="h-8 mb-6 grayscale opacity-70">
                  {/* Placeholder for company logo */}
                  <div className="text-xl font-black text-slate-800 tracking-tighter">URBAN<span className="text-slate-400">CORP</span></div>
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">"La implementación de BrightHouse redujo nuestro ciclo de ventas en un 35%. La calidad de los leads automatizados es impresionante."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
                    <img alt="Executive portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCnVDL7JlmkRlhwDWIYvMG_ftc093ofeHPb-UOvBBX3uXhV6FmDItjrN9wXt9O81uZBIbMPC4JEr90Bz0tUxeMRVu-eu0xvRDEiBLveZW66UIeVr1Kp097_kCwnIVzuX4FMkyyDcmxX91mddm1pqWSj6bhPMyjwLmTYJDP8K3qJqQPu_S9CB9IyswpOE_eACGbUumXGpYlXBVPsfP_lDrmgmyUX9CsYaJGXG8ONwWcblTpNOLVzmtLlU3K9BzS2Mse740okQ4Exwk0" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-deep-blue">Roberto Sánchez</p>
                    <p className="text-xs text-slate-500">Director Comercial, UrbanCorp</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative">
              <span className="material-symbols-outlined text-slate-200 text-6xl absolute top-4 right-4">format_quote</span>
              <div className="relative z-10">
                <div className="h-8 mb-6 grayscale opacity-70">
                  <div className="text-xl font-bold text-slate-800 flex gap-1 items-center"><span className="material-symbols-outlined">apartment</span> HABITAT</div>
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">"Necesitábamos una solución que integrara marketing y ventas. BrightHouse no solo los integró, los potenció con inteligencia artificial."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
                    <img alt="Executive portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC58CKa6GCHmzaDXm1K45DJoZuAH4oWpZQiWliMaz9MSMCAz9pkWktGEYNQx3hssBoC9rtJD1nAGgthbBTfDLklv8xSHMQt6YbhXc-nurPWQIHOc1ObU2P1Df_l2cOZmHZlVNxRQH9sOwbIBe9rc3oMJlAanCBVBoljNLr6SBO4HRLmDJYZsyfu-7Tdk9fR8b-C2L4OGmkwZQEbmYGaeigdmjqTgUIUMfXInsQ3glyfF0IZneNHAYtgo84w0abpRWYu9YfDr1XWGFs" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-deep-blue">Ana Martínez</p>
                    <p className="text-xs text-slate-500">CEO, Habitat Desarrollos</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100 relative hidden lg:block">
              <span className="material-symbols-outlined text-slate-200 text-6xl absolute top-4 right-4">format_quote</span>
              <div className="relative z-10">
                <div className="h-8 mb-6 grayscale opacity-70">
                  <div className="text-xl font-serif font-bold text-slate-800 italic">Prestige</div>
                </div>
                <p className="text-slate-600 mb-6 leading-relaxed">"El soporte estratégico que recibimos ha sido clave. Entienden el mercado inmobiliario mejor que cualquier otra empresa de tecnología."</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full overflow-hidden">
                    <img alt="Executive portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdFgPOuR4fj6DSp7byZcravqcECsncLb5gszvxw3wsveVR4XXmUHYGO-z5_pXR46_NDGFxxaB_KaHJyCnhJrgPAnJblITC6AydElgMsY1AtgKW6NzMLCHB6P8jXbYT6DIbiA3YoeejVb_SrdCohflapJ7YgDIFxepR-UJcjhCNyjVmGiBuSLoHkhDcYej7t1sFnynsCBXxL1ymzelzzXF0BkvWVIJyHI7qQ1hx9wvDaFMkUNoHGlrmlJwy12KFh1XIsX7nsl8zyxg" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-deep-blue">Carlos Ruiz</p>
                    <p className="text-xs text-slate-500">Gerente de Ventas, Prestige</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl lg:text-5xl font-bold text-deep-blue mb-6 tracking-tight">Impulsa tu proyecto inmobiliario con tecnología inteligente</h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">Únete a la plataforma que está redefiniendo cómo se venden y gestionan las propiedades en Latinoamérica.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-lg transition-all shadow-xl shadow-primary/30">
              Publicar mi proyecto
            </button>
            <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-lg font-bold px-8 py-4 rounded-lg transition-all">
              Solicitar demo
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
