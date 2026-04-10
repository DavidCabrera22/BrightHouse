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
  assigned_agents?: string[];
}



const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [userRole] = useState<string>(() => localStorage.getItem('user_role') || 'admin');
  const [userId] = useState<string>(() => localStorage.getItem('user_id') || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({ name: '', location: '', status: 'active', total_units: 0, description: '', slug: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    location: '',
    status: 'active',
    image: null as File | null
  });

  useEffect(() => {
    fetchProjects();
  }, [userRole, userId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingCreate) return;
    setSubmittingCreate(true);
    try {
      const token = localStorage.getItem('access_token');

      const formData = new FormData();
      formData.append('name', newProject.name);
      formData.append('location', newProject.location);
      formData.append('status', newProject.status);
      if (newProject.image) {
          formData.append('image', newProject.image);
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        setShowCreateModal(false);
        fetchProjects();
        setNewProject({ name: '', location: '', status: 'active', image: null });
      } else {
        alert('Error al crear el proyecto');
      }
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setSubmittingCreate(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const res = await fetch('/api/projects', { headers });
      
      if (res.ok) {
        let data: Project[] = await res.json();
        
        data = data.map(p => ({
            ...p,
            image: p.image || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1000&auto=format&fit=crop',
            sales_progress: p.sales_progress ?? 0,
            units_sold: p.units_sold ?? 0,
            units_available: p.units_available ?? 0,
            units_process: p.units_process ?? 0,
        }));

        // Client-side filtering for Agent role (if backend doesn't handle it)
        if (userRole === 'agent') {
            data = data.filter(p => p.assigned_agents?.includes(userId));
        }

        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (projectId: string, file: File) => {
    setUploadingImageFor(projectId);
    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        fetchProjects();
      } else {
        alert('Error al cambiar la imagen');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingImageFor(null);
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditForm({
      name: project.name,
      location: project.location,
      status: project.status,
      total_units: project.total_units,
      description: (project as any).description || '',
      slug: (project as any).slug || '',
    });
    setOpenMenuId(null);
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setSavingEdit(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setEditingProject(null);
        fetchProjects();
      } else {
        alert('Error al guardar los cambios');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEdit(false);
    }
  };

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
            <button 
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add_business</span>
              <span>Nuevo Proyecto</span>
            </button>
          )}
        </div>
      }
    >
      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nuevo Proyecto</h3>
                    <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Proyecto</label>
                        <input 
                            type="text" 
                            required
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                            value={newProject.name}
                            onChange={e => setNewProject({...newProject, name: e.target.value})}
                            placeholder="Ej: Torre Vista Marina"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
                        <input 
                            type="text" 
                            required
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                            value={newProject.location}
                            onChange={e => setNewProject({...newProject, location: e.target.value})}
                            placeholder="Ej: Polanco, CDMX"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                        <select
                            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                            value={newProject.status}
                            onChange={e => setNewProject({...newProject, status: e.target.value})}
                        >
                            <option value="active">Activo</option>
                            <option value="preventa">Preventa</option>
                            <option value="construction">En Construcción</option>
                            <option value="finished">Finalizado</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Imagen de Portada</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 dark:border-slate-700 border-dashed rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer relative">
                            <div className="space-y-1 text-center">
                                <span className="material-symbols-outlined text-4xl text-slate-400">image</span>
                                <div className="flex text-sm text-slate-600 dark:text-slate-400">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                        <span>Subir un archivo</span>
                                        <input 
                                            id="file-upload" 
                                            name="file-upload" 
                                            type="file" 
                                            className="sr-only" 
                                            accept="image/*"
                                            onChange={e => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setNewProject({...newProject, image: e.target.files[0]});
                                                }
                                            }}
                                        />
                                    </label>
                                    <p className="pl-1">o arrastrar y soltar</p>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-500">PNG, JPG, GIF hasta 10MB</p>
                                {newProject.image && (
                                    <p className="text-sm text-emerald-600 font-bold mt-2">
                                        Seleccionado: {newProject.image.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={submittingCreate}
                            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-lg transition-all"
                        >
                            {submittingCreate ? 'Creando...' : 'Crear Proyecto'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Proyecto</h3>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleEditProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Proyecto</label>
                <input
                  type="text" required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ubicación</label>
                <input
                  type="text" required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                  value={editForm.location}
                  onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descripción</label>
                <textarea
                  rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none resize-none"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Descripción del proyecto..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug (URL pública)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                  value={editForm.slug}
                  onChange={e => setEditForm({ ...editForm, slug: e.target.value })}
                  placeholder="ej: oasis-park"
                />
                <p className="text-xs text-slate-400 mt-1">Solo letras minúsculas y guiones. Ej: <code>oasis-park</code></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Unidades</label>
                  <input
                    type="number" required min="1"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                    value={editForm.total_units}
                    onChange={e => setEditForm({ ...editForm, total_units: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                  <select
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="active">Activo</option>
                    <option value="preventa">Preventa</option>
                    <option value="construction">En Construcción</option>
                    <option value="finished">Finalizado</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingEdit}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-lg transition-all">
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                {userRole !== 'agent' && (
                  <label className="absolute top-3 left-3 z-20 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-black/60 hover:bg-black/80 text-white rounded-lg px-2 py-1.5 flex items-center gap-1 text-xs font-medium transition-colors">
                      {uploadingImageFor === project.id ? (
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                      )}
                      <span>Cambiar foto</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={uploadingImageFor === project.id}
                      onChange={e => {
                        if (e.target.files?.[0]) handleImageChange(project.id, e.target.files[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
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
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                      className="p-2.5 text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">more_vert</span>
                    </button>
                    {openMenuId === project.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 bottom-12 z-20 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                          <button
                            onClick={() => openEditModal(project)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base text-slate-500">edit</span>
                            Editar proyecto
                          </button>
                          <label className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                            <span className="material-symbols-outlined text-base text-slate-500">photo_camera</span>
                            Cambiar imagen
                            <input type="file" accept="image/*" className="sr-only"
                              onChange={e => {
                                if (e.target.files?.[0]) { handleImageChange(project.id, e.target.files[0]); setOpenMenuId(null); }
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </>
                    )}
                  </div>
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