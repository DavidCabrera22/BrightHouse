import React, { useState, useEffect, useCallback } from 'react';
import CrmLayout from './CrmLayout';
import { useParams, Link } from 'react-router-dom';

interface UnitStatus {
  id: string;
  name: string;
  color_hex: string;
}

interface Unit {
  id: string;
  code: string;
  tower: string;
  floor: number;
  area: number;
  price: number;
  current_status_id: string;
  current_status?: UnitStatus;
  assigned_agent?: User;
  assigned_agent_id?: string;
  // Keep legacy status for now if needed, but prefer current_status object
  status?: string; 
}

interface User {
  id: string;
  name: string;
  role: string;
}

const ProjectUnitsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  
  const [userRole] = useState<string>(() => localStorage.getItem('user_role') || 'admin');
  const [userId] = useState<string>(() => localStorage.getItem('user_id') || '');
  const [units, setUnits] = useState<Unit[]>([]);
  const [statuses, setStatuses] = useState<UnitStatus[]>([]);
  const [projectName, setProjectName] = useState<string>('Cargando...');

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);

  // Bulk Create State
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [bulkConfig, setBulkConfig] = useState({
      tower: '',
      floors: 1,
      unitsPerFloor: 1,
      startFloor: 1,
      area: 0,
      price: 0,
      namingPattern: 'A-{floor}0{unit}' // e.g. A-101, A-102
  });

  // Bulk Edit State
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditConfig, setBulkEditConfig] = useState({
      price: '',
      area: '',
      tower: '',
      floor: '',
      status: '',
      assigned_agent_id: '',
      namingPattern: '' // Optional: Rename selected units with a pattern
  });

  const toggleSelection = (id: string) => {
      const newSelection = new Set(selectedUnitIds);
      if (newSelection.has(id)) {
          newSelection.delete(id);
      } else {
          newSelection.add(id);
      }
      setSelectedUnitIds(newSelection);
  };

  const toggleSelectAll = () => {
      if (selectedUnitIds.size === units.length) {
          setSelectedUnitIds(new Set());
      } else {
          setSelectedUnitIds(new Set(units.map(u => u.id)));
      }
  };

  const handleBulkEditSave = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const token = localStorage.getItem('access_token');
          const updates = Array.from(selectedUnitIds);
          
          let updatedCount = 0;

          // Convert Set to Array to index for naming pattern
          const selectedUnitsList = units.filter(u => selectedUnitIds.has(u.id));

          await Promise.all(selectedUnitsList.map(async (unit, index) => {
              const payload: any = {};
              
              if (bulkEditConfig.price) payload.price = Number(bulkEditConfig.price);
              if (bulkEditConfig.area) payload.area = Number(bulkEditConfig.area);
              if (bulkEditConfig.tower) payload.tower = bulkEditConfig.tower;
              if (bulkEditConfig.floor) payload.floor = bulkEditConfig.floor;
              if (bulkEditConfig.status) payload.current_status_id = bulkEditConfig.status;
              if (bulkEditConfig.assigned_agent_id) payload.assigned_agent_id = bulkEditConfig.assigned_agent_id;
              
              // Pattern Renaming
              if (bulkEditConfig.namingPattern) {
                  // Variables: {i} = index+1, {old} = old code, {floor} = unit.floor (if exists or updated)
                  // Simple sequential renaming for selection
                  payload.code = bulkEditConfig.namingPattern
                      .replace('{i}', (index + 1).toString().padStart(2, '0'))
                      .replace('{old}', unit.code)
                      .replace('{floor}', payload.floor || unit.floor || '0');
              }

              if (Object.keys(payload).length > 0) {
                  const res = await fetch(`/api/units/${unit.id}`, {
                      method: 'PATCH',
                      headers: { 
                          'Authorization': `Bearer ${token}`,
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(payload)
                  });
                  if (res.ok) updatedCount++;
              }
          }));

          alert(`${updatedCount} unidades actualizadas exitosamente`);
          setShowBulkEditModal(false);
          setSelectedUnitIds(new Set()); // Clear selection
          setBulkEditConfig({ price: '', area: '', tower: '', floor: '', status: '', assigned_agent_id: '', namingPattern: '' });
          fetchUnits();
      } catch (error) {
          console.error('Error bulk updating units:', error);
          alert('Error al actualizar unidades masivamente');
      }
  };

  useEffect(() => {
      const fetchStatuses = async () => {
          try {
            const token = localStorage.getItem('access_token');
            const res = await fetch('/api/unit-statuses', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setStatuses(await res.json());
            }
          } catch (error) {
              console.error('Error fetching statuses:', error);
          }
      };
      fetchStatuses();
  }, []);

  const handleEditClick = (unit: Unit) => {
      setEditingUnit(unit);
      setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUnit) return;

      try {
        const token = localStorage.getItem('access_token');
        
        // Construct payload matching UpdateUnitDto
        const payload: any = {
            price: Number(editingUnit.price), // Ensure it's a number
            current_status_id: editingUnit.current_status_id,
        };

        if (editingUnit.assigned_agent_id) {
            payload.assigned_agent_id = editingUnit.assigned_agent_id;
        }
 
        console.log('Sending payload:', payload); // Debug payload

        const res = await fetch(`/api/units/${editingUnit.id}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Unidad actualizada');
            setShowEditModal(false);
            setEditingUnit(null);
            fetchUnits(); 
        } else {
            const err = await res.json();
            console.error('Update failed:', err);
            alert('Error al actualizar: ' + (err.message || 'Error desconocido'));
        }
      } catch (error) {
          console.error('Error updating unit:', error);
      }
  };

  const fetchProjectDetails = useCallback(async () => {
      try {
          const token = localStorage.getItem('access_token');
          const res = await fetch(`/api/projects/${projectId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
              const data = await res.json();
              setProjectName(data.name);
          }
      } catch (error) {
          console.error('Error fetching project details:', error);
          setProjectName('Proyecto no encontrado');
      }
  }, [projectId]);

  const fetchUnits = useCallback(async () => {
    try {
      setUnits([]); // Clear previous units immediately
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/units?project_id=${projectId}`, { 
          headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
          const data = await res.json();
          setUnits(data);
      } else {
          setUnits([]);
      }
    } catch (error) {
        console.error('Error fetching units:', error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectDetails();
    fetchUnits();
  }, [fetchUnits, fetchProjectDetails]);

  useEffect(() => {
    if (userRole === 'admin') {
        const fetchAgents = async () => {
            try {
              const token = localStorage.getItem('access_token');
              const res = await fetch('/api/users?role=agent', {
                  headers: { 'Authorization': `Bearer ${token}` }
              });
              if (res.ok) {
                  setAgents(await res.json());
              }
            } catch (error) {
                console.error('Error fetching agents:', error);
            }
        };
        fetchAgents();
    }
  }, [userRole]);

  const handleReserve = async (unitId: string) => {
      // Call API PATCH /units/:id with status='reserved'
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`/api/units/${unitId}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                status: 'reserved',
                assigned_agent_id: userId // Backend should validate this
            })
        });

        if (res.ok) {
            // Optimistic update
            setUnits(prev => prev.map(u => u.id === unitId ? { ...u, status: 'reserved', agent: 'Tú (Reservado)' } : u));
            alert('Unidad reservada exitosamente');
        } else {
            alert('Error al reservar la unidad');
        }
      } catch (error) {
          console.error('Error reserving unit:', error);
      }
  };

  const getStatusBadge = (unit: Unit) => {
    if (unit.current_status) {
        return (
            <span 
                className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"
                style={{ 
                    backgroundColor: `${unit.current_status.color_hex}20`, 
                    color: unit.current_status.color_hex 
                }}
            >
                <span 
                    className="w-1.5 h-1.5 rounded-full" 
                    style={{ backgroundColor: unit.current_status.color_hex }}
                ></span> 
                {unit.current_status.name}
            </span>
        );
    }
    // Fallback if no status object
    return <span className="text-slate-500 text-xs">Sin Estado</span>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
  };

  return (
    <CrmLayout 
      title="Unidades (Apartamentos)" 
      subtitle="Inventario en tiempo real y gestión comercial por torre."
      actions={
        <div className="flex items-center gap-3">
           <button className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar
          </button>
          <button 
            onClick={() => setShowBulkCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            {userRole === 'admin' ? 'Generar Unidades' : 'Registrar Venta'}
          </button>
        </div>
      }
    >
      {/* Bulk Create Modal */}
      {showBulkCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Generar Unidades Masivamente</h3>
                      <button onClick={() => setShowBulkCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <form onSubmit={handleBulkCreate} className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Torre / Bloque</label>
                              <input 
                                  type="text" 
                                  required
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkConfig.tower}
                                  onChange={e => setBulkConfig({...bulkConfig, tower: e.target.value})}
                                  placeholder="Ej: Torre A"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Patrón de Nombre</label>
                              <input 
                                  type="text" 
                                  required
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkConfig.namingPattern}
                                  onChange={e => setBulkConfig({...bulkConfig, namingPattern: e.target.value})}
                                  placeholder="Ej: A-{floor}0{unit}"
                              />
                              <p className="text-xs text-slate-400 mt-1">Usa variables: {`{floor}`} para piso, {`{unit}`} para número</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Piso Inicial</label>
                              <input 
                                  type="number" 
                                  min="1"
                                  required
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkConfig.startFloor}
                                  onChange={e => setBulkConfig({...bulkConfig, startFloor: Number(e.target.value)})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad de Pisos</label>
                              <input 
                                  type="number" 
                                  min="1"
                                  required
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkConfig.floors}
                                  onChange={e => setBulkConfig({...bulkConfig, floors: Number(e.target.value)})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unidades por Piso</label>
                              <input 
                                  type="number" 
                                  min="1"
                                  required
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkConfig.unitsPerFloor}
                                  onChange={e => setBulkConfig({...bulkConfig, unitsPerFloor: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Área (m²)</label>
                              <input 
                                  type="number" 
                                  required
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkConfig.area}
                                  onChange={e => setBulkConfig({...bulkConfig, area: Number(e.target.value)})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio Base</label>
                              <input 
                                  type="number" 
                                  required
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkConfig.price}
                                  onChange={e => setBulkConfig({...bulkConfig, price: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Vista Previa:</p>
                          <div className="flex flex-wrap gap-2">
                              {[...Array(Math.min(5, bulkConfig.unitsPerFloor))].map((_, i) => (
                                  <span key={i} className="bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 font-mono">
                                      {bulkConfig.namingPattern
                                          .replace('{floor}', bulkConfig.startFloor.toString())
                                          .replace('{unit}', (i+1).toString().padStart(2, '0'))}
                                  </span>
                              ))}
                              {bulkConfig.unitsPerFloor > 5 && <span className="text-xs text-slate-400 self-center">...</span>}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                              Total a generar: <span className="font-bold text-blue-600">{bulkConfig.floors * bulkConfig.unitsPerFloor} unidades</span>
                          </p>
                      </div>

                      <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                          <button 
                              type="button" 
                              onClick={() => setShowBulkCreateModal(false)}
                              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit" 
                              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-all"
                          >
                              Generar Unidades
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          Editando {selectedUnitIds.size} Unidades
                      </h3>
                      <button onClick={() => setShowBulkEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <form onSubmit={handleBulkEditSave} className="p-6 space-y-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                          <span className="font-bold">Nota:</span> Solo se actualizarán los campos que llenes. Deja en blanco los que quieras mantener igual.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio (Actualizar a)</label>
                              <input 
                                  type="number" 
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkEditConfig.price}
                                  onChange={e => setBulkEditConfig({...bulkEditConfig, price: e.target.value})}
                                  placeholder="Sin cambios"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Área m² (Actualizar a)</label>
                              <input 
                                  type="number" 
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkEditConfig.area}
                                  onChange={e => setBulkEditConfig({...bulkEditConfig, area: e.target.value})}
                                  placeholder="Sin cambios"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Torre (Actualizar a)</label>
                              <input 
                                  type="text" 
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkEditConfig.tower}
                                  onChange={e => setBulkEditConfig({...bulkEditConfig, tower: e.target.value})}
                                  placeholder="Sin cambios"
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Piso (Actualizar a)</label>
                              <input 
                                  type="text" 
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkEditConfig.floor}
                                  onChange={e => setBulkEditConfig({...bulkEditConfig, floor: e.target.value})}
                                  placeholder="Sin cambios"
                              />
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                              <select 
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkEditConfig.status}
                                  onChange={e => setBulkEditConfig({...bulkEditConfig, status: e.target.value})}
                              >
                                  <option value="">Sin cambios</option>
                                  {statuses.map(status => (
                                      <option key={status.id} value={status.id}>{status.name}</option>
                                  ))}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Agente</label>
                              <select 
                                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                  value={bulkEditConfig.assigned_agent_id}
                                  onChange={e => setBulkEditConfig({...bulkEditConfig, assigned_agent_id: e.target.value})}
                              >
                                  <option value="">Sin cambios</option>
                                  {agents.map(agent => (
                                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Renombrar (Patrón Opcional)</label>
                          <input 
                              type="text" 
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                              value={bulkEditConfig.namingPattern}
                              onChange={e => setBulkEditConfig({...bulkEditConfig, namingPattern: e.target.value})}
                              placeholder="Ej: B-{i} (B-01, B-02...)"
                          />
                          <p className="text-xs text-slate-400 mt-1">Variables: {`{i}`} = secuencia (01, 02...), {`{floor}`} = piso actual</p>
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                          <button 
                              type="button" 
                              onClick={() => setShowBulkEditModal(false)}
                              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                              Cancelar
                          </button>
                          <button 
                              type="submit" 
                              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-all"
                          >
                              Aplicar Cambios
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Edit Unit Modal */}
      {showEditModal && editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Editar Unidad {editingUnit.code}</h3>
                    <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio</label>
                            <input 
                                type="number" 
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                value={editingUnit.price}
                                onChange={e => setEditingUnit({...editingUnit, price: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                            <select 
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                value={editingUnit.current_status_id || ''}
                                onChange={e => setEditingUnit({...editingUnit, current_status_id: e.target.value})}
                            >
                                <option value="" disabled>Seleccionar Estado</option>
                                {statuses.map(status => (
                                    <option key={status.id} value={status.id}>{status.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Add Agent Assignment Logic Here */}
                    {agents.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reasignar Agente</label>
                            <select 
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                                value={editingUnit.assigned_agent_id || ''}
                                onChange={e => setEditingUnit({...editingUnit, assigned_agent_id: e.target.value})}
                            >
                                <option value="">Sin Agente Asignado</option>
                                {agents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="pt-4 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowEditModal(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-all"
                        >
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        
        {/* Breadcrumbs / Project Context */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
           <Link to="/crm/projects" className="hover:text-blue-600">Proyectos</Link>
           <span className="material-symbols-outlined text-sm">chevron_right</span>
           <Link to={`/crm/projects/${projectId}`} className="hover:text-blue-600">{projectName}</Link>
           <span className="material-symbols-outlined text-sm">chevron_right</span>
           <span className="text-slate-900 dark:text-white font-medium">Unidades</span>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Torre</label>
                <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200 min-w-[150px]">
                    <option>Todas las Torres</option>
                    <option>Torre Norte</option>
                    <option>Torre Sur</option>
                    <option>Torre Este</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200 min-w-[150px]">
                    <option>Todos los Estados</option>
                    <option>Disponible</option>
                    <option>En proceso</option>
                    <option>Separada</option>
                    <option>Vendida</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agente</label>
                <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200 min-w-[150px]">
                    <option>Cualquier Agente</option>
                    <option>Carlos Ruiz</option>
                    <option>Ana Milena</option>
                </select>
            </div>
             <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rango de Precio</label>
                <select className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-blue-600 text-slate-700 dark:text-slate-200 min-w-[150px]">
                    <option>Cualquier precio</option>
                    <option>Menos de $400M</option>
                    <option>$400M - $600M</option>
                    <option>Más de $600M</option>
                </select>
            </div>
            <div className="ml-auto pt-5">
                <button className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    Limpiar Filtros
                </button>
            </div>
        </div>

        {/* Units Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Torre</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Piso</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">Área M²</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Agente Asignado</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {units.map((unit) => (
                    <tr key={unit.id} className={`transition-colors ${selectedUnitIds.has(unit.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'}`}>
                        <td className="px-6 py-4">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                checked={selectedUnitIds.has(unit.id)}
                                onChange={() => toggleSelection(unit.id)}
                            />
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{unit.code}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{unit.tower}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-center">{unit.floor}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-center">{unit.area} m²</td>
                        <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(unit.price)}</td>
                        <td className="px-6 py-4">
                            {getStatusBadge(unit)}
                        </td>
                        <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                {unit.assigned_agent ? (
                                    <>
                                        <div className="size-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                            {unit.assigned_agent.name?.substring(0,2).toUpperCase() || 'AG'}
                                        </div>
                                        <span className="text-sm text-slate-600 dark:text-slate-300">{unit.assigned_agent.name || 'Agente'}</span>
                                    </>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">Sin asignar</span>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                             {/* Actions Menu - Simplified for now */}
                             <div className="flex items-center justify-end gap-2">
                               {userRole === 'admin' && (
                                 <button 
                                    className="text-slate-400 hover:text-blue-600 transition-colors" 
                                    title="Editar"
                                    onClick={() => handleEditClick(unit)}
                                >
                                    <span className="material-symbols-outlined">edit</span>
                                </button>
                               )}
                               {userRole === 'agent' && unit.current_status?.name === 'Disponible' && (
                                 <button 
                                    onClick={() => handleReserve(unit.id)}
                                    className="text-emerald-500 hover:text-emerald-700 transition-colors bg-emerald-50 px-2 py-1 rounded text-xs font-bold" 
                                    title="Reservar"
                                 >
                                    Reservar
                                </button>
                               )}
                               <button className="text-slate-400 hover:text-blue-600 transition-colors">
                                  <span className="material-symbols-outlined">more_vert</span>
                              </button>
                             </div>
                        </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
           {/* Pagination */}
           <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                <span className="text-sm text-slate-500">Mostrando <span className="font-bold text-slate-900 dark:text-white">1</span> a <span className="font-bold text-slate-900 dark:text-white">6</span> de <span className="font-bold text-slate-900 dark:text-white">142</span> unidades</span>
                <div className="flex gap-2">
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">1</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-colors text-sm font-medium">2</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-colors text-sm font-medium">3</button>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
           </div>
        </div>

        {/* Footer Summary */}
        <div className="mt-auto border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <div className="flex gap-4">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs">Resumen:</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 42 Disponibles</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 18 En proceso</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> 82 Vendidas</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-slate-400">Ventas totales:</span>
                <span className="text-xl font-black text-blue-600">$45.280.000.000</span>
            </div>
        </div>

      </div>
    </CrmLayout>
  );
};

export default ProjectUnitsPage;