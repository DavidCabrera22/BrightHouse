import React, { useState, useEffect, useCallback, useRef } from 'react';
import CrmLayout from './CrmLayout';
import { useParams, Link } from 'react-router-dom';

interface DocFile {
  id: string;
  document_type: string;
  file_url: string;
  original_name?: string;
  file_size?: number;
  version: string;
  status: string;
  created_at: string;
  unit_id?: string;
  unit?: { code: string; tower?: string };
  uploaded_by_user?: { name: string };
}

interface UnitFolder {
  id: string;
  code: string;
  tower?: string;
  floor?: number;
  docCount: number;
}

type FolderView =
  | { type: 'project' }
  | { type: 'units_root' }
  | { type: 'tower'; tower: string }
  | { type: 'unit'; unitId: string; unitCode: string; tower?: string };

const PROJECT_DOC_TYPES = [
  'Planos Arquitectónicos', 'Renders', 'Licencia de Construcción',
  'Estudio de Suelos', 'Fiducia / Encargo', 'Reglamento PH',
  'Presupuesto', 'Cronograma', 'Otro',
];

const UNIT_DOC_TYPES = [
  'Promesa de Compraventa', 'Escritura Pública', 'Paz y Salvo',
  'Plano de Unidad', 'Acta de Entrega', 'Garantía',
  'Contrato de Arrendamiento', 'Otro',
];

const FILE_ICONS: Record<string, { icon: string; color: string }> = {
  pdf:  { icon: 'picture_as_pdf', color: 'text-red-500' },
  doc:  { icon: 'description', color: 'text-blue-600' },
  docx: { icon: 'description', color: 'text-blue-600' },
  xls:  { icon: 'table_chart', color: 'text-green-600' },
  xlsx: { icon: 'table_chart', color: 'text-green-600' },
  jpg:  { icon: 'image', color: 'text-purple-500' },
  jpeg: { icon: 'image', color: 'text-purple-500' },
  png:  { icon: 'image', color: 'text-purple-500' },
  zip:  { icon: 'folder_zip', color: 'text-amber-500' },
};

const fixCloudinaryUrl = (fileUrl: string): string => {
  if (!fileUrl.includes('res.cloudinary.com')) return fileUrl;
  // Fix PDFs/docs stored as image type — convert to raw delivery
  return fileUrl.replace('/image/upload/', '/raw/upload/');
};

const getCloudinaryDownloadUrl = (fileUrl: string, filename?: string): string => {
  const url = fixCloudinaryUrl(fileUrl);
  const attachment = filename ? `fl_attachment:${encodeURIComponent(filename)}` : 'fl_attachment';
  return url.replace('/upload/', `/upload/${attachment}/`);
};

const getFileIcon = (name?: string, url?: string) => {
  const ext = (name || url || '').split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || { icon: 'insert_drive_file', color: 'text-slate-400' };
};

const formatSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });

const ProjectDocumentsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const token = localStorage.getItem('access_token');
  const userId = localStorage.getItem('user_id') || '';
  const headers = { 'Authorization': `Bearer ${token}` };

  const [projectName, setProjectName] = useState('Cargando...');
  const [units, setUnits] = useState<UnitFolder[]>([]);
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<FolderView>({ type: 'project' });
  const [expandedTowers, setExpandedTowers] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({ document_type: '', file: null as File | null });
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Fetch project info + units
  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetch(`/api/projects/${projectId}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`/api/units?project_id=${projectId}`, { headers }).then(r => r.ok ? r.json() : []),
      fetch(`/api/documents?project_id=${projectId}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([proj, unitList, allDocs]) => {
      if (proj) setProjectName(proj.name);

      // Count docs per unit
      const counts: Record<string, number> = { __project__: 0 };
      (allDocs as DocFile[]).forEach(d => {
        if (d.unit_id) counts[d.unit_id] = (counts[d.unit_id] || 0) + 1;
        else counts['__project__'] = (counts['__project__'] || 0) + 1;
      });
      setDocCounts(counts);

      const folders: UnitFolder[] = (unitList as any[]).map(u => ({
        id: u.id,
        code: u.code,
        tower: u.tower,
        floor: u.floor,
        docCount: counts[u.id] || 0,
      }));
      setUnits(folders);
    });
  }, [projectId]);

  // Fetch docs for current folder
  const fetchDocs = useCallback(async (folder: FolderView) => {
    setLoadingDocs(true);
    setDocs([]);
    try {
      let url = `/api/documents?project_id=${projectId}`;
      if (folder.type === 'project') url += '&unit_id=none';
      else if (folder.type === 'unit') url += `&unit_id=${folder.unitId}`;
      else { setLoadingDocs(false); return; } // tower/units_root shows sub-folders, not docs

      const res = await fetch(url, { headers });
      if (res.ok) setDocs(await res.json());
    } finally {
      setLoadingDocs(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDocs(currentFolder);
  }, [currentFolder, fetchDocs]);

  // Towers grouping
  const towers = [...new Set(units.map(u => u.tower).filter(Boolean) as string[])].sort();
  const unitsWithoutTower = units.filter(u => !u.tower);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.document_type) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', uploadForm.file);
      fd.append('project_id', projectId!);
      fd.append('document_type', uploadForm.document_type);
      fd.append('uploaded_by', userId);
      if (currentFolder.type === 'unit') fd.append('unit_id', currentFolder.unitId);

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      });
      if (res.ok) {
        const newDoc = await res.json();
        setDocs(prev => [newDoc, ...prev]);
        const key = currentFolder.type === 'unit' ? currentFolder.unitId : '__project__';
        setDocCounts(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
        setShowUploadModal(false);
        setUploadForm({ document_type: '', file: null });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    const res = await fetch(`/api/documents/${docId}`, {
      method: 'DELETE', headers,
    });
    if (res.ok) {
      setDocs(prev => prev.filter(d => d.id !== docId));
      const key = currentFolder.type === 'unit' ? (currentFolder as any).unitId : '__project__';
      setDocCounts(prev => ({ ...prev, [key]: Math.max(0, (prev[key] || 1) - 1) }));
    }
  };

  // Drag & drop
  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files[0];
      if (file) { setUploadForm(f => ({ ...f, file })); setShowUploadModal(true); }
    };
    el.addEventListener('dragover', prevent);
    el.addEventListener('drop', onDrop);
    return () => { el.removeEventListener('dragover', prevent); el.removeEventListener('drop', onDrop); };
  }, []);

  const filteredDocs = docs.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (d.original_name || d.file_url || '').toLowerCase().includes(q)
      || d.document_type.toLowerCase().includes(q);
  });

  const docTypes = currentFolder.type === 'unit' ? UNIT_DOC_TYPES : PROJECT_DOC_TYPES;

  const folderLabel = currentFolder.type === 'project'
    ? projectName
    : currentFolder.type === 'unit'
    ? currentFolder.unitCode
    : currentFolder.type === 'tower'
    ? currentFolder.tower
    : 'Unidades';

  const totalProjectDocs = docCounts['__project__'] || 0;
  const totalUnitDocs = units.reduce((s, u) => s + (docCounts[u.id] || 0), 0);

  return (
    <CrmLayout
      title="Documentos"
      subtitle={`Carpeta digital — ${projectName}`}
      actions={
        <div className="flex items-center gap-2">
          {(currentFolder.type === 'project' || currentFolder.type === 'unit') && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              Subir documento
            </button>
          )}
        </div>
      }
    >
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Subir Documento</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {currentFolder.type === 'unit' ? `Unidad ${(currentFolder as any).unitCode}` : 'Carpeta del Proyecto'}
                </p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleUpload} className="p-5 space-y-4">
              {/* File drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all"
              >
                {uploadForm.file ? (
                  <div className="flex flex-col items-center gap-2">
                    <span className={`material-symbols-outlined text-4xl ${getFileIcon(uploadForm.file.name).color}`}>
                      {getFileIcon(uploadForm.file.name).icon}
                    </span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{uploadForm.file.name}</p>
                    <p className="text-xs text-slate-400">{formatSize(uploadForm.file.size)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                    <p className="text-sm font-medium">Arrastra un archivo o haz clic para seleccionar</p>
                    <p className="text-xs">PDF, Word, Excel, imágenes — Máx. 50 MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && setUploadForm(f => ({ ...f, file: e.target.files![0] }))}
                />
              </div>

              {/* Document type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de documento</label>
                <select
                  required
                  value={uploadForm.document_type}
                  onChange={e => setUploadForm(f => ({ ...f, document_type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                >
                  <option value="">Seleccionar tipo...</option>
                  {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!uploadForm.file || !uploadForm.document_type || uploading}
                  className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg transition-colors flex items-center gap-2"
                >
                  {uploading && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-6 h-full">
        {/* ── LEFT: Folder Tree ── */}
        <aside className="w-64 shrink-0 flex flex-col gap-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1">Explorador</p>

          {/* Project folder */}
          <button
            onClick={() => setCurrentFolder({ type: 'project' })}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${
              currentFolder.type === 'project'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
            <span className="flex-1 truncate">{projectName}</span>
            {totalProjectDocs > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                currentFolder.type === 'project' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>{totalProjectDocs}</span>
            )}
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

          {/* Units root */}
          <button
            onClick={() => setCurrentFolder({ type: 'units_root' })}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left ${
              currentFolder.type === 'units_root'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">apartment</span>
            <span className="flex-1">Unidades</span>
            {totalUnitDocs > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                currentFolder.type === 'units_root' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>{totalUnitDocs}</span>
            )}
          </button>

          {/* Tower folders */}
          {towers.map(tower => {
            const towerUnits = units.filter(u => u.tower === tower);
            const towerDocCount = towerUnits.reduce((s, u) => s + (docCounts[u.id] || 0), 0);
            const isExpanded = expandedTowers.has(tower);
            const isSelectedTower = currentFolder.type === 'tower' && (currentFolder as any).tower === tower;

            return (
              <div key={tower}>
                <button
                  onClick={() => {
                    setExpandedTowers(prev => {
                      const n = new Set(prev);
                      if (n.has(tower)) n.delete(tower); else n.add(tower);
                      return n;
                    });
                    setCurrentFolder({ type: 'tower', tower });
                  }}
                  className={`w-full flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-lg text-sm transition-all text-left ${
                    isSelectedTower
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px] text-amber-500">
                    {isExpanded ? 'folder_open' : 'folder'}
                  </span>
                  <span className="flex-1 truncate">{tower}</span>
                  {towerDocCount > 0 && <span className="text-[10px] text-slate-400">{towerDocCount}</span>}
                  <span className="material-symbols-outlined text-[14px] text-slate-400">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="ml-8 mt-0.5 space-y-0.5 max-h-48 overflow-y-auto">
                    {towerUnits.sort((a, b) => (a.floor || 0) - (b.floor || 0) || a.code.localeCompare(b.code)).map(unit => (
                      <button
                        key={unit.id}
                        onClick={() => setCurrentFolder({ type: 'unit', unitId: unit.id, unitCode: unit.code, tower })}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-all text-left ${
                          currentFolder.type === 'unit' && (currentFolder as any).unitId === unit.id
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px] text-slate-400">description</span>
                        <span className="flex-1 truncate">{unit.code}</span>
                        {(docCounts[unit.id] || 0) > 0 && (
                          <span className="text-[10px] font-bold text-blue-600">{docCounts[unit.id]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Units without tower */}
          {unitsWithoutTower.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedTowers(prev => { const n = new Set(prev); if (n.has('__none__')) n.delete('__none__'); else n.add('__none__'); return n; })}
                className="w-full flex items-center gap-2 pl-6 pr-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left"
              >
                <span className="material-symbols-outlined text-[16px] text-slate-400">
                  {expandedTowers.has('__none__') ? 'folder_open' : 'folder'}
                </span>
                <span className="flex-1">Sin torre</span>
                <span className="material-symbols-outlined text-[14px] text-slate-400">
                  {expandedTowers.has('__none__') ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {expandedTowers.has('__none__') && (
                <div className="ml-8 mt-0.5 space-y-0.5 max-h-48 overflow-y-auto">
                  {unitsWithoutTower.map(unit => (
                    <button
                      key={unit.id}
                      onClick={() => setCurrentFolder({ type: 'unit', unitId: unit.id, unitCode: unit.code })}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-xs transition-all text-left ${
                        currentFolder.type === 'unit' && (currentFolder as any).unitId === unit.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px] text-slate-400">description</span>
                      <span className="flex-1 truncate">{unit.code}</span>
                      {(docCounts[unit.id] || 0) > 0 && (
                        <span className="text-[10px] font-bold text-blue-600">{docCounts[unit.id]}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ── RIGHT: Document Area ── */}
        <div ref={dropRef} className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Header bar */}
          <div className="flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              <Link to={`/crm/projects/${projectId}`} className="text-slate-500 hover:text-blue-600 transition-colors">{projectName}</Link>
              <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
              {currentFolder.type === 'unit' && (currentFolder as any).tower && (
                <>
                  <button onClick={() => setCurrentFolder({ type: 'tower', tower: (currentFolder as any).tower })} className="text-slate-500 hover:text-blue-600 transition-colors">{(currentFolder as any).tower}</button>
                  <span className="material-symbols-outlined text-[14px] text-slate-400">chevron_right</span>
                </>
              )}
              <span className="font-semibold text-slate-900 dark:text-white">{folderLabel}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              {(currentFolder.type === 'project' || currentFolder.type === 'unit') && (
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[16px]">search</span>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg border-none outline-none text-slate-700 dark:text-slate-200 w-40 focus:w-56 transition-all focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}
              {/* View toggle */}
              <div className="flex gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                </button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                  <span className="material-symbols-outlined text-[16px]">list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content area */}
          {currentFolder.type === 'units_root' || currentFolder.type === 'tower' ? (
            // Show unit sub-folders grid
            <div>
              <p className="text-xs text-slate-400 mb-3">
                {currentFolder.type === 'units_root'
                  ? `${units.length} unidades en el proyecto`
                  : `${units.filter(u => u.tower === (currentFolder as any).tower).length} unidades en esta torre`}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(currentFolder.type === 'tower'
                  ? units.filter(u => u.tower === (currentFolder as any).tower)
                  : units
                ).sort((a, b) => (a.floor || 0) - (b.floor || 0) || a.code.localeCompare(b.code)).map(unit => (
                  <button
                    key={unit.id}
                    onClick={() => setCurrentFolder({ type: 'unit', unitId: unit.id, unitCode: unit.code, tower: unit.tower })}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all group text-center"
                  >
                    <div className="relative">
                      <span className="material-symbols-outlined text-4xl text-amber-400 group-hover:text-amber-500 transition-colors">folder</span>
                      {(docCounts[unit.id] || 0) > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center">{docCounts[unit.id]}</span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{unit.code}</span>
                    <span className="text-[10px] text-slate-400">{docCounts[unit.id] || 0} doc{(docCounts[unit.id] || 0) !== 1 ? 's' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Show documents
            <>
              {loadingDocs && (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-600" />
                </div>
              )}

              {!loadingDocs && filteredDocs.length === 0 && (
                <div
                  onClick={() => setShowUploadModal(true)}
                  className="flex-1 flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all group"
                >
                  <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-3 group-hover:text-blue-400 transition-colors">cloud_upload</span>
                  <p className="text-slate-500 font-medium mb-1">No hay documentos aún</p>
                  <p className="text-sm text-slate-400">Arrastra archivos aquí o haz clic para subir</p>
                </div>
              )}

              {!loadingDocs && filteredDocs.length > 0 && (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {filteredDocs.map(doc => {
                      const fi = getFileIcon(doc.original_name, doc.file_url);
                      return (
                        <div key={doc.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                          <div className="flex items-start justify-between">
                            <span className={`material-symbols-outlined text-3xl ${fi.color}`}>{fi.icon}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={fixCloudinaryUrl(doc.file_url)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Abrir"
                              >
                                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              </a>
                              <a
                                href={getCloudinaryDownloadUrl(doc.file_url, doc.original_name)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"
                                title="Descargar"
                              >
                                <span className="material-symbols-outlined text-[16px]">download</span>
                              </a>
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                                title="Eliminar"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                              {doc.original_name || doc.file_url.split('/').pop()}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">{doc.document_type}</p>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                            <span>{formatDate(doc.created_at)}</span>
                            {doc.file_size && <span>{formatSize(doc.file_size)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // List view
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tamaño</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Subido por</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredDocs.map(doc => {
                          const fi = getFileIcon(doc.original_name, doc.file_url);
                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className={`material-symbols-outlined text-[20px] shrink-0 ${fi.color}`}>{fi.icon}</span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                    {doc.original_name || doc.file_url.split('/').pop()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{doc.document_type}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{formatSize(doc.file_size) || '—'}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(doc.created_at)}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs">{doc.uploaded_by_user?.name || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  <a href={fixCloudinaryUrl(doc.file_url)} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[16px]">open_in_new</span></a>
                                  <a href={getCloudinaryDownloadUrl(doc.file_url, doc.original_name)} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-600 transition-colors"><span className="material-symbols-outlined text-[16px]">download</span></a>
                                  <button onClick={() => handleDelete(doc.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </>
          )}
        </div>
      </div>
    </CrmLayout>
  );
};

export default ProjectDocumentsPage;
