import { useCallback, useEffect, useRef, useState } from 'react';
import { authHeaders, CONCEPT_LABEL, formatCOP, formatDate } from './quoteTypes';
import type { Installment, QuoteReceipt } from './quoteTypes';

const FIELD = 'w-full min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100';
const MAX_BYTES = 10 * 1024 * 1024;
const uploadDate = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric',
});

async function responseError(response: Response, fallback: string) {
  try {
    const body = await response.json();
    return (Array.isArray(body.message) ? body.message[0] : body.message) || fallback;
  } catch { return fallback; }
}

export default function QuoteReceipts({ quoteId, installments }: { quoteId: string; installments: Installment[] }) {
  const [receipts, setReceipts] = useState<QuoteReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [installmentId, setInstallmentId] = useState('');
  const [notes, setNotes] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadInProgress = useRef(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await fetch(`/api/quotes/${quoteId}/receipts`, { headers: authHeaders(), signal });
      if (!response.ok) throw new Error(await responseError(response, 'No se pudieron cargar los comprobantes'));
      const data: QuoteReceipt[] = await response.json();
      if (!signal?.aborted) setReceipts(data);
    } catch (err) {
      if (!signal?.aborted) setLoadError(err instanceof Error ? err.message : 'No se pudieron cargar los comprobantes');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [quoteId]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const selectFile = (selected: File | null) => {
    setSuccess(''); setError(''); setFile(null);
    if (!selected) return;
    if (!/\.(pdf|jpe?g|png)$/i.test(selected.name)) {
      setError('Selecciona un archivo PDF, JPG o PNG.');
    } else if (!selected.size || selected.size > MAX_BYTES) {
      setError('El archivo debe tener contenido y pesar como máximo 10 MB.');
    } else { setFile(selected); return; }
    if (fileInput.current) fileInput.current.value = '';
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || uploadInProgress.current) return;
    uploadInProgress.current = true;
    setUploading(true); setError(''); setSuccess('');
    try {
      const body = new FormData();
      body.append('file', file);
      if (installmentId) body.append('installment_id', installmentId);
      if (notes.trim()) body.append('notes', notes.trim());
      // El navegador añade el boundary multipart; no enviar Content-Type JSON.
      const response = await fetch(`/api/quotes/${quoteId}/receipts`, {
        method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` }, body,
      });
      if (!response.ok) throw new Error(await responseError(response, 'No se pudo guardar el comprobante'));
      const receipt: QuoteReceipt = await response.json();
      setReceipts((current) => [receipt, ...current]);
      setFile(null); setNotes('');
      if (fileInput.current) fileInput.current.value = '';
      setSuccess('Comprobante guardado. Puedes consultarlo o descargarlo aquí.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el comprobante'); }
    finally { setUploading(false); uploadInProgress.current = false; }
  };

  const download = async (receipt: QuoteReceipt) => {
    setDownloading(receipt.id); setError('');
    try {
      const response = await fetch(`/api/quotes/${quoteId}/receipts/${receipt.id}/file`, { headers: authHeaders() });
      if (!response.ok) throw new Error(await responseError(response, 'No se pudo descargar el comprobante'));
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = receipt.original_name;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo descargar el comprobante'); }
    finally { setDownloading(null); }
  };

  return (
    <section aria-labelledby="quote-receipts-title" className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-5">
      <div>
        <h3 id="quote-receipts-title" className="text-sm font-bold text-slate-900 dark:text-white">Comprobantes</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Adjunta soportes a la cotización o a un pago específico. PDF, JPG o PNG, hasta 10 MB por archivo.</p>
      </div>
      {loading && <p className="text-xs text-slate-500">Cargando comprobantes…</p>}
      {loadError && <div role="alert" className="text-sm text-red-600 dark:text-red-300">
        {loadError} <button type="button" onClick={() => void load()} className="font-bold underline">Reintentar</button>
      </div>}
      {!loading && !loadError && receipts.length === 0 && <p className="text-xs text-slate-500">Aún no hay comprobantes guardados.</p>}
      <ul className="space-y-2">
        {receipts.map((receipt) => (
          <li key={receipt.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold text-slate-900 dark:text-white">{receipt.original_name}</p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {receipt.installment_snapshot
                  ? `${CONCEPT_LABEL[receipt.installment_snapshot.concept]} · ${formatDate(receipt.installment_snapshot.due_date)} · ${formatCOP(receipt.installment_snapshot.amount)}`
                  : 'Comprobante general de la cotización'}
              </p>
              <p className="mt-1 text-xs text-slate-500">Subido el {uploadDate.format(new Date(receipt.created_at))} · {Math.max(1, Math.round(receipt.file_size / 1024))} KB</p>
              {receipt.notes && <p className="mt-1 break-words text-xs text-slate-600 dark:text-slate-300">{receipt.notes}</p>}
            </div>
            <button type="button" disabled={downloading !== null} onClick={() => void download(receipt)}
              aria-label={`Descargar ${receipt.original_name}`} className="shrink-0 text-xs font-bold text-blue-600 dark:text-blue-400 disabled:opacity-50">
              {downloading === receipt.id ? 'Descargando…' : 'Descargar'}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={upload} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <fieldset disabled={uploading || loading || !!loadError} className="min-w-0 space-y-3">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">Corresponde a
            <select aria-label="Pago del comprobante" className={`${FIELD} mt-1`} value={installmentId} onChange={(e) => setInstallmentId(e.target.value)}>
              <option value="">Cotización general</option>
              {installments.filter((i) => i.id).map((i) => <option key={i.id} value={i.id}>
                {i.number}. {CONCEPT_LABEL[i.concept]} · {formatDate(i.due_date)} · {formatCOP(i.amount)}
              </option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">Archivo
            <input ref={fileInput} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              aria-label="Archivo del comprobante" onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full min-w-0 text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
          </label>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">Observaciones (opcional)
            <input className={`${FIELD} mt-1`} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej.: transferencia de la separación" aria-label="Observaciones del comprobante" />
          </label>
          <button type="submit" disabled={!file || uploading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
            {uploading ? 'Guardando comprobante…' : 'Subir comprobante'}
          </button>
        </fieldset>
      </form>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      {success && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>}
      <p className="text-xs text-slate-500 dark:text-slate-400">Cada soporte conserva la referencia del pago al adjuntarlo. Adjuntar un archivo no confirma automáticamente el pago.</p>
    </section>
  );
}
