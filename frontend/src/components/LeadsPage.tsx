import React, { useState, useEffect } from 'react';
import CrmLayout from './CrmLayout';

interface Lead {
  id: string;
  name: string;
  email: string;
  project_id: string;
  status: string;
  created_at: string;
  project?: { name: string };
  assigned_agent?: { name: string };
  source?: string;
  sale_value?: number;
  agent?: string;
  ai_score?: number;
  last_activity?: string;
}

interface Project {
  id: string;
  name: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  'new': { label: 'Nuevo', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/30' },
  'contacted': { label: 'Contactado', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30' },
  'qualified': { label: 'Calificado', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/30' },
  'lost': { label: 'Perdido', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/30' },
  'won': { label: 'Ganado', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30' },
  'pending': { label: 'Pendiente', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800/30' },
  'negotiation': { label: 'Negociación', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/30' }
};

interface User {
  id: string;
  name: string;
  role: string;
}

const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    project_id: '',
    source: 'web',
    assigned_agent_id: ''
  });

  useEffect(() => {
    const role = localStorage.getItem('user_role');
    setUserRole(role);
    
    fetchLeads();
    fetchProjects();
    if (role === 'admin' || role === 'super_admin') {
      fetchAgents();
    }
  }, []);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('access_token');
      // Assuming there is an endpoint to get users/agents. If not, we might need to adjust.
      // Usually GET /api/users with role filter
      const response = await fetch('/api/users?role=agent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('/api/leads', { headers });
      if (response.ok) {
        const data = await response.json();
        // Enrich data with mock fields if missing from backend for UI demo
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const enrichedData = data.map((lead: any) => ({
          ...lead,
          email: lead.email || 'correo@ejemplo.com',
          source: lead.source || 'Sitio Web',
          agent: lead.assigned_agent?.name || 'Sin Asignar',
          ai_score: lead.ai_score || Math.floor(Math.random() * 100),
          sale_value: lead.sale_value || Math.floor(Math.random() * 1000000) + 100000,
          last_activity: 'Hace 2 horas'
        }));
        setLeads(enrichedData);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        if (data.length > 0) {
          setNewLead(prev => ({ ...prev, project_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const userId = localStorage.getItem('user_id');
      
      // If user is agent, auto-assign. If admin and no agent selected, might remain unassigned or assigned to admin depending on backend logic.
      // Here we explicitly handle the agent logic if needed, but backend should handle creation logic too.
      // If user is 'agent', we force assigned_agent_id to be themselves if not set (though UI hides the field).
      
      const leadPayload = { ...newLead, status: 'new' };
      
      if (userRole === 'agent' && userId) {
          leadPayload.assigned_agent_id = userId;
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leadPayload)
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchLeads(); // Refresh list
        setNewLead({ name: '', email: '', phone: '', project_id: projects[0]?.id || '', source: 'web', assigned_agent_id: '' });
      } else {
        alert('Error al crear el lead');
      }
    } catch (error) {
      console.error('Error creating lead:', error);
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const newLeadsCount = leads.filter(l => l.status === 'new').length;
  const qualifiedCount = leads.filter(l => l.status === 'qualified').length;
  const activeCount = leads.filter(l => ['contacted', 'negotiation', 'pending'].includes(l.status)).length;
  const potentialValue = leads.reduce((sum, l) => sum + (Number(l.sale_value) || 0), 0);

  const pageActions = (
    <div className="flex items-center gap-4">
      <button 
        className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700 transition-colors"
        onClick={() => alert("Importar prospectos próximamente")}
      >
        <span className="material-symbols-outlined text-[18px]">upload</span>
        Importar
      </button>
      <button 
        className="bg-crm-primary hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg shadow-crm-primary/30 transition-all flex items-center gap-2"
        onClick={() => setShowCreateModal(true)}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        <span>Nuevo Prospecto</span>
      </button>
    </div>
  );

  return (
    <CrmLayout 
      title="Gestión Inteligente de Prospectos" 
      subtitle="Puntaje y distribución de prospectos con IA"
      actions={pageActions}
    >
      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nuevo Prospecto</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary focus:border-transparent outline-none transition-all"
                  value={newLead.name}
                  onChange={e => setNewLead({...newLead, name: e.target.value})}
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Correo Electrónico</label>
                <input 
                  type="email" 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary focus:border-transparent outline-none transition-all"
                  value={newLead.email}
                  onChange={e => setNewLead({...newLead, email: e.target.value})}
                  placeholder="juan@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary focus:border-transparent outline-none transition-all"
                  value={newLead.phone}
                  onChange={e => setNewLead({...newLead, phone: e.target.value})}
                  placeholder="+52 55 1234 5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Proyecto de Interés</label>
                <select 
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary focus:border-transparent outline-none transition-all"
                  value={newLead.project_id}
                  onChange={e => setNewLead({...newLead, project_id: e.target.value})}
                >
                  <option value="" disabled>Seleccionar proyecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fuente</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary focus:border-transparent outline-none transition-all"
                  value={newLead.source}
                  onChange={e => setNewLead({...newLead, source: e.target.value})}
                >
                  <option value="web">Sitio Web</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="referral">Referido</option>
                  <option value="ads">Publicidad</option>
                  <option value="event">Evento</option>
                </select>
              </div>
              
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asignar Agente</label>
                  <select 
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary focus:border-transparent outline-none transition-all"
                    value={newLead.assigned_agent_id}
                    onChange={e => setNewLead({...newLead, assigned_agent_id: e.target.value})}
                  >
                    <option value="">Sin Asignar</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-4 flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 text-sm font-bold text-white bg-crm-primary hover:bg-blue-700 rounded-lg shadow-lg shadow-crm-primary/20 transition-all"
                >
                  Guardar Prospecto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
              
              {/* Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Nuevos Prospectos</p>
                    <span className="bg-blue-50 dark:bg-blue-900/30 text-crm-primary p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">person_add</span>
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{newLeadsCount}</h3>
                    <span className="flex items-center text-xs font-bold text-crm-green bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full mb-1">
                      <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                      +12%
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Calificados por IA</p>
                    <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-600 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{qualifiedCount}</h3>
                    <span className="flex items-center text-xs font-bold text-crm-green bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full mb-1">
                      <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                      +24%
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Seguimiento Activo</p>
                    <span className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">timelapse</span>
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{activeCount}</h3>
                    <span className="flex items-center text-xs font-bold text-crm-green bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full mb-1">
                      <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                      +5%
                    </span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Valor Potencial</p>
                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-crm-green p-1.5 rounded-lg">
                      <span className="material-symbols-outlined text-[20px]">monetization_on</span>
                    </span>
                  </div>
                  <div className="flex items-end gap-3">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">${(potentialValue / 1000000).toFixed(1)}M</h3>
                    <span className="flex items-center text-xs font-bold text-crm-green bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full mb-1">
                      <span className="material-symbols-outlined text-[14px] mr-0.5">trending_up</span>
                      +18%
                    </span>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px] relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                  <input 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm focus:ring-2 focus:ring-crm-primary/50 focus:border-crm-primary outline-none transition-all" 
                    placeholder="Buscar por nombre, email..." 
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                <select className="form-select bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm py-2 px-4 pr-8 focus:ring-crm-primary/50 focus:border-crm-primary cursor-pointer text-slate-600 dark:text-slate-300">
                  <option>Todos los Proyectos</option>
                  <option>Skyline Tower</option>
                  <option>Oceanview Estate</option>
                </select>
                <select 
                  className="form-select bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm py-2 px-4 pr-8 focus:ring-crm-primary/50 focus:border-crm-primary cursor-pointer text-slate-600 dark:text-slate-300"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Estado: Todos</option>
                  <option value="new">Nuevo</option>
                  <option value="qualified">Calificado</option>
                  <option value="negotiation">Negociación</option>
                </select>
                <select className="form-select bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm py-2 px-4 pr-8 focus:ring-crm-primary/50 focus:border-crm-primary cursor-pointer text-slate-600 dark:text-slate-300">
                  <option>Agente: Todos</option>
                  <option>David Miller</option>
                  <option>Sarah Jenkins</option>
                </select>
                <select className="form-select bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full text-sm py-2 px-4 pr-8 focus:ring-crm-primary/50 focus:border-crm-primary cursor-pointer text-slate-600 dark:text-slate-300">
                  <option>Puntaje IA: Alto a Bajo</option>
                  <option>Bajo a Alto</option>
                </select>
                <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors ml-auto">
                  <span className="material-symbols-outlined">filter_list</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                        <th className="px-6 py-4">Nombre</th>
                        <th className="px-6 py-4">Proyecto</th>
                        <th className="px-6 py-4">Estado</th>
                        <th className="px-6 py-4">Puntaje IA</th>
                        <th className="px-6 py-4">Fuente</th>
                        <th className="px-6 py-4">Agente</th>
                        <th className="px-6 py-4">Última Actividad</th>
                        <th className="px-6 py-4 text-right">Valor Potencial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                      {loading ? (
                        <tr><td colSpan={8} className="px-6 py-4 text-center">Cargando...</td></tr>
                      ) : filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-slate-200 bg-cover bg-center border border-slate-200" style={{ backgroundImage: "url('https://i.pravatar.cc/150?u=" + lead.id + "')" }}></div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">{lead.name}</p>
                                <p className="text-xs text-slate-500">{lead.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{lead.project?.name || 'General'}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusMap[lead.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${lead.status === 'qualified' ? 'animate-pulse bg-green-500' : 'bg-current'}`}></span>
                              {statusMap[lead.status]?.label || lead.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="relative h-9 w-9">
                                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 36 36">
                                  <path className="text-slate-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3"></path>
                                  <path className={lead.ai_score && lead.ai_score > 80 ? "text-crm-green" : lead.ai_score && lead.ai_score > 50 ? "text-yellow-500" : "text-red-500"} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${lead.ai_score || 0}, 100`} strokeWidth="3"></path>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">{lead.ai_score || 0}</div>
                              </div>
                              <span className="text-xs text-slate-500">{lead.ai_score && lead.ai_score > 80 ? 'Muy Alto' : 'Medio'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-slate-400 text-[18px]">language</span>
                              <span className="text-slate-600 dark:text-slate-300">{lead.source}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex -space-x-2">
                                <div className="h-8 w-8 rounded-full bg-gray-300 border-2 border-white dark:border-slate-800 bg-cover bg-center" style={{ backgroundImage: "url('https://i.pravatar.cc/150?u=agent')" }} title={lead.agent}></div>
                             </div>
                          </td>
                          <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                            Acción Reciente <br/>
                            <span className="text-xs text-slate-400">{lead.last_activity}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">${Number(lead.sale_value || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
    </CrmLayout>
  );
};

export default LeadsPage;
