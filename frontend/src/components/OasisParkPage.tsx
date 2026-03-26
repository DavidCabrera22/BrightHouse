import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const WHATSAPP_NUMBER = '573155358659';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20Nova%2C%20me%20interesa%20Oasis%20Park%20%F0%9F%8F%A0`;

const amenidades = [
  { icon: 'pool',           label: 'Piscina adultos y niños' },
  { icon: 'celebration',    label: 'Salón social' },
  { icon: 'fitness_center', label: 'Gimnasio al aire libre' },
  { icon: 'child_care',     label: 'Parque infantil' },
  { icon: 'local_parking',  label: 'Parqueaderos comunales' },
  { icon: 'elevator',       label: '2 Ascensores' },
  { icon: 'bolt',           label: 'Planta eléctrica zonas comunes' },
];

// ── Galería — imágenes en frontend/public/galeria/ ───────────────────────────
const GALLERY_IMAGES = [
  { src: '/galeria/foto-1.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0002.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0003.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0004.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0005.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0006.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0007.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0008.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0009.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0010.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0011.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0012.jpg', alt: 'Oasis Park' },
  { src: '/galeria/Nuevo Book  2 OASIS PARK 2026 PRECIO FIJO 225 (1).pdf 4_page-0013.jpg', alt: 'Oasis Park' },
];

const unidades = [
  { piso: 17, codigo: '1701', tipo: 'A', area: 60, balcon: true },
  { piso: 16, codigo: '1602', tipo: 'B', area: 65, balcon: false },
  { piso: 15, codigo: '1503', tipo: 'A', area: 60, balcon: true },
  { piso: 15, codigo: '1504', tipo: 'B', area: 65, balcon: false },
  { piso: 14, codigo: '1404', tipo: 'B', area: 65, balcon: false },
  { piso: 13, codigo: '1301', tipo: 'A', area: 60, balcon: true },
  { piso: 13, codigo: '1303', tipo: 'A', area: 60, balcon: true },
  { piso: 12, codigo: '1202', tipo: 'B', area: 65, balcon: false },
  { piso: 12, codigo: '1203', tipo: 'A', area: 60, balcon: true },
  { piso: 11, codigo: '1101', tipo: 'A', area: 60, balcon: true },
  { piso: 11, codigo: '1103', tipo: 'A', area: 60, balcon: true },
  { piso: 11, codigo: '1104', tipo: 'B', area: 65, balcon: false },
  { piso: 10, codigo: '1004', tipo: 'B', area: 65, balcon: false },
  { piso: 6,  codigo: '602',  tipo: 'B', area: 65, balcon: false },
  { piso: 6,  codigo: '603',  tipo: 'A', area: 60, balcon: true },
  { piso: 5,  codigo: '502',  tipo: 'B', area: 65, balcon: false },
  { piso: 5,  codigo: '503',  tipo: 'A', area: 60, balcon: true },
  { piso: 5,  codigo: '504',  tipo: 'B', area: 65, balcon: false },
  { piso: 4,  codigo: '402',  tipo: 'B', area: 65, balcon: false },
  { piso: 4,  codigo: '403',  tipo: 'A', area: 60, balcon: true },
  { piso: 4,  codigo: '404',  tipo: 'B', area: 65, balcon: false },
  { piso: 4,  codigo: '407',  tipo: 'B', area: 65, balcon: false },
  { piso: 3,  codigo: '302',  tipo: 'B', area: 65, balcon: false },
  { piso: 3,  codigo: '303',  tipo: 'A', area: 60, balcon: true },
  { piso: 3,  codigo: '304',  tipo: 'B', area: 65, balcon: false },
  { piso: 3,  codigo: '308',  tipo: 'B', area: 65, balcon: false },
  { piso: 2,  codigo: '202',  tipo: 'B', area: 65, balcon: false },
  { piso: 2,  codigo: '203',  tipo: 'A', area: 60, balcon: true },
  { piso: 2,  codigo: '204',  tipo: 'B', area: 65, balcon: false },
  { piso: 2,  codigo: '206',  tipo: 'B', area: 65, balcon: false },
  { piso: 1,  codigo: '102',  tipo: 'B', area: 65, balcon: false },
  { piso: 1,  codigo: '103',  tipo: 'A', area: 60, balcon: true },
  { piso: 1,  codigo: '104',  tipo: 'B', area: 65, balcon: false },
];

const OasisParkPage: React.FC = () => {
  const [filterTipo, setFilterTipo] = useState<'all' | 'A' | 'B'>('all');
  const filtered = unidades.filter(u => filterTipo === 'all' || u.tipo === filterTipo);

  // Gallery lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Credit simulator
  const [subsidio, setSubsidio] = useState(17_650_000);
  const [abono, setAbono] = useState(0);
  const [plazo, setPlazo] = useState(20);

  const PRICE = 238_000_000;
  const CUOTA_INICIAL = PRICE * 0.20; // $47,600,000
  const montoPrestamo = Math.max(0, PRICE - CUOTA_INICIAL - subsidio - abono);
  const r = Math.pow(1.119, 1 / 12) - 1; // 11.9% E.A. → ~0.9435% monthly
  const n = plazo * 12;
  const cuotaMensual = montoPrestamo > 0 ? montoPrestamo * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1) : 0;
  const totalPagado = cuotaMensual * n;
  const totalIntereses = totalPagado - montoPrestamo;

  const openLightbox = (i: number) => setLightboxIndex(i);
  const closeLightbox = () => setLightboxIndex(null);
  const prevImage = useCallback(() =>
    setLightboxIndex(i => i !== null ? (i - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length : null), []);
  const nextImage = useCallback(() =>
    setLightboxIndex(i => i !== null ? (i + 1) % GALLERY_IMAGES.length : null), []);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex, prevImage, nextImage]);

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-display overflow-x-hidden">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-24 min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img
            src="/galeria/foto-1.jpg"
            alt="Oasis Park"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 mb-6">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-300 uppercase tracking-wide">Disponible — 33 unidades</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-4">
              Oasis<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300">Park</span>
            </h1>
            <p className="text-lg text-slate-300 mb-2">Barrio Providencia · Cartagena de Indias</p>
            <p className="text-slate-400 mb-8">Vivienda VIS de 17 pisos · 127 apartamentos · Amenidades premium</p>

            {/* Price badge */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 mb-8 inline-block">
              <p className="text-slate-300 text-sm mb-1">Precio único y fijo</p>
              <p className="text-4xl font-extrabold text-white">$238<span className="text-2xl">.000.000</span></p>
              <p className="text-green-400 text-sm font-semibold mt-1">COP · Todas las unidades</p>
            </div>

            <div className="flex flex-wrap gap-4">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-xl shadow-green-500/30 text-lg"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Consultar con Nova
              </a>
              <a
                href="#inventario"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-bold px-8 py-4 rounded-xl transition-all text-lg"
              >
                Ver disponibilidad
                <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
              </a>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/10">
          <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '17', label: 'Pisos' },
              { value: '127', label: 'Apartamentos' },
              { value: '33', label: 'Disponibles' },
              { value: '60–65m²', label: 'Área' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-white">{s.value}</p>
                <p className="text-xs text-slate-300 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TIPOLOGÍAS ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Tipologías</h2>
            <p className="text-slate-500 dark:text-slate-400">Dos opciones diseñadas para tu estilo de vida</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Tipo A */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-3 py-1 rounded-full">TIPO A</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">60 m²</h3>
                  <p className="text-slate-500 text-sm">57 m² privados</p>
                </div>
                <div className="text-6xl font-black text-blue-100 dark:text-blue-900/50">A</div>
              </div>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {['2 Alcobas', '2 Baños', 'Estudio', 'Sala-comedor', 'Cocina', 'Área de labores', 'Balcón ✓'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500 text-[16px]">check_circle</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors">
                Me interesa este tipo
              </a>
            </div>

            {/* Tipo B */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">TIPO B</span>
                  <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">65 m²</h3>
                  <p className="text-slate-500 text-sm">57 m² privados</p>
                </div>
                <div className="text-6xl font-black text-emerald-100 dark:text-emerald-900/50">B</div>
              </div>
              <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                {['2 Alcobas', '2 Baños', 'Estudio', 'Sala-comedor', 'Cocina', 'Área de labores', 'Mayor área interna'].map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-500 text-[16px]">check_circle</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="mt-6 w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors">
                Me interesa este tipo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERÍA ───────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 mb-4">
              <span className="text-xs font-semibold text-green-300 uppercase tracking-wide">Imágenes del proyecto</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-3">Galería</h2>
            <p className="text-slate-400">Conoce cada rincón de Oasis Park</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {GALLERY_IMAGES.map((img, i) => (
              <button
                key={i}
                onClick={() => openLightbox(i)}
                className={`relative overflow-hidden rounded-2xl group cursor-pointer bg-slate-800 border border-slate-700 hover:border-green-400/50 transition-all duration-300 ${
                  i === 0 ? 'col-span-2 row-span-2 aspect-square md:aspect-auto md:h-72' : 'aspect-square'
                }`}
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 drop-shadow-lg">zoom_in</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Close */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
            {lightboxIndex + 1} / {GALLERY_IMAGES.length}
          </div>

          {/* Prev */}
          <button
            onClick={e => { e.stopPropagation(); prevImage(); }}
            className="absolute left-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors z-10"
          >
            <span className="material-symbols-outlined text-2xl">chevron_left</span>
          </button>

          {/* Image */}
          <img
            src={GALLERY_IMAGES[lightboxIndex].src}
            alt={GALLERY_IMAGES[lightboxIndex].alt}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />

          {/* Next */}
          <button
            onClick={e => { e.stopPropagation(); nextImage(); }}
            className="absolute right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-3 transition-colors z-10"
          >
            <span className="material-symbols-outlined text-2xl">chevron_right</span>
          </button>

          {/* Caption */}
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm text-center">
            {GALLERY_IMAGES[lightboxIndex].alt}
          </p>
        </div>
      )}

      {/* ── INVENTARIO ────────────────────────────────────────────────────── */}
      <section id="inventario" className="py-20 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Inventario disponible</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">33 unidades disponibles · Precio único $238.000.000 COP</p>
            <div className="inline-flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['all', 'A', 'B'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterTipo(t)}
                  className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterTipo === t
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t === 'all' ? 'Todos' : `Tipo ${t}`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filtered.map(u => (
              <a
                key={u.codigo}
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative rounded-xl p-4 border text-center hover:shadow-md transition-all cursor-pointer ${
                  u.tipo === 'A'
                    ? 'border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 hover:border-blue-300'
                    : 'border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10 hover:border-emerald-300'
                }`}
              >
                <div className={`text-xs font-bold mb-1 ${u.tipo === 'A' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  TIPO {u.tipo}
                </div>
                <div className="text-lg font-extrabold text-slate-900 dark:text-white">Apto {u.codigo}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Piso {u.piso} · {u.area}m²</div>
                {u.balcon && (
                  <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-slate-400">
                    <span className="material-symbols-outlined text-[12px]">balcony</span>
                    Balcón
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold">Consultar</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMAS DE PAGO ────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-3">Formas de pago</h2>
            <p className="text-slate-400">Múltiples opciones para hacer tu sueño realidad</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: 'account_balance', title: 'Crédito FNA', desc: 'Fondo Nacional del Ahorro. Ideal para empleados con cesantías. Financia hasta el 80%.', color: 'from-blue-600 to-blue-800' },
              { icon: 'home', title: 'Subsidio VIS', desc: 'Mi Casa Ya y Subsidio Familiar de Vivienda. Hasta $35.300.000 COP según tu situación.', color: 'from-emerald-600 to-emerald-800' },
              { icon: 'join', title: 'Combinación', desc: 'La más usada: Subsidio + Cesantías + Crédito FNA = $238.000.000. Un asesor te guía.', color: 'from-purple-600 to-purple-800' },
              { icon: 'payments', title: 'Recursos propios', desc: 'Pago directo a través de Alianza Fiduciaria que protege tu inversión.', color: 'from-orange-600 to-orange-800' },
            ].map(p => (
              <div key={p.title} className={`bg-gradient-to-br ${p.color} rounded-2xl p-6`}>
                <span className="material-symbols-outlined text-4xl mb-4 block opacity-80">{p.icon}</span>
                <h3 className="font-bold text-lg mb-2">{p.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center text-sm text-slate-500">
            Todos los pagos se canalizan a través de <span className="text-slate-300 font-semibold">Alianza Fiduciaria</span> · Banco aliado: <span className="text-slate-300 font-semibold">FNA</span>
          </div>
        </div>
      </section>

      {/* ── SIMULADOR DE CRÉDITO ──────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30 mb-4">
              <span className="material-symbols-outlined text-green-400 text-[14px]">calculate</span>
              <span className="text-xs font-semibold text-green-300 uppercase tracking-wide">Simulador de crédito</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-3">¿Cuánto pagarías al mes?</h2>
            <p className="text-slate-400">Calcula tu cuota mensual con subsidio VIS y crédito FNA · Tasa referencia 11.9% E.A.</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* ── Controls ── */}
            <div className="space-y-5">
              {/* Subsidio VIS */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-[20px]">home</span>
                    <span className="font-semibold text-white">Subsidio VIS</span>
                  </div>
                  <span className="text-emerald-400 font-bold">${subsidio.toLocaleString('es-CO')}</span>
                </div>
                <input type="range" min={0} max={35_300_000} step={100_000} value={subsidio}
                  onChange={e => setSubsidio(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-slate-600 accent-emerald-400 cursor-pointer" />
                <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                  <span>$0</span><span>$35.300.000</span>
                </div>
                <p className="text-xs text-slate-500 mt-3">Mi Casa Ya + Subsidio Familiar de Vivienda</p>
              </div>

              {/* Cesantías / Abono */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-400 text-[20px]">savings</span>
                    <span className="font-semibold text-white">Cesantías / Abono extra</span>
                  </div>
                  <span className="text-blue-400 font-bold">${abono.toLocaleString('es-CO')}</span>
                </div>
                <input type="range" min={0} max={30_000_000} step={100_000} value={abono}
                  onChange={e => setAbono(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-slate-600 accent-blue-400 cursor-pointer" />
                <div className="flex justify-between text-xs text-slate-500 mt-1.5">
                  <span>$0</span><span>$30.000.000</span>
                </div>
                <p className="text-xs text-slate-500 mt-3">Cesantías FNA + cualquier ahorro propio adicional</p>
              </div>

              {/* Plazo */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-purple-400 text-[20px]">schedule</span>
                  <span className="font-semibold text-white">Plazo del crédito</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[10, 15, 20, 25, 30].map(y => (
                    <button key={y} onClick={() => setPlazo(y)}
                      className={`py-3 rounded-xl text-sm font-bold transition-all ${
                        plazo === y
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                      }`}
                    >
                      {y}<span className="text-[10px] block font-normal">años</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Results ── */}
            <div className="space-y-4 lg:sticky lg:top-24">
              {/* Main result */}
              <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-8 shadow-2xl shadow-green-500/20">
                <p className="text-green-100 text-sm font-medium mb-2">Cuota mensual estimada</p>
                {cuotaMensual > 0 ? (
                  <>
                    <p className="text-5xl font-extrabold text-white leading-none mb-1">
                      ${Math.round(cuotaMensual).toLocaleString('es-CO')}
                    </p>
                    <p className="text-green-200 text-sm mt-2">/ mes · {plazo} años · FNA 11.9% E.A.</p>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-extrabold text-white leading-none mb-1">$0</p>
                    <div className="mt-3 bg-green-500/30 rounded-xl px-4 py-3">
                      <p className="text-green-100 text-sm font-semibold">🎉 ¡Tus aportes cubren el saldo sin crédito!</p>
                    </div>
                  </>
                )}
              </div>

              {/* Breakdown */}
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-sm">
                <h3 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-4">Desglose de la operación</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                      <span className="text-slate-400 text-sm">Precio total</span>
                    </div>
                    <span className="text-white font-semibold text-sm">$238.000.000</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                      <span className="text-slate-400 text-sm">Cuota inicial (20%)</span>
                    </div>
                    <span className="text-orange-400 font-semibold text-sm">− $47.600.000</span>
                  </div>
                  {subsidio > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        <span className="text-slate-400 text-sm">Subsidio VIS</span>
                      </div>
                      <span className="text-emerald-400 font-semibold text-sm">− ${subsidio.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  {abono > 0 && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                        <span className="text-slate-400 text-sm">Cesantías / Abono</span>
                      </div>
                      <span className="text-blue-400 font-semibold text-sm">− ${abono.toLocaleString('es-CO')}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                      <span className="text-white text-sm font-semibold">Monto a financiar</span>
                    </div>
                    <span className="text-purple-400 font-bold">${montoPrestamo.toLocaleString('es-CO')}</span>
                  </div>
                  {montoPrestamo > 0 && (
                    <div className="border-t border-slate-700 pt-3 space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total intereses ({plazo} años)</span>
                        <span className="text-red-400 font-semibold">${Math.round(totalIntereses).toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total pagado al banco</span>
                        <span className="text-white font-semibold">${Math.round(totalPagado).toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA */}
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-500/30 w-full">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Consultar mi caso con Nova
              </a>
              <p className="text-center text-xs text-slate-600">Simulación referencial · Tasa FNA 11.9% E.A. · Sujeto a aprobación crediticia</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── AMENIDADES ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mb-3">Amenidades</h2>
            <p className="text-slate-500 dark:text-slate-400">Un estilo de vida premium en un proyecto VIS</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {amenidades.map(a => (
              <div key={a.label} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">{a.icon}</span>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UBICACIÓN ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white mb-4">Ubicación estratégica</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">
                Diagonal 32A #71-355, Barrio Providencia, Cartagena de Indias.<br />
                Zona estrato 2 rodeada de estrato 4 → alto potencial de valorización.
              </p>
              <div className="space-y-4">
                {[
                  { icon: 'directions_bus', label: 'Transcaribe (transporte público)', time: '8 min' },
                  { icon: 'local_hospital', label: 'Clínica Madre Bernarda', time: '8 min' },
                  { icon: 'directions_bus', label: 'Terminal de Transportes', time: '8 min' },
                  { icon: 'shopping_bag', label: 'Multicentro La Plazuela', time: '10 min' },
                  { icon: 'local_mall', label: 'Ronda Real', time: '15 min' },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-[20px]">{l.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{l.label}</p>
                    </div>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{l.time}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden shadow-xl h-80 bg-slate-200 dark:bg-slate-700">
              <iframe
                title="Oasis Park ubicación"
                src="https://maps.google.com/maps?q=Diagonal+32A+%2371-355,+Barrio+Providencia,+Cartagena&output=embed"
                className="w-full h-full border-0"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gradient-to-br from-green-600 to-emerald-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold mb-4">¿Listo para tu apartamento?</h2>
          <p className="text-green-100 text-lg mb-8">
            Nova, nuestra asistente virtual, está disponible 24/7 para responder todas tus preguntas y guiarte en el proceso.
          </p>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-green-700 hover:bg-green-50 font-bold px-10 py-5 rounded-2xl text-xl transition-all shadow-xl"
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-green-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Hablar con Nova ahora
          </a>
          <p className="text-green-200 text-sm mt-6">
            Sala de ventas: CC Santa Lucía, Local 13, Cartagena · L–V 8am–7pm · Sáb 9am–2pm
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default OasisParkPage;
