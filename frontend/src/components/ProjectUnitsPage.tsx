import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CrmLayout from './CrmLayout';
import { useParams, Link } from 'react-router-dom';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const formatCurrencyShort = (value: number) => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `$${Math.round(value / 1_000_000)}M`;
  if (value >= 1_000)         return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
};

interface UnitStatus {
  id: string;
  name: string;
  color_hex: string;
  order_sequence: number;
}

interface Unit {
  id: string;
  code: string;
  tower: string;
  floor: number;
  area: number;
  price: number;
  unit_type?: string;
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
  
  const [userRole] = useState<string>(() => (localStorage.getItem('user_role') || 'admin').toLowerCase());
  const [userId] = useState<string>(() => localStorage.getItem('user_id') || '');
  const [units, setUnits] = useState<Unit[]>([]);
  const [statuses, setStatuses] = useState<UnitStatus[]>([]);
  const [projectName, setProjectName] = useState<string>('Cargando...');

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const [openStatusFor, setOpenStatusFor] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);
  const [showManageStatuses, setShowManageStatuses] = useState(false);
  const [showTowerModal, setShowTowerModal] = useState(false);
  const [extraTowers, setExtraTowers] = useState<string[]>([]); // torres creadas pero sin unidades aún
  const [renamingTower, setRenamingTower] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newTowerName, setNewTowerName] = useState('');
  const [renamingInProgress, setRenamingInProgress] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  // ── Filters ──
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterTower, setFilterTower]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAgent, setFilterAgent]   = useState('');
  const [filterPrice, setFilterPrice]   = useState('');
  const [filterType, setFilterType]     = useState('');

  const clearFilters = () => {
    setSearchQuery('');
    setFilterTower('');
    setFilterStatus('');
    setFilterAgent('');
    setFilterPrice('');
    setFilterType('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterTower || filterStatus || filterAgent || filterPrice || filterType;

  // Unique towers: from units + manually created ones
  const towers = useMemo(() => {
    const fromUnits = units.map(u => u.tower).filter(Boolean) as string[];
    return [...new Set([...fromUnits, ...extraTowers])].sort();
  }, [units, extraTowers]);

  // Unique unit types
  const unitTypes = useMemo(() => {
    return [...new Set(units.map(u => u.unit_type).filter(Boolean) as string[])].sort();
  }, [units]);

  // Dynamic price ranges (3 equal buckets from min to max)
  const priceRanges = useMemo(() => {
    const prices = units.map(u => u.price).filter(Boolean);
    if (prices.length < 2) return [];
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return [];
    const step = (max - min) / 3;
    return [
      { value: '1', label: `Hasta ${formatCurrencyShort(min + step)}`, max: min + step },
      { value: '2', label: `${formatCurrencyShort(min + step)} – ${formatCurrencyShort(min + 2 * step)}`, min: min + step, max: min + 2 * step },
      { value: '3', label: `Más de ${formatCurrencyShort(min + 2 * step)}`, min: min + 2 * step },
    ];
  }, [units]);

  // Filtered + searched units
  const filteredUnits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return units.filter(u => {
      if (q) {
        const haystack = [u.code, u.tower, u.unit_type, u.assigned_agent?.name, String(u.floor)]
          .join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterTower && u.tower !== filterTower) return false;
      if (filterType && (u.unit_type || '') !== filterType) return false;
      if (filterStatus && u.current_status_id !== filterStatus) return false;
      if (filterAgent === '__none__' && u.assigned_agent_id) return false;
      if (filterAgent && filterAgent !== '__none__' && u.assigned_agent_id !== filterAgent) return false;
      if (filterPrice) {
        const range = priceRanges.find(r => r.value === filterPrice);
        if (range) {
          if (range.min !== undefined && u.price < range.min) return false;
          if (range.max !== undefined && u.price >= range.max) return false;
        }
      }
      return true;
    });
  }, [units, searchQuery, filterTower, filterType, filterStatus, filterAgent, filterPrice, priceRanges]);

  // Single Create State
  const [showSingleCreateModal, setShowSingleCreateModal] = useState(false);
  const [singleUnit, setSingleUnit] = useState({ code: '', tower: '', floor: '', area: '', price: '', unit_type: '', status_id: '' });

  const handleSingleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    const disponible = statuses.find(s => s.name === 'Disponible');
    const res = await fetch('/api/units', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        project_id: projectId,
        code: singleUnit.code,
        tower: singleUnit.tower || undefined,
        floor: singleUnit.floor || undefined,
        area: singleUnit.area ? Number(singleUnit.area) : undefined,
        price: singleUnit.price ? Number(singleUnit.price) : undefined,
        unit_type: singleUnit.unit_type || undefined,
        current_status_id: singleUnit.status_id || disponible?.id,
      }),
    });
    if (res.ok) {
      setShowSingleCreateModal(false);
      setSingleUnit({ code: '', tower: '', floor: '', area: '', price: '', unit_type: '', status_id: '' });
      fetchUnits();
    } else {
      const err = await res.json();
      alert('Error: ' + (err.message || 'No se pudo crear la unidad'));
    }
  };

  // Bulk Create State
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  interface Typology { name: string; area: number; price: number; count: number; }
  const [bulkConfig, setBulkConfig] = useState({
      tower: '',
      floors: 1,
      startFloor: 1,
      namingPattern: '{floor}0{unit}',
      typologies: [{ name: 'Tipo A', area: 60, price: 0, count: 1 }] as Typology[],
  });

  const addTypology = () => {
    setBulkConfig(prev => ({
      ...prev,
      typologies: [...prev.typologies, { name: `Tipo ${String.fromCharCode(65 + prev.typologies.length)}`, area: 0, price: 0, count: 1 }],
    }));
  };

  const removeTypology = (index: number) => {
    setBulkConfig(prev => ({
      ...prev,
      typologies: prev.typologies.filter((_, i) => i !== index),
    }));
  };

  const updateTypology = (index: number, field: keyof Typology, value: string | number) => {
    setBulkConfig(prev => ({
      ...prev,
      typologies: prev.typologies.map((t, i) => i === index ? { ...t, [field]: value } : t),
    }));
  };

  const totalUnitsPerFloor = bulkConfig.typologies.reduce((sum, t) => sum + t.count, 0);
  const totalUnitsToCreate = totalUnitsPerFloor * bulkConfig.floors;

  // Bulk Edit State
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditConfig, setBulkEditConfig] = useState({
      price: '',
      area: '',
      tower: '',
      floor: '',
      unit_type: '',
      status: '',
      assigned_agent_id: '',
      namingPattern: '' // Optional: Rename selected units with a pattern
  });

  const applyPattern = (pattern: string, floor: number, unitIndex: number): string => {
      const letter = String.fromCharCode(64 + unitIndex); // 1→A, 2→B, 3→C...
      return pattern
          .replace('{floor}', String(floor))
          .replace('{unit}', String(unitIndex))
          .replace('{letter}', letter);
  };

  const handleBulkCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (submittingBulk) return;
      setSubmittingBulk(true);
      try {
          const token = localStorage.getItem('access_token');
          const disponible = statuses.find(s => s.name === 'Disponible');
          let created = 0;
          for (let f = 0; f < bulkConfig.floors; f++) {
              const floor = bulkConfig.startFloor + f;
              let unitIndex = 1;
              for (const typo of bulkConfig.typologies) {
                  for (let c = 0; c < typo.count; c++) {
                      const code = applyPattern(bulkConfig.namingPattern, floor, unitIndex);
                      await fetch('/api/units', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({
                              project_id: projectId,
                              code,
                              tower: bulkConfig.tower,
                              floor: String(floor),
                              area: typo.area,
                              price: typo.price,
                              unit_type: typo.name || undefined,
                              current_status_id: disponible?.id,
                          }),
                      });
                      unitIndex++;
                      created++;
                  }
              }
          }
          alert(`${created} unidades creadas`);
          setShowBulkCreateModal(false);
          fetchUnits();
      } finally {
          setSubmittingBulk(false);
      }
  };

  const handleBulkEditSave = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const token = localStorage.getItem('access_token');
          
          let updatedCount = 0;

          // Convert Set to Array to index for naming pattern
          const selectedUnitsList = units.filter(u => selectedUnitIds.has(u.id));

          await Promise.all(selectedUnitsList.map(async (unit, index) => {
              const payload: any = {};
              
              if (bulkEditConfig.price) payload.price = Number(bulkEditConfig.price);
              if (bulkEditConfig.area) payload.area = Number(bulkEditConfig.area);
              if (bulkEditConfig.tower) payload.tower = bulkEditConfig.tower;
              if (bulkEditConfig.floor) payload.floor = bulkEditConfig.floor;
              if (bulkEditConfig.unit_type) payload.unit_type = bulkEditConfig.unit_type;
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
          setBulkEditConfig({ price: '', area: '', tower: '', floor: '', unit_type: '', status: '', assigned_agent_id: '', namingPattern: '' });
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
        
        const payload: any = {
            price: Number(editingUnit.price),
            area: Number(editingUnit.area),
            current_status_id: editingUnit.current_status_id,
            tower: editingUnit.tower || null,
            unit_type: editingUnit.unit_type || null,
            assigned_agent_id: editingUnit.assigned_agent_id || null,
        };

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

  const fetchUnits = useCallback(async (silent = false) => {
    try {
      if (!silent) setUnits([]);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/units?project_id=${projectId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
          const data = await res.json();
          setUnits(data);
          if (!silent) setCurrentPage(1);
      } else if (!silent) {
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

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => {
      setOpenStatusFor(null);
      setOpenMenuFor(null);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleStatusChange = async (unitId: string, newStatusId: string) => {
    if (changingStatus === unitId) return;
    const previousUnits = units;
    // Optimistic update
    const newStatus = statuses.find(s => s.id === newStatusId);
    setUnits(prev => prev.map(u =>
      u.id === unitId
        ? { ...u, current_status_id: newStatusId, current_status: newStatus }
        : u
    ));
    setOpenStatusFor(null);
    setChangingStatus(unitId);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/units/${unitId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status_id: newStatusId }),
      });
      if (!res.ok) {
        setUnits(previousUnits); // rollback
      } else {
        fetchUnits(true); // silent refresh to confirm DB state
      }
    } catch {
      setUnits(previousUnits); // rollback
    } finally {
      setChangingStatus(null);
    }
  };

  const handleDeleteStatus = async (statusId: string, statusName: string) => {
    const inUse = units.some(u => u.current_status_id === statusId);
    if (inUse) {
      alert(`No se puede eliminar "${statusName}" porque hay unidades con ese estado. Cambia su estado primero.`);
      return;
    }
    if (!confirm(`¿Eliminar el estado "${statusName}"? Esta acción no se puede deshacer.`)) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/unit-statuses/${statusId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setStatuses(prev => prev.filter(s => s.id !== statusId));
      } else {
        alert('Error al eliminar el estado');
      }
    } catch {
      alert('Error al eliminar el estado');
    }
  };

  const handleDeleteUnit = async (unitId: string, unitCode: string) => {
    if (!confirm(`¿Eliminar la unidad ${unitCode}? Esta acción no se puede deshacer.`)) return;
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/units/${unitId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setUnits(prev => prev.filter(u => u.id !== unitId));
      }
    } catch (err) {
      console.error(err);
    }
    setOpenMenuFor(null);
  };

  const handleRenameTower = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) { setRenamingTower(null); return; }
    const affected = units.filter(u => u.tower === oldName);
    if (affected.length === 0) {
      // No units — just rename in extraTowers list
      setExtraTowers(prev => prev.map(t => t === oldName ? trimmed : t));
      setRenamingTower(null);
      return;
    }
    if (!confirm(`¿Renombrar "${oldName}" → "${trimmed}"? Se actualizarán ${affected.length} unidades.`)) {
      setRenamingTower(null);
      return;
    }
    setRenamingInProgress(true);
    const token = localStorage.getItem('access_token');
    try {
      await Promise.all(affected.map(u =>
        fetch(`/api/units/${u.id}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tower: trimmed }),
        })
      ));
      setUnits(prev => prev.map(u => u.tower === oldName ? { ...u, tower: trimmed } : u));
      setExtraTowers(prev => prev.filter(t => t !== oldName));
    } catch (err) {
      console.error(err);
    } finally {
      setRenamingInProgress(false);
      setRenamingTower(null);
    }
  };

  return (
    <CrmLayout 
      title="Unidades (Apartamentos)" 
      subtitle="Inventario en tiempo real y gestión comercial por torre."
      actions={
        <div className="flex items-center gap-2">
          {userRole === 'admin' && (
            <button
              onClick={() => setShowTowerModal(true)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              <span className="material-symbols-outlined text-lg">apartment</span>
              Torres
              {towers.length > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center">
                  {towers.length}
                </span>
              )}
            </button>
          )}
          {userRole === 'admin' && (
            <button
              onClick={() => setShowSingleCreateModal(true)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              <span className="material-symbols-outlined text-lg">add_home</span>
              Nueva Unidad
            </button>
          )}
          <button
            onClick={() => setShowBulkCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Crear Unidades
          </button>
        </div>
      }
    >
      {/* Bulk Create Modal */}
      {/* ── Tower Manager Modal ── */}
      {showTowerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Gestionar Torres</h3>
                <p className="text-xs text-slate-500 mt-0.5">{towers.length} torre{towers.length !== 1 ? 's' : ''} · {units.length} unidades en total</p>
              </div>
              <button onClick={() => { setShowTowerModal(false); setRenamingTower(null); setNewTowerName(''); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {towers.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No hay torres definidas aún.</p>
              )}

              {towers.map(tower => {
                const count = units.filter(u => u.tower === tower).length;
                const isRenaming = renamingTower === tower;
                return (
                  <div key={tower} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 shrink-0">
                      <span className="material-symbols-outlined text-[18px]">apartment</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameTower(tower, renameValue);
                            if (e.key === 'Escape') setRenamingTower(null);
                          }}
                          className="w-full px-2 py-1 text-sm font-semibold border border-blue-400 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      ) : (
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{tower}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-0.5">{count} unidad{count !== 1 ? 'es' : ''}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isRenaming ? (
                        <>
                          <button
                            onClick={() => handleRenameTower(tower, renameValue)}
                            disabled={renamingInProgress}
                            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          </button>
                          <button
                            onClick={() => setRenamingTower(null)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setRenamingTower(tower); setRenameValue(tower); }}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Renombrar"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => { setShowTowerModal(false); setFilterTower(tower); setCurrentPage(1); }}
                            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Ver unidades de esta torre"
                          >
                            <span className="material-symbols-outlined text-[16px]">filter_list</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Nueva torre */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nueva Torre</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ej: Torre A, Bloque 1, Edificio Norte..."
                    value={newTowerName}
                    onChange={e => setNewTowerName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const t = newTowerName.trim();
                        if (t && !towers.includes(t)) { setExtraTowers(prev => [...prev, t]); setNewTowerName(''); }
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    onClick={() => {
                      const t = newTowerName.trim();
                      if (t && !towers.includes(t)) { setExtraTowers(prev => [...prev, t]); setNewTowerName(''); }
                    }}
                    disabled={!newTowerName.trim() || towers.includes(newTowerName.trim())}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Agregar
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">La torre quedará disponible en los dropdowns para asignar unidades.</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-xs text-slate-400 flex items-start gap-1.5">
                <span className="material-symbols-outlined text-[14px] mt-0.5 shrink-0">info</span>
                Renombrar una torre actualiza automáticamente todas sus unidades. Para asignar unidades a una torre, usa la edición masiva o edita cada unidad individualmente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Statuses Modal ── */}
      {showManageStatuses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 dark:text-white">Gestionar estados</h2>
              <button onClick={() => setShowManageStatuses(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2">
              {statuses.map(s => {
                const inUse = units.some(u => u.current_status_id === s.id);
                return (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color_hex }} />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                      {inUse && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                          {units.filter(u => u.current_status_id === s.id).length} uds.
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteStatus(s.id, s.name)}
                      disabled={inUse}
                      title={inUse ? 'En uso por unidades' : 'Eliminar'}
                      className="text-slate-300 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="px-5 pb-4 text-xs text-slate-400">Los estados en uso no se pueden eliminar hasta que cambies todas sus unidades.</p>
          </div>
        </div>
      )}

      {showSingleCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nueva Unidad</h3>
              <button onClick={() => setShowSingleCreateModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSingleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Código <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ej: A-101"
                  value={singleUnit.code}
                  onChange={e => setSingleUnit({ ...singleUnit, code: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Torre / Bloque</label>
                  {towers.length > 0 ? (
                    <select
                      value={singleUnit.tower}
                      onChange={e => setSingleUnit({ ...singleUnit, tower: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                    >
                      <option value="">Sin torre</option>
                      {towers.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ej: Torre A"
                      value={singleUnit.tower}
                      onChange={e => setSingleUnit({ ...singleUnit, tower: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Piso</label>
                  <input
                    type="text"
                    placeholder="Ej: 3"
                    value={singleUnit.floor}
                    onChange={e => setSingleUnit({ ...singleUnit, floor: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipología</label>
                <input
                  type="text"
                  placeholder="Ej: Tipo A, Studio, Penthouse"
                  value={singleUnit.unit_type}
                  onChange={e => setSingleUnit({ ...singleUnit, unit_type: e.target.value })}
                  list="unit-types-list"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                />
                <datalist id="unit-types-list">
                  {[...new Set(units.map(u => u.unit_type).filter(Boolean))].map(t => (
                    <option key={t} value={t!} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Área (m²)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 65"
                    value={singleUnit.area}
                    onChange={e => setSingleUnit({ ...singleUnit, area: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ej: 250000000"
                    value={singleUnit.price}
                    onChange={e => setSingleUnit({ ...singleUnit, price: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                <select
                  value={singleUnit.status_id}
                  onChange={e => setSingleUnit({ ...singleUnit, status_id: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                >
                  <option value="">Por defecto (Disponible)</option>
                  {statuses.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSingleCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg transition-all"
                >
                  Crear Unidad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulkCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
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
                                  placeholder="Ej: {floor}0{unit}"
                              />
                              <p className="text-xs text-slate-400 mt-1">Variables: <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{`{floor}`}</code> piso · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{`{unit}`}</code> número · <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{`{letter}`}</code> letra (A, B, C…)</p>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
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
                      </div>

                      {/* Typologies Section */}
                      <div>
                          <div className="flex items-center justify-between mb-3">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tipologías por Piso</label>
                              <button
                                  type="button"
                                  onClick={addTypology}
                                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                  <span className="material-symbols-outlined text-[16px]">add</span>
                                  Agregar Tipología
                              </button>
                          </div>
                          <div className="space-y-3">
                              {bulkConfig.typologies.map((typo, idx) => (
                                  <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                      <div className="flex items-center justify-between mb-3">
                                          <input
                                              type="text"
                                              value={typo.name}
                                              onChange={e => updateTypology(idx, 'name', e.target.value)}
                                              className="text-sm font-semibold bg-transparent text-slate-900 dark:text-white border-none outline-none focus:ring-0 p-0 w-32"
                                              placeholder="Nombre tipo"
                                          />
                                          {bulkConfig.typologies.length > 1 && (
                                              <button
                                                  type="button"
                                                  onClick={() => removeTypology(idx)}
                                                  className="text-slate-400 hover:text-red-500 transition-colors"
                                              >
                                                  <span className="material-symbols-outlined text-[18px]">close</span>
                                              </button>
                                          )}
                                      </div>
                                      <div className="grid grid-cols-3 gap-3">
                                          <div>
                                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Área (m²)</label>
                                              <input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  required
                                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-crm-primary outline-none"
                                                  value={typo.area || ''}
                                                  onChange={e => updateTypology(idx, 'area', Number(e.target.value))}
                                                  placeholder="60"
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Precio</label>
                                              <input
                                                  type="number"
                                                  min="0"
                                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-crm-primary outline-none"
                                                  value={typo.price || ''}
                                                  onChange={e => updateTypology(idx, 'price', Number(e.target.value))}
                                                  placeholder="250000000"
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Cant. por piso</label>
                                              <input
                                                  type="number"
                                                  min="1"
                                                  required
                                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-crm-primary outline-none"
                                                  value={typo.count}
                                                  onChange={e => updateTypology(idx, 'count', Math.max(1, Number(e.target.value)))}
                                              />
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Vista Previa (Piso {bulkConfig.startFloor}):</p>
                          <div className="flex flex-wrap gap-2">
                              {(() => {
                                  const previews: { code: string; type: string }[] = [];
                                  let idx = 1;
                                  for (const typo of bulkConfig.typologies) {
                                      for (let c = 0; c < Math.min(typo.count, 3); c++) {
                                          previews.push({ code: applyPattern(bulkConfig.namingPattern, bulkConfig.startFloor, idx), type: typo.name });
                                          idx++;
                                      }
                                      if (typo.count > 3) { previews.push({ code: '...', type: typo.name }); idx += typo.count - 3; }
                                  }
                                  return previews.map((p, i) => (
                                      <span key={i} className="bg-white dark:bg-slate-700 px-2 py-1 rounded border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 font-mono">
                                          {p.code} <span className="text-slate-400 font-sans">({p.type})</span>
                                      </span>
                                  ));
                              })()}
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                              {totalUnitsPerFloor} und/piso × {bulkConfig.floors} pisos = <span className="font-bold text-blue-600">{totalUnitsToCreate} unidades</span>
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
                              disabled={submittingBulk}
                              className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg shadow-lg transition-all"
                          >
                              {submittingBulk ? 'Generando...' : 'Generar Unidades'}
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

                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipología (Actualizar a)</label>
                          <input
                              type="text"
                              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-crm-primary outline-none"
                              value={bulkEditConfig.unit_type}
                              onChange={e => setBulkEditConfig({...bulkEditConfig, unit_type: e.target.value})}
                              placeholder="Sin cambios"
                              list="bulk-edit-types-list"
                          />
                          <datalist id="bulk-edit-types-list">
                            {[...new Set(units.map(u => u.unit_type).filter(Boolean))].map(t => (
                              <option key={t} value={t!} />
                            ))}
                          </datalist>
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
                    {/* Info de solo lectura */}
                    <div className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm text-slate-600 dark:text-slate-400">
                        <span><span className="font-semibold text-slate-900 dark:text-white">Piso:</span> {editingUnit.floor}</span>
                        {editingUnit.current_status && (
                          <>
                            <span className="text-slate-300 dark:text-slate-600">|</span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editingUnit.current_status.color_hex }} />
                              {editingUnit.current_status.name}
                            </span>
                          </>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Torre */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Torre / Bloque</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                value={editingUnit.tower || ''}
                                onChange={e => setEditingUnit({ ...editingUnit, tower: e.target.value })}
                            >
                                <option value="">Sin torre</option>
                                {towers.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        {/* Tipología */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipología</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                value={editingUnit.unit_type || ''}
                                onChange={e => setEditingUnit({ ...editingUnit, unit_type: e.target.value })}
                                placeholder="Ej: Tipo A"
                                list="edit-unit-types-list"
                            />
                            <datalist id="edit-unit-types-list">
                              {[...new Set(units.map(u => u.unit_type).filter(Boolean))].map(t => (
                                <option key={t} value={t!} />
                              ))}
                            </datalist>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Área */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Área (m²)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                value={editingUnit.area}
                                onChange={e => setEditingUnit({ ...editingUnit, area: Number(e.target.value) })}
                            />
                        </div>
                        {/* Precio */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Precio</label>
                            <input
                                type="number"
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                value={editingUnit.price}
                                onChange={e => setEditingUnit({ ...editingUnit, price: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estado</label>
                        <div className="grid grid-cols-2 gap-2">
                            {statuses.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setEditingUnit({ ...editingUnit, current_status_id: s.id, current_status: s })}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                                        editingUnit.current_status_id === s.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                            : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color_hex }} />
                                    {s.name}
                                    {editingUnit.current_status_id === s.id && (
                                        <span className="material-symbols-outlined text-[14px] ml-auto">check</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Agente */}
                    {agents.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Agente asignado</label>
                            <select
                                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                                value={editingUnit.assigned_agent_id || ''}
                                onChange={e => setEditingUnit({ ...editingUnit, assigned_agent_id: e.target.value })}
                            >
                                <option value="">Sin agente asignado</option>
                                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
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

        {/* Search + Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px] pointer-events-none">search</span>
              <input
                type="text"
                placeholder="Buscar por código, torre, piso o agente..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter selects */}
          <div className="px-3 py-2.5 flex flex-wrap gap-3 items-end">
            {/* Torre */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Torre</label>
              <select
                value={filterTower}
                onChange={e => { setFilterTower(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[140px]"
              >
                <option value="">Todas las torres</option>
                {towers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Tipología */}
            {unitTypes.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipología</label>
                <select
                  value={filterType}
                  onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[140px]"
                >
                  <option value="">Todas</option>
                  {unitTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}

            {/* Estado */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                {userRole === 'admin' && (
                  <button
                    onClick={() => setShowManageStatuses(true)}
                    title="Gestionar estados"
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">settings</span>
                  </button>
                )}
              </div>
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[150px]"
              >
                <option value="">Todos los estados</option>
                {statuses.filter(s => s.order_sequence > 0).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Agente */}
            {agents.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agente</label>
                <select
                  value={filterAgent}
                  onChange={e => { setFilterAgent(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[150px]"
                >
                  <option value="">Cualquier agente</option>
                  <option value="__none__">Sin asignar</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            )}

            {/* Precio */}
            {priceRanges.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Precio</label>
                <select
                  value={filterPrice}
                  onChange={e => { setFilterPrice(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-w-[180px]"
                >
                  <option value="">Cualquier precio</option>
                  {priceRanges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            )}

            {/* Clear */}
            <div className="ml-auto flex items-end">
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
                  Limpiar filtros
                </button>
              ) : (
                <span className="text-xs text-slate-400 py-1.5">
                  {filteredUnits.length} de {units.length} unidades
                </span>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="px-3 pb-2.5 flex flex-wrap gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                  <span className="material-symbols-outlined text-[12px]">search</span>
                  "{searchQuery}"
                  <button onClick={() => { setSearchQuery(''); setCurrentPage(1); }} className="ml-0.5 opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {filterTower && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  Torre: {filterTower}
                  <button onClick={() => { setFilterTower(''); setCurrentPage(1); }} className="ml-0.5 opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {filterType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                  {filterType}
                  <button onClick={() => { setFilterType(''); setCurrentPage(1); }} className="ml-0.5 opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {filterStatus && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  {statuses.find(s => s.id === filterStatus)?.name ?? filterStatus}
                  <button onClick={() => { setFilterStatus(''); setCurrentPage(1); }} className="ml-0.5 opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {filterAgent && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  {filterAgent === '__none__' ? 'Sin asignar' : agents.find(a => a.id === filterAgent)?.name ?? filterAgent}
                  <button onClick={() => { setFilterAgent(''); setCurrentPage(1); }} className="ml-0.5 opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {filterPrice && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                  {priceRanges.find(r => r.value === filterPrice)?.label}
                  <button onClick={() => { setFilterPrice(''); setCurrentPage(1); }} className="ml-0.5 opacity-60 hover:opacity-100"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              <span className="text-xs text-slate-400 self-center">{filteredUnits.length} resultado{filteredUnits.length !== 1 ? 's' : ''}</span>
            </div>
          )}
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
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Tipología</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Agente Asignado</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUnits.length === 0 ? (
                  <tr><td colSpan={9} className="px-6 py-16 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl block mb-2">search_off</span>
                    No hay unidades que coincidan con los filtros
                  </td></tr>
                ) : null}
                {filteredUnits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((unit) => (
                    <tr key={unit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{unit.code}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{unit.tower}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-center">{unit.floor}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 text-center">{unit.area} m²</td>
                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                          {unit.unit_type ? (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-semibold">
                              {unit.unit_type}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(unit.price)}</td>
                        {/* ── Status — inline dropdown ── */}
                        <td className="px-6 py-4">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuFor(null); setOpenStatusFor(openStatusFor === unit.id ? null : unit.id); }}
                              disabled={userRole !== 'admin'}
                              className={[
                                'px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit transition-all',
                                userRole === 'admin' ? 'hover:ring-2 hover:ring-offset-1 cursor-pointer' : 'cursor-default',
                                changingStatus === unit.id ? 'opacity-50' : '',
                              ].join(' ')}
                              style={{
                                backgroundColor: `${unit.current_status?.color_hex}18`,
                                color: unit.current_status?.color_hex,
                                // @ts-ignore
                                '--tw-ring-color': unit.current_status?.color_hex + '60',
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: unit.current_status?.color_hex }} />
                              {unit.current_status?.name ?? 'Sin estado'}
                              {userRole === 'admin' && (
                                <span className="material-symbols-outlined text-[13px] opacity-60">
                                  {openStatusFor === unit.id ? 'expand_less' : 'expand_more'}
                                </span>
                              )}
                            </button>

                            {openStatusFor === unit.id && (
                              <div onClick={e => e.stopPropagation()} className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 min-w-[180px] animate-in fade-in zoom-in-95 duration-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-1 pb-2">Cambiar estado</p>
                                {statuses.filter(s => s.order_sequence > 0).map(s => (
                                  <button
                                    key={s.id}
                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(unit.id, s.id); }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-left"
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color_hex }} />
                                    <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{s.name}</span>
                                    {unit.current_status_id === s.id && (
                                      <span className="material-symbols-outlined text-[16px] text-blue-600">check</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* ── Assigned agent ── */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {unit.assigned_agent ? (
                              <>
                                <div className="size-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-600">
                                  {unit.assigned_agent.name?.substring(0, 2).toUpperCase() || 'AG'}
                                </div>
                                <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{unit.assigned_agent.name}</span>
                              </>
                            ) : (
                              <span className="text-sm text-slate-400 italic">Sin asignar</span>
                            )}
                          </div>
                        </td>

                        {/* ── Actions ── */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Agent: quick reserve */}
                            {userRole === 'agent' && unit.current_status?.name === 'Disponible' && (
                              <button
                                onClick={() => handleReserve(unit.id)}
                                className="text-xs font-bold px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors"
                              >
                                Reservar
                              </button>
                            )}

                            {/* Admin: edit */}
                            {userRole === 'admin' && (
                              <button
                                onClick={() => handleEditClick(unit)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-[18px]">edit</span>
                              </button>
                            )}

                            {/* ⋮ More menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenStatusFor(null); setOpenMenuFor(openMenuFor === unit.id ? null : unit.id); }}
                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">more_vert</span>
                              </button>

                              {openMenuFor === unit.id && (
                                <div onClick={e => e.stopPropagation()} className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 w-52 animate-in fade-in zoom-in-95 duration-100">
                                  <button
                                    onClick={() => { handleEditClick(unit); setOpenMenuFor(null); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[17px] text-slate-400">edit</span>
                                    Editar unidad
                                  </button>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(unit.code);
                                      setOpenMenuFor(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[17px] text-slate-400">content_copy</span>
                                    Copiar código
                                  </button>
                                  <button
                                    onClick={() => {
                                      const url = `${window.location.origin}/crm/projects/${projectId}/units#${unit.id}`;
                                      navigator.clipboard.writeText(url);
                                      setOpenMenuFor(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[17px] text-slate-400">link</span>
                                    Copiar enlace
                                  </button>
                                  {userRole === 'admin' && (
                                    <>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                                      <button
                                        onClick={() => handleDeleteUnit(unit.id, unit.code)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-[17px]">delete</span>
                                        Eliminar unidad
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
           {/* Pagination */}
           {(() => {
             const totalPages = Math.ceil(filteredUnits.length / PAGE_SIZE);
             if (totalPages <= 1) return null;
             const from = (currentPage - 1) * PAGE_SIZE + 1;
             const to = Math.min(currentPage * PAGE_SIZE, filteredUnits.length);

             // Build page number list with ellipsis
             const pages: (number | '...')[] = [];
             if (totalPages <= 7) {
               for (let i = 1; i <= totalPages; i++) pages.push(i);
             } else {
               pages.push(1);
               if (currentPage > 3) pages.push('...');
               for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
               if (currentPage < totalPages - 2) pages.push('...');
               pages.push(totalPages);
             }

             return (
               <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                 <span className="text-sm text-slate-500">
                   Mostrando <span className="font-bold text-slate-900 dark:text-white">{from}</span> – <span className="font-bold text-slate-900 dark:text-white">{to}</span> de <span className="font-bold text-slate-900 dark:text-white">{filteredUnits.length}</span>{hasActiveFilters ? ` (filtrado de ${units.length})` : ' unidades'}
                 </span>
                 <div className="flex gap-1">
                   <button
                     onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                     disabled={currentPage === 1}
                     className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                   >
                     <span className="material-symbols-outlined text-sm">chevron_left</span>
                   </button>
                   {pages.map((p, i) =>
                     p === '...' ? (
                       <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-400 text-sm">…</span>
                     ) : (
                       <button
                         key={p}
                         onClick={() => setCurrentPage(p as number)}
                         className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                           currentPage === p
                             ? 'bg-blue-600 text-white font-bold shadow-sm'
                             : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-600 hover:text-blue-600'
                         }`}
                       >
                         {p}
                       </button>
                     )
                   )}
                   <button
                     onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                     disabled={currentPage === totalPages}
                     className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-blue-600 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                   >
                     <span className="material-symbols-outlined text-sm">chevron_right</span>
                   </button>
                 </div>
               </div>
             );
           })()}
        </div>

        {/* Footer Summary — real data */}
        {units.length > 0 && (() => {
          const totalValue = units.reduce((sum, u) => sum + (u.price || 0), 0);
          const byStatus = statuses.map(s => ({
            ...s,
            count: units.filter(u => u.current_status_id === s.id).length,
          })).filter(s => s.count > 0);

          return (
            <div className="border-t border-slate-200 dark:border-slate-800 pt-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm">
              <div className="flex flex-wrap gap-3">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-xs self-center">Resumen:</span>
                {byStatus.map(s => (
                  <span key={s.id} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color_hex }} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{s.count}</span>
                    <span className="text-slate-500">{s.name}</span>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400">Valor total inventario:</span>
                <span className="text-lg font-black text-blue-600">{formatCurrency(totalValue)}</span>
              </div>
            </div>
          );
        })()}

      </div>
    </CrmLayout>
  );
};

export default ProjectUnitsPage;