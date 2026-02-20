import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const AboutUsPage: React.FC = () => {
  return (
    <div className="bg-background-light text-slate-900 overflow-x-hidden font-display">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="flex flex-col gap-6 max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 w-fit">
                <span className="flex h-2 w-2 rounded-full bg-emerald-accent"></span>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Sobre Nosotros</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-extrabold text-deep-blue leading-[1.1] tracking-tight">
                Tecnología, estrategia y marketing inmobiliario en <span className="text-gradient">un solo ecosistema</span>
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed max-w-lg">
                Transformamos la industria del Real Estate fusionando inteligencia de datos, automatización avanzada y experiencias físicas de alto impacto.
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <button className="bg-primary hover:bg-blue-700 text-white text-base font-bold px-8 py-3.5 rounded-lg transition-all shadow-xl shadow-primary/25 flex items-center gap-2">
                  Conoce nuestra visión
                  <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                </button>
              </div>
            </div>
            <div className="relative group perspective-1000">
              <div className="absolute -inset-10 bg-gradient-to-tr from-blue-100/50 to-emerald-50/50 rounded-full blur-3xl opacity-70"></div>
              <div className="relative w-full aspect-square max-h-[600px] flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 bg-gradient-to-br from-deep-blue to-primary rounded-2xl rotate-45 shadow-2xl z-10 flex items-center justify-center border border-white/10 backdrop-blur-sm animate-[pulse_4s_ease-in-out_infinite]">
                    <span className="material-symbols-outlined text-white text-8xl -rotate-45">hub</span>
                  </div>
                </div>
                <div className="absolute top-10 right-10 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-[float_6s_ease-in-out_infinite]">
                  <span className="material-symbols-outlined text-emerald-500 text-4xl">smartphone</span>
                </div>
                <div className="absolute bottom-20 left-10 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-[float_5s_ease-in-out_infinite_1s]">
                  <span className="material-symbols-outlined text-primary text-4xl">apartment</span>
                </div>
                <div className="absolute top-1/2 -right-4 bg-deep-blue text-white p-4 rounded-xl shadow-xl animate-[float_7s_ease-in-out_infinite_0.5s]">
                  <span className="material-symbols-outlined text-4xl">query_stats</span>
                </div>
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-30" viewBox="0 0 100 100">
                  <line stroke="#0d59f2" strokeDasharray="2 2" strokeWidth="0.5" x1="50" x2="80" y1="50" y2="20"></line>
                  <line stroke="#10B981" strokeDasharray="2 2" strokeWidth="0.5" x1="50" x2="20" y1="50" y2="80"></line>
                  <line stroke="#0A192F" strokeDasharray="2 2" strokeWidth="0.5" x1="50" x2="90" y1="50" y2="50"></line>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <span className="material-symbols-outlined text-emerald-accent/30 text-6xl mb-6">format_quote</span>
          <h2 className="text-3xl md:text-5xl font-medium text-deep-blue leading-tight tracking-tight mb-8">
            "No somos solo software. Somos el puente estratégico que conecta el mundo <span className="italic font-serif text-emerald-600">físico</span> con la eficiencia <span className="italic font-serif text-primary">digital</span>."
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-emerald-400 to-primary mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-background-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="group">
              <div className="w-16 h-16 border border-slate-200 rounded-full flex items-center justify-center mb-6 bg-white shadow-sm group-hover:border-primary group-hover:shadow-md transition-all">
                <span className="material-symbols-outlined text-3xl text-slate-700 group-hover:text-primary transition-colors">code_blocks</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-4">Tecnología Profunda</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Arquitectura de datos propietaria que procesa millones de interacciones para predecir comportamientos de compra con una precisión del 94%.
              </p>
            </div>
            <div className="group">
              <div className="w-16 h-16 border border-slate-200 rounded-full flex items-center justify-center mb-6 bg-white shadow-sm group-hover:border-primary group-hover:shadow-md transition-all">
                <span className="material-symbols-outlined text-3xl text-slate-700 group-hover:text-primary transition-colors">psychology</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-4">Estrategia Comercial</h3>
              <p className="text-slate-600 leading-relaxed text-sm">
                Consultoría de alto nivel integrada en la plataforma. No solo entregamos herramientas, definimos el "Go-to-Market" de tu desarrollo.
              </p>
            </div>
            <div className="group relative p-6 -m-6 rounded-2xl bg-white border border-slate-200 shadow-xl lg:shadow-2xl">
              <div className="absolute top-0 right-0 p-3">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                  <span className="material-symbols-outlined text-xs">star</span> Core
                </span>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-deep-blue to-slate-800 rounded-full flex items-center justify-center mb-6 shadow-lg text-white">
                <span className="material-symbols-outlined text-3xl">view_in_ar</span>
              </div>
              <h3 className="text-xl font-bold text-deep-blue mb-4">Marketing Figital</h3>
              <p className="text-slate-600 leading-relaxed text-sm mb-4">
                La integración total entre el showroom físico y el ecosistema digital.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                  Kioscos interactivos
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                  Tracking presencial
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>
                  Recorridos inmersivos
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Showroom/Digital Section */}
      <section className="py-24 bg-deep-blue text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-slate-800/50 backdrop-blur">
                <img alt="Sales Stand Showroom" className="w-full h-[500px] object-cover opacity-80 mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7aBGYMPnFZV6AVN0M1JnhtZSZ5gDAmVHNu-9EOCCQvdMgGOPpEjFRRzmaViuNj9BTzSt_wTF_SnDPDrf7PoKPm0sI-hcVqrvAnSI0AnzW9LjSLaUc3JmkWtv342kwYosAdapl0rnIbfGPmINVc6xe3YwA_pSq57VBOpqmRnc1TkOMUX1pALhvCQvkKfgECmCBJkeXjVrpNiAnmeCd-zipmTuvXRwLKMIiVE_qhoKWKWvitX6hzwy2qMgyAwh_3LNdEPe3KoBwXOY"/>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[90%] h-[80%] bg-white/5 backdrop-blur-md border border-white/20 rounded-lg shadow-2xl p-6 flex flex-col">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-3 rounded-full bg-red-500"></div>
                        <div className="size-3 rounded-full bg-yellow-500"></div>
                        <div className="size-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-xs font-mono text-emerald-400">LIVE TRACKING - SHOWROOM CENTRAL</span>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/40 rounded border border-white/10 p-4 relative">
                        <div className="absolute top-4 left-4 size-3 bg-emerald-500 rounded-full animate-ping"></div>
                        <div className="absolute top-4 left-4 size-3 bg-emerald-500 rounded-full"></div>
                        <div className="text-[10px] text-emerald-300 absolute top-2 left-8">Cliente Activo</div>
                        <div className="w-full h-full border-2 border-dashed border-white/10 rounded flex items-center justify-center">
                          <span className="text-xs text-slate-500">Mapa de Calor</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-slate-900/40 p-3 rounded border border-white/10">
                          <p className="text-[10px] text-slate-400">Visitante</p>
                          <p className="text-sm font-bold">Carlos M.</p>
                          <p className="text-[10px] text-emerald-400">Interés: 3 Hab</p>
                        </div>
                        <div className="bg-slate-900/40 p-3 rounded border border-white/10">
                          <p className="text-[10px] text-slate-400">Tiempo en Maqueta</p>
                          <p className="text-sm font-bold">12m 30s</p>
                        </div>
                        <div className="mt-4">
                          <button className="w-full py-2 bg-primary text-xs font-bold rounded text-white">Enviar Ficha Técnica</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/50 border border-blue-700 w-fit mb-6">
                <span className="material-symbols-outlined text-primary text-sm">devices</span>
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Experiencia Figital</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                Donde el showroom se encuentra con la nube
              </h2>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                Nuestra tecnología patentada convierte cada visita física en datos digitales accionables. Los vendedores reciben perfiles enriquecidos en tiempo real mientras el cliente recorre el espacio.
              </p>
              <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Sincronización Real-Time
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  IoT Ready
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center divide-x divide-slate-100">
            <div>
              <p className="text-5xl lg:text-6xl font-extrabold text-deep-blue mb-2">+150</p>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Proyectos Gestionados</p>
            </div>
            <div>
              <p className="text-5xl lg:text-6xl font-extrabold text-deep-blue mb-2 flex justify-center items-start">
                3.5<span className="text-2xl mt-2 text-emerald-500">MM</span>
              </p>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Leads Procesados</p>
            </div>
            <div>
              <p className="text-5xl lg:text-6xl font-extrabold text-deep-blue mb-2">98<span className="text-3xl text-emerald-500">%</span></p>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Precisión de Datos</p>
            </div>
            <div>
              <p className="text-5xl lg:text-6xl font-extrabold text-deep-blue mb-2">
                <span className="text-emerald-500 text-4xl mr-1">$</span>400<span className="text-2xl mt-2">M</span>
              </p>
              <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Ventas Generadas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold text-deep-blue mb-6 tracking-tight">¿Listo para evolucionar tu estrategia?</h2>
          <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
            Agenda una sesión estratégica con nuestros consultores y descubre cómo implementar el modelo figital en tu próximo desarrollo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-deep-blue hover:bg-slate-900 text-white text-lg font-bold px-8 py-4 rounded-lg transition-all shadow-xl shadow-deep-blue/30 flex items-center justify-center gap-3">
              Agendar Consultoría
              <span className="material-symbols-outlined">calendar_month</span>
            </button>
            <button className="bg-white hover:bg-white/80 text-deep-blue border border-slate-200 text-lg font-bold px-8 py-4 rounded-lg transition-all flex items-center justify-center gap-3">
              Ver casos de éxito
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUsPage;
