import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const ProjectsPage: React.FC = () => {
  return (
    <div className="bg-background-light text-slate-900 overflow-x-hidden font-display">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 overflow-hidden bg-slate-50">
        <div className="max-w-4xl mx-auto text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-primary mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-bold tracking-widest uppercase">Portafolio Inmobiliario</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-deep-blue mb-6 tracking-tight leading-tight">
            Descubre oportunidades de inversión <br /> optimizadas por Inteligencia Artificial
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Explora nuestra selección exclusiva de desarrollos inmobiliarios. Cada proyecto cuenta con un análisis predictivo de plusvalía y herramientas de gestión automatizada.
          </p>
        </div>

        {/* Filter Section */}
        <div className="max-w-5xl mx-auto mb-16 relative z-20">
          <div className="glass-card rounded-full p-2 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 shadow-xl shadow-slate-200/50">
            <div className="flex items-center gap-2 px-4 w-full md:w-auto">
              <span className="material-symbols-outlined text-slate-400">search</span>
              <input 
                className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-slate-400 text-slate-700" 
                placeholder="Buscar por ciudad o desarrollo..." 
                type="text" 
              />
            </div>
            <div className="hidden md:block h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar px-2 pb-2 md:pb-0">
              <button className="whitespace-nowrap px-4 py-2 rounded-full bg-deep-blue text-white text-sm font-medium hover:shadow-lg transition-all">Todos</button>
              <button className="whitespace-nowrap px-4 py-2 rounded-full bg-transparent hover:bg-slate-100 text-slate-600 text-sm font-medium transition-all">Preventa</button>
              <button className="whitespace-nowrap px-4 py-2 rounded-full bg-transparent hover:bg-slate-100 text-slate-600 text-sm font-medium transition-all">Entrega Inmediata</button>
              <button className="whitespace-nowrap px-4 py-2 rounded-full bg-transparent hover:bg-slate-100 text-slate-600 text-sm font-medium transition-all">Residencial</button>
              <button className="whitespace-nowrap px-4 py-2 rounded-full bg-transparent hover:bg-slate-100 text-slate-600 text-sm font-medium transition-all">Comercial</button>
            </div>
            <div className="flex items-center gap-2 px-2 w-full md:w-auto justify-end">
              <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors" title="Filtros avanzados">
                <span className="material-symbols-outlined text-xl">tune</span>
              </button>
              <button className="p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors" title="Vista mapa">
                <span className="material-symbols-outlined text-xl">map</span>
              </button>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1: Torre Aurora */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
            <div className="relative h-64 overflow-hidden">
              <img alt="Modern apartment complex with greenery" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD2oYf2if6SvckVs15ebCiDig16trAPwRCkkSd1XL9m788RSvL0bnUQd8D-0PDgZFMQLv1T4y26SMbWSXT7o03Gkyb6f6P_RpnSYzVRkEqeBGOAMXjObmSRRJ7d41Cqsu1I9_Z1ERUqxT_252dhyIQxTsx8u8JCuqSmmVjm3u05PtmvpVM4e6pf9RgnsvcdMXL5D5o8KoyDnkjkL4bSFNcSc_uHOd6J1kLrFDAKapZUDi6TJDz7NBKApK4QS23J3uYyG3FYeLPagyQ"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80"></div>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-white/95 backdrop-blur-sm text-deep-blue text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-500">auto_awesome</span>
                  IA Optimized
                </span>
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Preventa
                </span>
              </div>
              <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">favorite</span>
              </button>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-deep-blue group-hover:text-primary transition-colors">Torre Aurora</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span> Polanco, CDMX
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Desde</p>
                  <p className="text-lg font-bold text-deep-blue">$4.5M</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-6 py-3 border-y border-slate-100">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bed</span> 2-3</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bathtub</span> 2</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">square_foot</span> 85-140m²</span>
              </div>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-500">Vendido</span>
                  <span className="text-emerald-600">75%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                </div>
                <button className="w-full py-3 rounded-xl border border-slate-200 text-deep-blue font-bold text-sm hover:bg-deep-blue hover:text-white hover:border-deep-blue transition-all flex items-center justify-center gap-2">
                  Ver análisis completo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Residencial Vistas */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
            <div className="relative h-64 overflow-hidden">
              <img alt="High-rise building with glass facade" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9nbSgnPE0ywgfeaYL2DRPA6S08GQQV3f-spXftouwyydxm6BoGKF93ub1YQaLcqdxmpEFBtEhejqkTnpTl5HPf6zVJM5muUsVf7qN2RR4hRlbuiGtD76dd0GDk7XqHBL18MWM9LmBOEv40vLTwnJGDZzU_SSHMXjOTU8_hbt4N-n7VrC3c2COz7MYSx6XMIMxPrsWyLkqoaOMIvHsWrxRfWEQNqLtkpv2rYnoCaQmxISVd1HzD3Wulr1agdKcOe09vhQtNwUif2I"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80"></div>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-white/95 backdrop-blur-sm text-deep-blue text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-500">trending_up</span>
                  High Yield
                </span>
                <span className="bg-deep-blue text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Entrega Inmediata
                </span>
              </div>
              <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">favorite</span>
              </button>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-deep-blue group-hover:text-primary transition-colors">Residencial Vistas</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span> Zapopan, GDL
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Desde</p>
                  <p className="text-lg font-bold text-deep-blue">$3.2M</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-6 py-3 border-y border-slate-100">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bed</span> 1-2</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bathtub</span> 1.5</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">square_foot</span> 60-90m²</span>
              </div>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-500">Vendido</span>
                  <span className="text-emerald-600">92%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '92%' }}></div>
                </div>
                <button className="w-full py-3 rounded-xl border border-slate-200 text-deep-blue font-bold text-sm hover:bg-deep-blue hover:text-white hover:border-deep-blue transition-all flex items-center justify-center gap-2">
                  Ver análisis completo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Altos de San Pedro */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
            <div className="relative h-64 overflow-hidden">
              <img alt="Modern suburban home" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJwIr43tHbkSL3ZxBM15Gk_MXaNpPUoKWGELChqrXRuLaPVL7bU655GoSo6p7Nt8d9_gE7GQCmnjgzckBhRfwsqj8IsoA3pB6pPNNCjOOXjIfTlU4YwLAscfgJ7xMm6LAhWAsF7lKuMrmOnywKCcYmPl36BXGW_Lc2P18nRHu0b2UE_jgpw4hCabAbnc3o7BzGg51rEKnDj5jAwT0Cf3fpV81sc8cNaULUz9g4RHomMkWM4hE1_BowtSzN5JF_Gqp_v7IrbJyJKOw"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80"></div>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-white/95 backdrop-blur-sm text-deep-blue text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-500">auto_awesome</span>
                  IA Optimized
                </span>
                <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Últimas Unidades
                </span>
              </div>
              <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">favorite</span>
              </button>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-deep-blue group-hover:text-primary transition-colors">Altos de San Pedro</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span> San Pedro, MTY
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Desde</p>
                  <p className="text-lg font-bold text-deep-blue">$5.1M</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-6 py-3 border-y border-slate-100">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bed</span> 3-4</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bathtub</span> 3.5</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">square_foot</span> 150-220m²</span>
              </div>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-500">Vendido</span>
                  <span className="text-emerald-600">88%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '88%' }}></div>
                </div>
                <button className="w-full py-3 rounded-xl border border-slate-200 text-deep-blue font-bold text-sm hover:bg-deep-blue hover:text-white hover:border-deep-blue transition-all flex items-center justify-center gap-2">
                  Ver análisis completo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Workspace Center */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
            <div className="relative h-64 overflow-hidden">
              <img alt="Office building lobby with modern design" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdFgPOuR4fj6DSp7byZcravqcECsncLb5gszvxw3wsveVR4XXmUHYGO-z5_pXR46_NDGFxxaB_KaHJyCnhJrgPAnJblITC6AydElgMsY1AtgKW6NzMLCHB6P8jXbYT6DIbiA3YoeejVb_SrdCohflapJ7YgDIFxepR-UJcjhCNyjVmGiBuSLoHkhDcYej7t1sFnynsCBXxL1ymzelzzXF0BkvWVIJyHI7qQ1hx9wvDaFMkUNoHGlrmlJwy12KFh1XIsX7nsl8zyxg"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80"></div>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-primary text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Lanzamiento
                </span>
              </div>
              <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">favorite</span>
              </button>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-deep-blue group-hover:text-primary transition-colors">Workspace Center</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span> Santa Fe, CDMX
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Desde</p>
                  <p className="text-lg font-bold text-deep-blue">$2.8M</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-6 py-3 border-y border-slate-100">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">crop_square</span> 45-120m²</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">meeting_room</span> Flexible</span>
              </div>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-500">Vendido</span>
                  <span className="text-emerald-600">15%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '15%' }}></div>
                </div>
                <button className="w-full py-3 rounded-xl border border-slate-200 text-deep-blue font-bold text-sm hover:bg-deep-blue hover:text-white hover:border-deep-blue transition-all flex items-center justify-center gap-2">
                  Ver análisis completo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 5: Vita Towers */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
            <div className="relative h-64 overflow-hidden">
              <img alt="Modern condo building balcony view" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBzdP68J7T4UZ7BSSUtU7596z7l27xPR6E0KsuVX2us_vzR9xoA7YoUeqjj0WIFVq9dzvs3LLhh5DB42_PYytqyTT7SI-dHIZvrbpiNhVZoST4kt-SWWLGCCXoPHvVaBNElZwVKFF1FqixJtVBlCCgRQHkOmdE8qeLn5phXp5qXp8vm9QvfA1OJ0Ftr9y1i5pR1HOnKrCQBH5ksWgKbxVJG5V61N2rGg3mWKzCJEnKICYW63VZgn_SH4CzlZ6J8G0Ey2cuXITD4ZY"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80"></div>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-white/95 backdrop-blur-sm text-deep-blue text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-500">trending_up</span>
                  ROI +15%
                </span>
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Preventa
                </span>
              </div>
              <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">favorite</span>
              </button>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-deep-blue group-hover:text-primary transition-colors">Vita Towers</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span> Querétaro, QRO
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Desde</p>
                  <p className="text-lg font-bold text-deep-blue">$3.8M</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-6 py-3 border-y border-slate-100">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bed</span> 2-3</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bathtub</span> 2</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">square_foot</span> 90-135m²</span>
              </div>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-500">Vendido</span>
                  <span className="text-emerald-600">45%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                </div>
                <button className="w-full py-3 rounded-xl border border-slate-200 text-deep-blue font-bold text-sm hover:bg-deep-blue hover:text-white hover:border-deep-blue transition-all flex items-center justify-center gap-2">
                  Ver análisis completo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 6: Skyline Residences */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full">
            <div className="relative h-64 overflow-hidden">
              <img alt="Luxury penthouse interior" className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJWnufzEStolEoL3XpCaeZ6DJZ5ZJAT0KyzCvKG24JOVTDtRkAd8oHPlEfN6ho0SPiuhgJXP6mqi6fYOEuFto5MhxTRkguCKoP5A7L5-IOU2aSeysXRtLdHx6Zuok9eZqsytjTfHoOCP0K0OcftZ-gx25JJ7gTLbiWzMcwwUnZZNsbNytrS2kMWjqxkOjw_FFy0CXx5Xmfk5aPrNazJm3t2nFkEfp_7izb9rhMGv3P0cQanBepfmmhQHFulKevW8xNKaN5i9Y7t3E"/>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80"></div>
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-deep-blue text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                  Entrega Inmediata
                </span>
              </div>
              <button className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">favorite</span>
              </button>
            </div>
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-deep-blue group-hover:text-primary transition-colors">Skyline Residences</h3>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">location_on</span> Cancún, QR
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 font-medium">Desde</p>
                  <p className="text-lg font-bold text-deep-blue">$7.2M</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-6 py-3 border-y border-slate-100">
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bed</span> 3-4</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">bathtub</span> 4</span>
                <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">square_foot</span> 200m²+</span>
              </div>
              <div className="mt-auto">
                <div className="flex justify-between text-xs font-semibold mb-2">
                  <span className="text-slate-500">Vendido</span>
                  <span className="text-emerald-600">98%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '98%' }}></div>
                </div>
                <button className="w-full py-3 rounded-xl border border-slate-200 text-deep-blue font-bold text-sm hover:bg-deep-blue hover:text-white hover:border-deep-blue transition-all flex items-center justify-center gap-2">
                  Ver análisis completo
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Pagination */}
        <div className="max-w-7xl mx-auto mt-16 flex justify-center">
          <nav className="inline-flex rounded-full shadow-sm bg-white p-1.5 border border-slate-100">
            <a className="p-2 rounded-full text-slate-400 hover:text-deep-blue hover:bg-slate-50 transition-colors" href="#">
              <span className="material-symbols-outlined">chevron_left</span>
            </a>
            <a className="px-4 py-2 rounded-full bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-200" href="#">1</a>
            <a className="px-4 py-2 rounded-full text-slate-600 hover:text-deep-blue hover:bg-slate-50 font-medium text-sm transition-colors" href="#">2</a>
            <a className="px-4 py-2 rounded-full text-slate-600 hover:text-deep-blue hover:bg-slate-50 font-medium text-sm transition-colors" href="#">3</a>
            <span className="px-2 py-2 text-slate-400 text-sm">...</span>
            <a className="px-4 py-2 rounded-full text-slate-600 hover:text-deep-blue hover:bg-slate-50 font-medium text-sm transition-colors" href="#">8</a>
            <a className="p-2 rounded-full text-slate-400 hover:text-deep-blue hover:bg-slate-50 transition-colors" href="#">
              <span className="material-symbols-outlined">chevron_right</span>
            </a>
          </nav>
        </div>
      </section>

      {/* Sales Performance Section */}
      <section className="py-24 bg-deep-blue text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -translate-x-1/3 translate-y-1/4"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative bg-slate-900/80 border border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md shadow-2xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-lg">analytics</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Rendimiento de Ventas</h4>
                      <p className="text-xs text-slate-400">Torre Aurora - Últimos 30 días</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded border border-emerald-500/20">En vivo</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-slate-400 mb-1">Leads Calificados</p>
                    <p className="text-2xl font-bold text-white mb-2">1,248</p>
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      +12.5%
                    </div>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                    <p className="text-xs text-slate-400 mb-1">Cierres Totales</p>
                    <p className="text-2xl font-bold text-white mb-2">$42.8M</p>
                    <div className="flex items-center gap-1 text-xs text-emerald-400">
                      <span className="material-symbols-outlined text-sm">trending_up</span>
                      +8.2%
                    </div>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl border border-white/5 p-4">
                  <div className="flex items-end gap-2 h-32 w-full justify-between px-2">
                    <div className="w-full bg-primary/20 hover:bg-primary/40 transition-colors rounded-t h-[40%] relative group">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Lun</div>
                    </div>
                    <div className="w-full bg-primary/30 hover:bg-primary/50 transition-colors rounded-t h-[65%]"></div>
                    <div className="w-full bg-primary/40 hover:bg-primary/60 transition-colors rounded-t h-[50%]"></div>
                    <div className="w-full bg-primary/50 hover:bg-primary/70 transition-colors rounded-t h-[80%]"></div>
                    <div className="w-full bg-emerald-500 hover:bg-emerald-400 transition-colors rounded-t h-[95%] shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <div className="w-full bg-primary/40 hover:bg-primary/60 transition-colors rounded-t h-[60%]"></div>
                    <div className="w-full bg-primary/30 hover:bg-primary/50 transition-colors rounded-t h-[45%]"></div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Vie</span><span>Sab</span><span>Dom</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                <span className="material-symbols-outlined text-sm">bolt</span>
                <span className="text-xs font-bold tracking-widest uppercase">Tecnología de Conversión</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                Transforma datos en cierres inmobiliarios
              </h2>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                No solo mostramos propiedades, aceleramos su venta. Nuestra plataforma integra un CRM inteligente que prioriza los prospectos con mayor probabilidad de compra, permitiendo a tu equipo enfocarse en cerrar tratos.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-primary/20 rounded-full text-primary">
                    <span className="material-symbols-outlined text-sm">check</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Scoring Predictivo de Leads</h4>
                    <p className="text-sm text-slate-400 mt-1">Algoritmos que identifican la intención de compra real.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-primary/20 rounded-full text-primary">
                    <span className="material-symbols-outlined text-sm">check</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Automatización de Seguimiento</h4>
                    <p className="text-sm text-slate-400 mt-1">Nutrición de prospectos vía WhatsApp y Email sin intervención manual.</p>
                  </div>
                </li>
              </ul>
              <button className="bg-white text-deep-blue hover:bg-slate-100 font-bold px-8 py-3.5 rounded-lg transition-all flex items-center gap-2">
                Potenciar mis ventas
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProjectsPage;
