import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users, BookOpen, Settings, Layers, GraduationCap, Command, ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageEntry {
  to: string;
  label: string;
  icon: React.ElementType;
  keywords: string[];
}

const pages: PageEntry[] = [
  { to: '/', label: 'لوحة التحكم', icon: GraduationCap, keywords: ['رئيسية', 'home', 'dashboard'] },
  { to: '/students', label: 'الطلاب', icon: Users, keywords: ['طالب', 'student', 'تسجيل'] },
  { to: '/attendance', label: 'الحضور', icon: ArrowUpDown, keywords: ['حضور', 'غياب', 'attendance'] },
  { to: '/exams', label: 'الامتحانات', icon: GraduationCap, keywords: ['امتحان', 'exam', 'درجات'] },
  { to: '/payments', label: 'المدفوعات', icon: Settings, keywords: ['دفع', 'رسوم', 'payment'] },
  { to: '/reports', label: 'التقارير', icon: Settings, keywords: ['تقرير', 'report', 'إحصاءات'] },
  { to: '/settings', label: 'الإعدادات', icon: Settings, keywords: ['setting', 'إعدادات', 'ضبط'] },
  { to: '/staff', label: 'الموظفين', icon: Users, keywords: ['موظف', 'staff', 'user'] },
  { to: '/groups', label: 'المجموعات', icon: Layers, keywords: ['مجموعة', 'group', 'شعبة'] },
  { to: '/teachers', label: 'المدرسون', icon: BookOpen, keywords: ['مدرس', 'teacher', 'معلم'] },
  { to: '/waiting-list', label: 'قائمة الانتظار', icon: Users, keywords: ['انتظار', 'waiting', 'قائمة'] },
  { to: '/activity-log', label: 'سجل النشاطات', icon: Settings, keywords: ['نشاط', 'activity', 'log'] },
  { to: '/compensation', label: 'تعويض الحصص', icon: Settings, keywords: ['تعويض', 'compensation', 'حصة'] },
  { to: '/messages', label: 'الرسائل', icon: Settings, keywords: ['رسالة', 'message', 'واتساب'] },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener('open-command-palette', handler);
    return () => window.removeEventListener('open-command-palette', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = query.trim()
    ? pages.filter(p =>
        p.label.includes(query) ||
        p.keywords.some(k => k.includes(query))
      )
    : pages;

  const handleSelect = useCallback((to: string) => {
    navigate(to);
    setOpen(false);
  }, [navigate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { if (filtered[selectedIndex]) handleSelect(filtered[selectedIndex].to); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center pt-[15vh] z-[100]" onClick={() => setOpen(false)}>
      <div
        className="w-full max-w-lg mx-4 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-dark-600">
          <Command size={16} className="text-dark-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-dark-400"
            placeholder="ابحث عن صفحة..."
            dir="rtl"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-dark-600 text-dark-400">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {filtered.map((page, i) => {
            const Icon = page.icon;
            return (
              <button
                key={page.to}
                onClick={() => handleSelect(page.to)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-all text-sm ${
                  i === selectedIndex
                    ? 'bg-primary-500/20 text-primary-300'
                    : 'text-dark-200 hover:bg-dark-700/50'
                }`}
              >
                <Icon size={16} className="shrink-0 text-dark-400" />
                <span>{page.label}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-dark-500 text-center py-4">لا توجد نتائج</p>
          )}
        </div>
      </div>
    </div>
  );
}
