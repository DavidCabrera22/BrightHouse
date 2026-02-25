import React, { useState } from 'react';
import CrmSidebar from './CrmSidebar';
import ThemeToggle from './ThemeToggle';

interface CrmLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const CrmLayout: React.FC<CrmLayoutProps> = ({ children, title, subtitle, actions }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#f6f6f8] dark:bg-[#0B1120] font-manrope text-slate-900 dark:text-slate-100 antialiased overflow-hidden transition-colors duration-300">
      <CrmSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-10 transition-colors duration-300">
          
          {/* Mobile Menu & Title */}
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden text-slate-500 hover:text-crm-primary dark:text-slate-400 dark:hover:text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            
            <div className="flex flex-col">
              {title && (
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{title}</h2>
              )}
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden lg:block">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Search Bar (Hidden on mobile) */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
            <input 
              type="text" 
              placeholder="Buscar leads, propiedades..." 
              className="w-full bg-slate-100 dark:bg-slate-800/50 border-none rounded-full py-2.5 pl-12 pr-4 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 sm:gap-5">
            <ThemeToggle />
            
            <button 
              className="relative p-2 text-slate-400 hover:text-crm-primary dark:text-slate-400 dark:hover:text-white transition-colors"
              onClick={() => alert("Notificaciones próximamente")}
            >
              <span className="material-symbols-outlined filled">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0F172A]"></span>
            </button>

            <button 
              className="relative p-2 text-slate-400 hover:text-crm-primary dark:text-slate-400 dark:hover:text-white transition-colors"
              onClick={() => alert("Mensajes próximamente")}
            >
              <span className="material-symbols-outlined filled">chat_bubble</span>
            </button>

            {actions}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto bg-[#f6f6f8] dark:bg-[#0B1120] p-8 transition-colors duration-300">
          {children}
        </div>
      </main>
    </div>
  );
};

export default CrmLayout;