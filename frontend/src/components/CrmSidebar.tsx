import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

interface TenantOption {
  id: string;
  name: string;
}

/**
 * Solo aparece para quien opera en más de una empresa. Cambiar de empresa pide
 * un token nuevo y recarga el CRM desde el panel: las rutas con un id de
 * proyecto o de lead de la empresa anterior ya no existirían en la nueva.
 */
const TenantSwitcher: React.FC = () => {
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [active, setActive] = useState<string>('');
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    fetch('/api/auth/tenants', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setTenants(data.tenants ?? []);
        setActive(data.active_tenant_id ?? '');
      })
      .catch(() => {});
  }, []);

  if (tenants.length < 2) return null;

  const handleChange = async (tenantId: string) => {
    if (tenantId === active) return;
    setSwitching(true);
    const res = await fetch('/api/auth/switch-tenant', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('access_token', data.access_token);
      window.location.assign('/crm');
    } else {
      setSwitching(false);
      alert('No se pudo cambiar de empresa.');
    }
  };

  return (
    <div className="mb-8">
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 px-1">
        Empresa
      </label>
      <select
        value={active}
        disabled={switching}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-crm-primary outline-none disabled:opacity-50"
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id} className="text-slate-900">
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
};

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
  
  const userRole = localStorage.getItem('user_role');
  const userName = localStorage.getItem('user_name') || 'Usuario';
  const roleLabel: Record<string, string> = {
    SuperAdmin: 'Super Admin',
    super_admin: 'Super Admin',
    Admin: 'Administrador',
    admin: 'Administrador',
    Agent: 'Agente',
    agent: 'Agente',
  };

  return (
    <>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0B1120] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col justify-between overflow-y-auto border-r border-slate-800 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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

          <TenantSwitcher />

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            <Link to="/crm/my-day" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/my-day') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className="material-symbols-outlined">today</span>
              <span className="text-sm font-semibold">Mi día</span>
            </Link>
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
            <Link to="/crm/sales" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/sales') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/sales') ? 'filled' : ''}`}>sell</span>
              <span className="text-sm font-medium">Ventas</span>
            </Link>
            {userRole !== 'Agent' && userRole !== 'agent' && (
              <>
                <Link to="/crm/automations" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/automations') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span className={`material-symbols-outlined ${isActive('/crm/automations') ? 'filled' : ''}`}>smart_toy</span>
                  <span className="text-sm font-medium">Automatizaciones</span>
                </Link>
                <Link to="/crm/marketing" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/marketing') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                  <span className={`material-symbols-outlined ${isActive('/crm/marketing') ? 'filled' : ''}`}>campaign</span>
                  <span className="text-sm font-medium">Marketing Figital</span>
                </Link>
              </>
            )}
            <Link to="/crm/analytics" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/analytics') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span className={`material-symbols-outlined ${isActive('/crm/analytics') ? 'filled' : ''}`}>analytics</span>
              <span className="text-sm font-medium">Analítica</span>
            </Link>
            {(userRole === 'Admin' || userRole === 'admin' || userRole === 'SuperAdmin' || userRole === 'super_admin') && (
              <Link to="/crm/commissions" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/commissions') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <span className={`material-symbols-outlined ${isActive('/crm/commissions') ? 'filled' : ''}`}>payments</span>
                <span className="text-sm font-medium">Comisiones</span>
              </Link>
            )}
            {(userRole === 'Admin' || userRole === 'admin' || userRole === 'SuperAdmin' || userRole === 'super_admin') && (
              <Link to="/crm/users" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/users') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <span className={`material-symbols-outlined ${isActive('/crm/users') ? 'filled' : ''}`}>group</span>
                <span className="text-sm font-medium">Usuarios</span>
              </Link>
            )}
            {(userRole === 'SuperAdmin' || userRole === 'super_admin') && (
              <Link to="/crm/tenants" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive('/crm/tenants') ? 'bg-crm-primary text-white shadow-lg shadow-crm-primary/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <span className={`material-symbols-outlined ${isActive('/crm/tenants') ? 'filled' : ''}`}>corporate_fare</span>
                <span className="text-sm font-medium">Clientes B2B</span>
              </Link>
            )}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-6 border-t border-slate-800">
          <Link to="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors mb-2">
            <span className="material-symbols-outlined">settings</span>
            <span className="text-sm font-medium">Configuración</span>
          </Link>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-white text-sm font-medium truncate">{userName}</p>
                <p className="text-slate-400 text-xs truncate">{roleLabel[userRole || ''] || userRole || 'Usuario'}</p>
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
