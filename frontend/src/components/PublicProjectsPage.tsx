import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
  total_units: number;
  description?: string;
  image?: string;
  slug?: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: 'Activo', color: 'bg-emerald-500' },
  preventa: { label: 'En Preventa', color: 'bg-amber-500' },
  construction: { label: 'En Construcción', color: 'bg-blue-500' },
  finished: { label: 'Finalizado', color: 'bg-slate-500' },
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1000&auto=format&fit=crop';

const PublicProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [comingSoonName, setComingSoonName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects/public')
      .then(res => res.ok ? res.json() : [])
      .then(data => setProjects(data))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen font-display">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 w-fit mx-auto mb-6">
            <span className="flex h-2 w-2 rounded-full bg-primary"></span>
            <span className="text-xs font-semibold text-primary dark:text-blue-400 uppercase tracking-wide">Portafolio de Proyectos</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
            Proyectos Inmobiliarios
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Descubre nuestros desarrollos residenciales y encuentra el hogar o inversión ideal para ti.
          </p>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-24 text-slate-400">
              <span className="material-symbols-outlined text-6xl mb-4 block">apartment</span>
              <p className="text-lg">Próximamente nuevos proyectos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map(project => {
                const statusInfo = STATUS_MAP[project.status] ?? { label: project.status, color: 'bg-slate-500' };
                const imageUrl = project.image ?? FALLBACK_IMAGE;

                return (
                  <div
                    key={project.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className="h-56 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                      <div className="absolute top-4 right-4 z-20">
                        <span className={`${statusInfo.color} text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider`}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <img
                        src={imageUrl}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute bottom-4 left-4 z-20">
                        <div className="flex items-center gap-1 text-white/90 mb-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          <span className="text-xs font-medium">{project.location}</span>
                        </div>
                        <h3 className="text-white font-bold text-xl">{project.name}</h3>
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col">
                      {project.description && (
                        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4">
                          {project.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-6">
                        <span className="material-symbols-outlined text-base">apartment</span>
                        <span><strong className="text-slate-900 dark:text-white">{project.total_units}</strong> unidades</span>
                      </div>
                      <div className="mt-auto">
                        {project.slug === 'oasis-park' ? (
                          <Link
                            to={`/proyectos/${project.slug}`}
                            className="block w-full bg-primary hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition-colors text-center shadow-lg shadow-primary/20"
                          >
                            Ver proyecto
                          </Link>
                        ) : (
                          <button
                            onClick={() => setComingSoonName(project.name)}
                            className="block w-full bg-primary hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition-colors text-center shadow-lg shadow-primary/20"
                          >
                            Ver proyecto
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {comingSoonName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setComingSoonName(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-8 border border-slate-200 dark:border-slate-700 text-center"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setComingSoonName(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <span className="material-symbols-outlined text-primary text-3xl">construction</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{comingSoonName}</h3>
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

      <Footer />
    </div>
  );
};

export default PublicProjectsPage;
