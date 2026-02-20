import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const SolutionsPage: React.FC = () => {
  return (
    <div className="bg-background-light text-slate-900 overflow-x-hidden font-display">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col gap-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 w-fit">
                <span className="flex h-2 w-2 rounded-full bg-emerald-accent"></span>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Plataforma Integral</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-deep-blue leading-[1.1] tracking-tight">
                Todo lo que tu proyecto necesita para <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-accent">vender más rápido</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Conecta marketing, ventas y post-venta en un solo flujo de trabajo inteligente. Optimiza cada interacción y convierte prospectos en propietarios.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <button className="bg-deep-blue hover:bg-slate-800 text-white text-base font-bold px-8 py-3.5 rounded-lg transition-all shadow-xl flex items-center gap-2">
                  Solicitar demo
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </button>
              </div>
            </div>
            <div className="relative group perspective-1000">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-emerald-50 rounded-2xl blur-2xl opacity-50"></div>
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-slate-200/50 bg-white">
                <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <div className="mx-auto bg-white px-3 py-1 rounded-md text-[10px] text-slate-400 border border-slate-200 w-1/2 text-center">app.brighthouse.com/dashboard</div>
                </div>
                <div className="p-6 grid grid-cols-12 gap-6 bg-slate-50">
                  <div className="col-span-2 space-y-4 hidden sm:block">
                    <div className="h-8 w-8 bg-primary rounded-lg mb-6"></div>
                    <div className="h-2 w-full bg-slate-200 rounded"></div>
                    <div className="h-2 w-3/4 bg-slate-200 rounded"></div>
                    <div className="h-2 w-full bg-slate-200 rounded"></div>
                  </div>
                  <div className="col-span-12 sm:col-span-10 grid gap-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="h-4 w-32 bg-slate-200 rounded"></div>
                      <div className="h-8 w-24 bg-primary rounded-lg"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                        <div className="text-xs text-slate-400 mb-1">Total Leads</div>
                        <div className="text-2xl font-bold text-deep-blue">1,248</div>
                        <div className="text-[10px] text-emerald-500 mt-1">↑ 12% vs mes anterior</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                        <div className="text-xs text-slate-400 mb-1">Citas Agendadas</div>
                        <div className="text-2xl font-bold text-deep-blue">86</div>
                        <div className="text-[10px] text-emerald-500 mt-1">↑ 5% vs mes anterior</div>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                        <div className="text-xs text-slate-400 mb-1">Ventas Cerradas</div>
                        <div className="text-2xl font-bold text-deep-blue">24</div>
                        <div className="text-[10px] text-emerald-500 mt-1">↑ 8% vs mes anterior</div>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 h-32 flex items-end gap-2 px-6 pb-2">
                      <div className="w-full bg-blue-100 h-[30%] rounded-t-sm"></div>
                      <div className="w-full bg-blue-100 h-[50%] rounded-t-sm"></div>
                      <div className="w-full bg-blue-100 h-[40%] rounded-t-sm"></div>
                      <div className="w-full bg-primary h-[80%] rounded-t-sm relative group cursor-pointer">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-deep-blue text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Target</div>
                      </div>
                      <div className="w-full bg-blue-100 h-[60%] rounded-t-sm"></div>
                      <div className="w-full bg-blue-100 h-[45%] rounded-t-sm"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems/Solutions Grid */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-xl">leak_add</span>
              </div>
              <h3 className="font-bold text-deep-blue text-sm">Pérdida de Leads</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Sin seguimiento automatizado, el 40% de los leads calificados se enfrían.</p>
            </div>
            <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-xl">pending_actions</span>
              </div>
              <h3 className="font-bold text-deep-blue text-sm">Procesos Manuales</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Tu equipo pierde horas valiosas actualizando hojas de cálculo.</p>
            </div>
            <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-xl">trending_down</span>
              </div>
              <h3 className="font-bold text-deep-blue text-sm">Baja Conversión</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Dificultad para identificar a los compradores reales entre los curiosos.</p>
            </div>
            <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center mb-2">
                <span className="material-symbols-outlined text-xl">cloud_off</span>
              </div>
              <h3 className="font-bold text-deep-blue text-sm">Desconexión</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Marketing y ventas operan en silos, perdiendo datos críticos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solutions Cards */}
      <section className="py-24 bg-background-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-primary font-bold text-xs tracking-widest uppercase mb-2 block">Soluciones Integrales</span>
            <h2 className="text-3xl font-bold text-deep-blue mb-4">Un ecosistema diseñado para vender</h2>
            <p className="text-slate-600 text-sm">Tecnología modular que se adapta a cada etapa del ciclo de vida inmobiliario.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-2xl">folder_shared</span>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">Gestión</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-3">CRM Inmobiliario Especializado</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">Centraliza tu inventario y clientes. Gestiona unidades, precios y disponibilidad en tiempo real con una interfaz diseñada para desarrolladores.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-xs text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-base mr-2">check</span> Control de inventario multi-proyecto
                </li>
                <li className="flex items-center text-xs text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-base mr-2">check</span> Asignación automática de leads
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-2xl">settings_suggest</span>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">Eficiencia</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-3">Automatización de Flujos</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">Elimina tareas repetitivas. Configura secuencias de correo, WhatsApp y recordatorios automáticos basados en el comportamiento del lead.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-xs text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-base mr-2">check</span> Workflows personalizables
                </li>
                <li className="flex items-center text-xs text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-base mr-2">check</span> Respuestas inmediatas 24/7
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-2xl">psychology</span>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">Inteligencia</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-3">IA Predictiva & Scoring</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">Deja de adivinar. Nuestro algoritmo califica la probabilidad de compra de cada prospecto para que tu equipo priorice los cierres.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-xs text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-base mr-2">check</span> Lead Scoring dinámico
                </li>
                <li className="flex items-center text-xs text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-base mr-2">check</span> Recomendaciones de acción
                </li>
              </ul>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-2xl">devices</span>
                </div>
                <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded">Experiencia</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-3">Marketing Figital</h3>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">Une el mundo físico y digital. Herramientas para salas de venta interactivas que capturan datos mientras impresionan a tus clientes.</p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-xs text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-base mr-2">check</span> Kioscos interactivos
                </li>
                <li className="flex items-center text-xs text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-base mr-2">check</span> Recorridos virtuales integrados
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Funnel Section */}
      <section className="py-24 bg-deep-blue text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6">Funnel de Conversión Inteligente</h2>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                Visualiza en tiempo real dónde se pierden tus oportunidades y optimiza cada paso del embudo con insights impulsados por datos.
              </p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-emerald-400">filter_alt</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Filtrado Automático</h4>
                    <p className="text-sm text-slate-400 mt-1">Descarta leads basura automáticamente para mantener tu pipeline limpio.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-emerald-400">trending_up</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Atribución Multi-toque</h4>
                    <p className="text-sm text-slate-400 mt-1">Entiende qué canales de marketing generan las ventas reales, no solo los clics.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative bg-slate-900/50 border border-white/10 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
              <h3 className="text-sm font-semibold text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                Métricas en Vivo
              </h3>
              <div className="space-y-4">
                <div className="bg-white/5 rounded-lg p-4 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Visitantes</p>
                      <p className="text-2xl font-bold text-white">45,200</p>
                    </div>
                    <div className="text-right">
                      <span className="material-symbols-outlined text-slate-600 text-3xl group-hover:text-primary transition-colors">groups</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors mx-4">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400"></div>
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Leads Calificados</p>
                      <p className="text-2xl font-bold text-white">3,850</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">8.5% Conv.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors mx-8">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400"></div>
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Citas</p>
                      <p className="text-2xl font-bold text-white">940</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">24% Conv.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 rounded-lg p-4 border border-emerald-500/30 relative overflow-hidden mx-12">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <p className="text-xs text-emerald-200 uppercase tracking-wider mb-1">Ventas</p>
                      <p className="text-3xl font-bold text-white">142</p>
                    </div>
                    <div className="text-right">
                      <span className="material-symbols-outlined text-emerald-400 text-3xl">verified</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Showroom Sync Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
            <div className="grid lg:grid-cols-2">
              <div className="p-12 flex flex-col justify-center">
                <div className="inline-block bg-white border border-slate-200 rounded-full px-3 py-1 text-xs font-bold text-deep-blue mb-6 w-fit">Experiencia Figital</div>
                <h2 className="text-3xl font-bold text-deep-blue mb-4">Sincronización Sala de Ventas</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                  Cuando un cliente entra a tu sala de ventas, tu equipo ya sabe qué busca. Las interacciones en tabletas y pantallas táctiles se sincronizan instantáneamente con el perfil del cliente en el CRM.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-sm">sync</span>
                    </div>
                    <span className="text-sm text-slate-700 font-medium">Sincronización en tiempo real</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-sm">tablet_mac</span>
                    </div>
                    <span className="text-sm text-slate-700 font-medium">Catálogo digital interactivo</span>
                  </li>
                </ul>
              </div>
              <div className="relative h-[400px] lg:h-auto bg-slate-200">
                <img alt="Modern minimalist sales lounge with digital screens" className="absolute inset-0 w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJwIr43tHbkSL3ZxBM15Gk_MXaNpPUoKWGELChqrXRuLaPVL7bU655GoSo6p7Nt8d9_gE7GQCmnjgzckBhRfwsqj8IsoA3pB6pPNNCjOOXjIfTlU4YwLAscfgJ7xMm6LAhWAsF7lKuMrmOnywKCcYmPl36BXGW_Lc2P18nRHu0b2UE_jgpw4hCabAbnc3o7BzGg51rEKnDj5jAwT0Cf3fpV81sc8cNaULUz9g4RHomMkWM4hE1_BowtSzN5JF_Gqp_v7IrbJyJKOw"/>
                <div className="absolute inset-0 bg-deep-blue/10"></div>
                <div className="absolute bottom-12 left-12 right-12 bg-white rounded-xl shadow-2xl p-4 border border-slate-100 max-w-sm mx-auto transform rotate-1 lg:rotate-0 lg:left-12 lg:right-auto animate-[float_6s_ease-in-out_infinite]">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-deep-blue">Cliente: Andrés M.</span>
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">En sala</span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden">
                      <img alt="Apartment thumbnail" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2oYf2if6SvckVs15ebCiDig16trAPwRCkkSd1XL9m788RSvL0bnUQd8D-0PDgZFMQLv1T4y26SMbWSXT7o03Gkyb6f6P_RpnSYzVRkEqeBGOAMXjObmSRRJ7d41Cqsu1I9_Z1ERUqxT_252dhyIQxTsx8u8JCuqSmmVjm3u05PtmvpVM4e6pf9RgnsvcdMXL5D5o8KoyDnkjkL4bSFNcSc_uHOd6J1kLrFDAKapZUDi6TJDz7NBKApK4QS23J3uYyG3FYeLPagyQ"/>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Unidad 402 - Torre B</p>
                      <p className="text-xs text-slate-500 mb-1">Vista Parque • 2 Recámaras</p>
                      <button className="text-[10px] bg-primary text-white px-2 py-1 rounded">Enviar cotización</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-deep-blue border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-white/10">
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-emerald-accent mb-2">35%</p>
              <p className="text-sm text-slate-400">Reducción en ciclo de ventas</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-emerald-accent mb-2">2.5x</p>
              <p className="text-sm text-slate-400">Aumento en conversión de citas</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-emerald-accent mb-2">100%</p>
              <p className="text-sm text-slate-400">Trazabilidad de datos</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-emerald-accent mb-2">24/7</p>
              <p className="text-sm text-slate-400">Atención automatizada</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white"></div>
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold text-deep-blue mb-6">Empieza a optimizar tu flujo de ventas hoy</h2>
          <p className="text-slate-600 mb-10 text-lg">Únete a las desarrolladoras líderes que ya han transformado su operación comercial con BrightHouse.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-primary hover:bg-blue-700 text-white text-base font-bold px-8 py-4 rounded-lg transition-all shadow-xl shadow-primary/25">
              Solicitar demo
            </button>
            <button className="bg-white hover:bg-slate-50 text-deep-blue border border-slate-200 text-base font-bold px-8 py-4 rounded-lg transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">chat</span>
              Hablar con un asesor
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SolutionsPage;
