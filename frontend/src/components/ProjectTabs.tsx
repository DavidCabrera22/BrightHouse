import { Link, useLocation } from 'react-router-dom';

/**
 * Barra de navegación del proyecto. Estaba duplicada en el resumen y en la
 * analítica; con una quinta pestaña, mantenerla en un solo sitio deja de ser
 * opcional.
 */
export default function ProjectTabs({ projectId }: { projectId?: string }) {
  const { pathname } = useLocation();

  const tabs = [
    { label: 'Resumen', to: `/crm/projects/${projectId}` },
    { label: 'Unidades', to: `/crm/projects/${projectId}/units` },
    { label: 'Cotizaciones', to: `/crm/projects/${projectId}/quotes` },
    { label: 'Documentos', to: `/crm/projects/${projectId}/documents` },
    { label: 'Analítica', to: `/crm/projects/${projectId}/analytics` },
  ];

  return (
    <div className="flex gap-6 border-b border-slate-200 dark:border-slate-800 mb-6">
      {tabs.map(({ label, to }) => {
        const active = pathname === to;
        return (
          <Link
            key={label}
            to={to}
            className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
              active
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
