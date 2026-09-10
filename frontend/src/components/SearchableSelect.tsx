import { useEffect, useId, useRef, useState } from 'react';

interface SearchOption {
  value: string;
  label: string;
  detail?: string;
  searchText?: string;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function SearchableSelect({ label, placeholder, value, options, onChange, loading = false }: {
  label: string;
  placeholder: string;
  value: string;
  options: SearchOption[];
  onChange: (value: string) => void;
  loading?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const selected = options.find((option) => option.value === value);
  const words = normalize(query ?? '').trim().split(/\s+/).filter(Boolean);
  const matches = options.filter((option) => {
    const text = normalize(`${option.label} ${option.detail ?? ''} ${option.searchText ?? ''}`);
    return words.every((word) => text.includes(word));
  });
  const activeIndex = Math.min(active, Math.max(0, matches.length - 1));

  useEffect(() => {
    if (open) list.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const select = (option: SearchOption) => {
    onChange(option.value);
    setQuery(null);
    setOpen(false);
  };

  return (
    <div className="relative min-w-0" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        setOpen(false);
        setQuery(null);
      }
    }}>
      <label htmlFor={id} className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <div className="relative">
        <span aria-hidden="true" className="material-symbols-outlined pointer-events-none absolute left-3 top-2 text-slate-400 text-xl">search</span>
        <input ref={input} id={id} type="text" role="combobox" autoComplete="off"
          aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-options`}
          aria-activedescendant={open && matches.length ? `${id}-option-${activeIndex}` : undefined}
          placeholder={placeholder} value={query ?? selected?.label ?? ''}
          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onFocus={(event) => { setOpen(true); setActive(0); event.currentTarget.select(); }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
            if (value) onChange('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setActive(!open ? 0 : Math.max(0, Math.min(matches.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1))));
            } else if (event.key === 'Enter' && open) {
              event.preventDefault();
              if (matches[activeIndex]) select(matches[activeIndex]);
            } else if (event.key === 'Escape') {
              event.stopPropagation();
              setOpen(false);
              setQuery(null);
            }
          }} />
        {(value || query) && <button type="button" aria-label={`Limpiar ${label.toLowerCase()}`}
          className="absolute right-2 top-1.5 rounded p-1 text-slate-400 hover:text-slate-700"
          onClick={() => { onChange(''); setQuery(''); setActive(0); setOpen(true); input.current?.focus(); }}>×</button>}
      </div>
      {open && <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg">
        <ul ref={list} id={`${id}-options`} role="listbox" aria-label={label} className="max-h-60 overflow-y-auto overscroll-contain">
          {matches.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option"
            aria-selected={option.value === value} onMouseDown={(event) => event.preventDefault()}
            onClick={() => select(option)}
            className={`cursor-pointer px-3 py-2 text-sm break-words ${index === activeIndex ? 'bg-blue-50 dark:bg-blue-950' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <span className="block font-medium text-slate-900 dark:text-white">{option.label}</span>
            {option.detail && <span className="block text-xs text-slate-500 dark:text-slate-400">{option.detail}</span>}
          </li>)}
        </ul>
        {!matches.length && <p role="status" className="px-3 py-3 text-sm text-slate-500">{loading ? 'Cargando opciones…' : 'No se encontraron resultados.'}</p>}
      </div>}
    </div>
  );
}
