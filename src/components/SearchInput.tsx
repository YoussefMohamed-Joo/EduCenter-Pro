import { useState, useRef, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import type { Student } from '@/types';

interface SearchInputProps {
  onSelect: (student: Student) => void;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  onBarcode?: (barcode: string) => void;
}

export default function SearchInput({ onSelect, autoFocus = false, placeholder = 'Search name, ID, or phone...', className = '', onBarcode }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Student[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const barcodeBuffer = useRef('');

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const res = await window.electronAPI.searchStudents(q);
    setResults(res);
    setIsOpen(res.length > 0);
    setSelectedIndex(-1);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (student: Student) => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(student);
  };

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.length === 1 && /\d/.test(val)) {
      barcodeBuffer.current = val;
    } else if (barcodeBuffer.current.length > 0) {
      barcodeBuffer.current += val;
      if (barcodeBuffer.current.length >= 8) {
        onBarcode?.(barcodeBuffer.current);
        barcodeBuffer.current = '';
        setQuery('');
      }
    }
  }, [onBarcode]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { handleChange(e); handleInput(e); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 bg-dark-700/80 border border-dark-600 rounded-lg text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/30 transition-all"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-dark-700 border border-dark-600 rounded-lg shadow-xl shadow-black/40 z-50 max-h-64 overflow-y-auto">
          {results.map((student, i) => (
            <button
              key={student.id}
              onClick={() => handleSelect(student)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === selectedIndex ? 'bg-primary-500/20 text-primary-300' : 'text-dark-200 hover:bg-dark-600'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{student.full_name}</div>
                <div className="text-xs text-dark-400 truncate">{student.student_id} {student.phone && `• ${student.phone}`}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${student.payment_status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : student.payment_status === 'partial' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                {student.payment_status}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
