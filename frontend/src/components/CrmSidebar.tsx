import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface CrmSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const CrmSidebar: React.FC<CrmSidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/crm' && location.pathname === '/crm') return true;
    if (path !== '/crm' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0B1120] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col justify-between border-r border-slate-800 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-crm-primary p-2 rounded-lg">
              <span className="material-symbols-outlined text-white" style={{ fontSize: '24px' }}>real_estate_agent</span>
            </div>
            <div>
              <h1 className="text-white text-lg font-bold leading-tight">BrightHouse</h1>
              <p className="text-slate-400 text-xs font-medium">AI Real Estate CRM</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            <Link to="/crm" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm') ? 'filled' : ''}`}>dashboard</span>
              <span className="text-sm font-semibold">Panel Principal</span>
            </Link>
            <Link to="/crm/leads" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/leads') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/leads') ? 'filled' : ''}`}>group</span>
              <span className="text-sm font-medium">Leads</span>
            </Link>
            <Link to="/crm/pipeline" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/pipeline') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/pipeline') ? 'filled' : ''}`}>view_kanban</span>
              <span className="text-sm font-medium">Pipeline</span>
            </Link>
            <Link to="/crm/conversations" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/conversations') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/conversations') ? 'filled' : ''}`}>chat_bubble</span>
              <span className="text-sm font-medium">Conversaciones</span>
            </Link>
            <Link to="/crm/projects" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/projects') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/projects') ? 'filled' : ''}`}>folder_open</span>
              <span className="text-sm font-medium">Proyectos</span>
            </Link>
            <Link to="/crm/automations" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/automations') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/automations') ? 'filled' : ''}`}>smart_toy</span>
              <span className="text-sm font-medium">Automatizaciones</span>
            </Link>
            <Link to="/crm/marketing" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/marketing') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/marketing') ? 'filled' : ''}`}>campaign</span>
              <span className="text-sm font-medium">Marketing Figital</span>
            </Link>
            <Link to="/crm/analytics" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/analytics') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/analytics') ? 'filled' : ''}`}>analytics</span>
              <span className="text-sm font-medium">Analítica</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-6 border-t border-slate-800">
          <Link to="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors mb-2">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Configuración</span>
          </Link>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cover bg-center border-2 border-slate-700" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBF1pX4ocxu3wzLBvCeb3eQh5VIEe5IS0yL1swdbSvyUl5y6_h3Ec3qFCuNek2BJ0wCagwnI3iB1fZPFPrhBFkyisP457G9_fivYPfju3Nq6RosPpCblTaLGKUwfge2JzwjqXLJNMsCuWjJSglXxKxa-G7XHzx4snDUwIKP2rFYJ3SbRKu0rwF2A88THmJFgy_lV-Uts5ONH_sUnjBzv-Z67kbjMFYx-fcZry2AsTj16aACLYH_1TwyOT84N7MxYIWgiAQkZcYQk2E')" }}></div>
              <div className="flex flex-col">
                <p className="text-white text-sm font-medium">David Miller</p>
                <p className="text-slate-400 text-xs">Agente Senior</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-white/5"
              title="Cerrar Sesión"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </>
  );
};

export default CrmSidebar;