 import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';
import { Link } from 'react-router-dom';

// Define Project Interface based on backend entity + UI needs
interface Project {
  id: string;
  name: string;
  location: string;
  status: string;
  total_units: number;
  // UI specific fields (mocked if not in backend)
  image?: string;
  sales_progress?: number;
  units_sold?: number;
  units_available?: number;
  units_process?: number;
}

// Mock User Role and Assigned Project (Simulating Agent Context)
// In a real app, this would come from a Context or Redux store after login
const currentUser = {
  role: 'admin', // Change to 'agent' to test agent view
  assignedProjectId: '1' // Example: Agent assigned to "Torre Vista Marina"
};

const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [userRole] = useState<string>(() => localStorage.getItem('user_role') || 'admin');

  useEffect(() => {
    // Using Mock Data to match the design request
    const mockProjects: Project[] = [
      {
        id: '1',
        name: 'Torre Vista Marina',
        location: 'Polanco, CDMX',
        status: 'active',
        total_units: 120,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUibHONR7itDO9jGZD0D55f0kuWDTJOS40LLDJfOF9xrBTe0oEbA1Ibb6kGEVjIovD05lnEpUXi4hVPKhv-3KMPclfO948p6ulwITCgOXK19cSt2KOJZMKgr-hNgGit-4dRUXXtvmV58tW_T1Ao2j7zsHOoWPY5Am5oCeKJ8nJydsPTQCsLubryQkoZpTEPhfNxMS6afMKrr_XxyS56mXHLEopvCTPQXmzx-iLNF7O5hkaqTfJFk-fswllx34vYhYvIQ_EyDr0-rs',
        sales_progress: 75,
        units_sold: 75,
        units_available: 30,
        units_process: 15
      },
      {
        id: '2',
        name: 'Altos de Valle',
        location: 'San Pedro, Monterrey',
        status: 'preventa',
        total_units: 45,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS-kTFiHC0X8GT8ZXxMmRUphDP5OWk4mnk6Z-XCWdrwvyiCa68UOds2jcCx9IcSDqNQ0UjRZjnTNxClfuSZDL11_n4A1khaMSKQElbLsls_-pUTofvxxkBTDbsJZYGgOoOKY2ykHALBRaXC0dCucmqlxBVsT6ffpnqbrB1fC590fyUSeh8rED7r6T1j7EiQzUZwluw7ZysgZutiTij3mryLMuZYN3cdAbkMSbOOyqiTF5V0Hvi6HOO-B7HA_6Fqzr18-KwGFFrv1Y',
        sales_progress: 22,
        units_sold: 5,
        units_available: 35,
        units_process: 5
      },
      {
        id: '3',
        name: 'Azul Residencial',
        location: 'Zona Hotelera, Cancún',
        status: 'active',
        total_units: 88,
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBUU5qHjC25TPu85iekYeKkyotrNqzOUfMpaq7K_3lCLgqZSdO8jJ1PfmPpWiGNKljml_re9MCG1Xbay0fzmZHAelAnFuNxodywZtm9lhblTF0MY-vSOEMTns2CQLHcFkAb1qY4skgVTQoHGG1SNCap96bTasKazqS9iQ8l0scNhG1fCq-tWdg8-Y0uVBkDgnGbRLwB0X-XUjfilMR8nuhPyp4i7yTQiMEDtyQxdebO6PAPOYTbE3WqYijxK6dr_RuLuwzVpphDFFU',
        sales_progress: 92,
        units_sold: 81,
        units_available: 4,
        units_process: 3
      }
    ];
    
    // Simulate API call
    const timer = setTimeout(() => {
        // Filter projects for Agents
        if (userRole === 'agent') {
            // Mock: Agent is assigned to project ID '1'
            const agentProjects = mockProjects.filter(p => p.id === currentUser.assignedProjectId);
            setProjects(agentProjects);
        } else {
            setProjects(mockProjects);
        }
        
        setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [userRole]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Activo</span>;
      case 'preventa':
        return <span className="bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Preventa</span>;
      default:
        return <span className="bg-slate-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">{status}</span>;
    }
  };

  if (loading) {
    return (
      <CrmLayout title="Proyectos" subtitle="Cargando...">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </CrmLayout>
    );
  }

  return (
    <CrmLayout 
      title="Proyectos" 
      subtitle="Administra proyectos, inventario y asignación comercial en tiempo real"
      actions={
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-sm rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            <span className="material-symbols-outlined text-lg">upload</span>
            <span>Importar Unidades</span>
          </button>
          {userRole !== 'agent' && (
            <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
              <span className="material-symbols-outlined text-lg">add_business</span>
              <span>Nuevo Proyecto</span>
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        
        {/* Tabs & Filters */}
        <div className="flex items-center justify-between mb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex gap-8">
            <button 
              onClick={() => setActiveTab('all')}
              className={`pb-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              Todos los Proyectos
            </button>
            <button 
              onClick={() => setActiveTab('preventa')}
              className={`pb-4 text-sm font-medium transition-colors ${activeTab === 'preventa' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              En Preventa
            </button>
            <button 
              onClick={() => setActiveTab('construction')}
              className={`pb-4 text-sm font-medium transition-colors ${activeTab === 'construction' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              En Construcción
            </button>
            <button 
              onClick={() => setActiveTab('finished')}
              className={`pb-4 text-sm font-medium transition-colors ${activeTab === 'finished' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              Finalizados
            </button>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined">grid_view</span>
            </button>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <div key={project.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="h-48 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10"></div>
                <div className="absolute top-3 right-3 z-20">
                  {getStatusBadge(project.status)}
                </div>
                <img 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  alt={project.name} 
                  src={project.image} 
                />
                <div className="absolute bottom-4 left-4 z-20">
                  <div className="flex items-center gap-1 text-white/90">
                    <span className="material-symbols-outlined text-sm">location_on</span>
                    <span className="text-xs font-medium">{project.location}</span>
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight mt-1">{project.name}</h3>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-400 uppercase font-bold">Unidades</span>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{project.total_units} Total</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 uppercase font-bold">Ventas</span>
                    <span className="block text-lg font-bold text-emerald-500">{project.sales_progress}%</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${project.sales_progress}%` }}></div>
                </div>
                
                {/* Counters Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <span className="block text-xl font-bold text-slate-900 dark:text-white">{project.units_available}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Disponibles</span>
                  </div>
                  <div className="text-center border-x border-slate-100 dark:border-slate-800">
                    <span className="block text-xl font-bold text-blue-600">{project.units_process}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">En Proceso</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-xl font-bold text-slate-900 dark:text-white">{project.units_sold}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Vendidas</span>
                  </div>
                </div>
                
                <div className="mt-auto flex items-center gap-2">
                  <Link to={`/crm/projects/${project.id}`} className="flex-1 bg-blue-600 text-white font-bold text-sm py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-center">
                    Administrar
                  </Link>
                  <button className="p-2.5 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <span className="material-symbols-outlined text-lg">more_vert</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </CrmLayout>
  );
};

export default ProjectsPage;