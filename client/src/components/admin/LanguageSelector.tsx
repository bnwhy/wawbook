import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';

export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'fr', name: 'Français' },
  { code: 'nl', name: 'Néerlandais' },
  { code: 'en', name: 'Anglais' },
  { code: 'de', name: 'Allemand' },
  { code: 'es', name: 'Espagnol' },
  { code: 'it', name: 'Italien' },
  { code: 'pt', name: 'Portugais' },
  { code: 'ar', name: 'Arabe' },
  { code: 'zh', name: 'Chinois' },
  { code: 'ja', name: 'Japonais' },
  { code: 'ko', name: 'Coréen' },
  { code: 'ru', name: 'Russe' },
  { code: 'pl', name: 'Polonais' },
  { code: 'tr', name: 'Turc' },
  { code: 'sv', name: 'Suédois' },
  { code: 'da', name: 'Danois' },
  { code: 'no', name: 'Norvégien' },
  { code: 'fi', name: 'Finnois' },
  { code: 'cs', name: 'Tchèque' },
  { code: 'sk', name: 'Slovaque' },
  { code: 'hu', name: 'Hongrois' },
  { code: 'ro', name: 'Roumain' },
  { code: 'bg', name: 'Bulgare' },
  { code: 'hr', name: 'Croate' },
  { code: 'uk', name: 'Ukrainien' },
  { code: 'he', name: 'Hébreu' },
  { code: 'fa', name: 'Persan' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'vi', name: 'Vietnamien' },
  { code: 'th', name: 'Thaï' },
  { code: 'id', name: 'Indonésien' },
  { code: 'ms', name: 'Malais' },
  { code: 'el', name: 'Grec' },
  { code: 'ca', name: 'Catalan' },
  { code: 'eu', name: 'Basque' },
];

interface LanguageSelectorProps {
  selected: { code: string; label: string }[];
  onChange: (languages: { code: string; label: string }[]) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ selected, onChange }) => {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase())
  );

  const isSelected = (l: { code: string; name: string }) =>
    selected.some(s => s.code === l.code);

  const toggle = (l: { code: string; name: string }) => {
    if (isSelected(l)) {
      onChange(selected.filter(s => s.code !== l.code));
    } else {
      onChange([...selected, { code: l.code, label: l.name }]);
    }
  };

  const remove = (code: string) => onChange(selected.filter(s => s.code !== code));

  return (
    <div ref={containerRef} className="relative">
      {/* Tags + input */}
      <div
        className="flex flex-wrap gap-1.5 p-2 bg-white border border-gray-300 rounded-lg min-h-[42px] cursor-text"
        onClick={() => setOpen(true)}
      >
        {selected.map(lang => (
          <span key={lang.code} className="bg-sky-50 text-sky-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
            {lang.label}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(lang.code); }}
              className="hover:text-red-500"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <div className="flex items-center gap-1 flex-1 min-w-[120px]">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? 'Rechercher une langue...' : ''}
            className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 outline-none"
          />
          <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-400">Aucune langue trouvée</div>
          ) : (
            filtered.map(l => (
              <button
                key={l.code}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(l)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors ${isSelected(l) ? 'bg-sky-50 text-sky-700 font-bold' : 'text-slate-700'}`}
              >
                <span className="font-mono text-xs w-8 shrink-0 text-slate-400">{l.code}</span>
                {l.name}
                {isSelected(l) && <span className="ml-auto text-sky-500 text-xs">✓</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
