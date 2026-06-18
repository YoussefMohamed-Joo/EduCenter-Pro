import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Search, UserCheck, Users, X, Phone, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/appStore';
import type { Student, Attendance } from '@/types';
import { playSuccess, playScan } from '@/lib/utils';

export default function AttendancePage() {
  const { grades, groups, loadGrades, loadGroups } = useAppStore();
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [markedIds, setMarkedIds] = useState<Set<number>>(new Set());
  const [sessionNumber, setSessionNumber] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAbsentees, setShowAbsentees] = useState(false);
  const [absentees, setAbsentees] = useState<Student[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef('');

  useEffect(() => { loadGrades(); loadGroups(); }, []);
  useEffect(() => { searchInputRef.current?.focus(); }, [selectedGroup]);

  const filteredGroups = groups.filter(g => !selectedGrade || g.grade_id === Number(selectedGrade));

  const loadGroupStudents = useCallback(async () => {
    if (!selectedGroup) { setStudents([]); return; }
    try {
      const list = await window.electronAPI.getStudentsByGroup(Number(selectedGroup));
      setStudents(list);
      const att = await window.electronAPI.getTodayAttendance(Number(selectedGroup));
      const marked = new Set(att.map((a: any) => a.student_id));
      setMarkedIds(marked);
      const count = att.length > 0 ? Math.max(...att.map(a => a.session_number)) : 0;
      setSessionNumber(count + 1);
    } catch { toast.error('فشل التحميل'); }
  }, [selectedGroup]);

  useEffect(() => { loadGroupStudents(); }, [loadGroupStudents]);

  const markPresent = useCallback(async (studentId: number) => {
    if (markedIds.has(studentId)) {
      toast.error('تم تسجيل الحضور مسبقاً');
      return;
    }
    try {
      const result = await window.electronAPI.markAttendance(studentId, Number(selectedGroup), sessionNumber);
      if (result.success) {
        setMarkedIds(prev => new Set(prev).add(studentId));
        setSessionNumber(prev => prev + 1);
        await window.electronAPI.autoCreateExam(Number(selectedGroup), sessionNumber);
        playSuccess();
        toast.success('تم تسجيل الحضور');
        setSearchQuery('');
        searchInputRef.current?.focus();
      } else if (result.error === 'already_marked') {
        toast.error('مسجل مسبقاً');
      }
    } catch { toast.error('فشل التسجيل'); }
  }, [markedIds, selectedGroup, sessionNumber]);

  const handleSearch = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.length === 1 && /\d/.test(val)) {
      barcodeBuffer.current = val;
      return;
    }

    if (barcodeBuffer.current.length > 0) {
      barcodeBuffer.current += val;
      if (barcodeBuffer.current.length >= 8) {
        playScan();
        const results = await window.electronAPI.searchStudents(barcodeBuffer.current);
        if (results.length > 0) markPresent(results[0].id);
        barcodeBuffer.current = '';
        setSearchQuery('');
        return;
      }
      return;
    }

    if (val.length < 2) return;
    const results = await window.electronAPI.searchStudents(val);
    if (results.length === 1) markPresent(results[0].id);
  }, [markPresent]);

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const results = await window.electronAPI.searchStudents(searchQuery.trim());
      if (results.length > 0) markPresent(results[0].id);
    }
  };

  const handleShowAbsentees = async () => {
    try {
      const list = await window.electronAPI.getAbsentees(Number(selectedGroup));
      setAbsentees(list);
      setShowAbsentees(true);
    } catch { toast.error('فشل تحميل الغائبين'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الحضور</h1>
          <p className="text-dark-400 text-sm">نظام تسجيل الحضور السريع</p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">الصف</label>
            <select value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value); setSelectedGroup(''); }} className="input-field">
              <option value="">كل الصفوف</option>
              {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">المجموعة</label>
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)} className="input-field">
              <option value="">اختر مجموعة</option>
              {filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.time})</option>)}
            </select>
          </div>

          {selectedGroup && (
            <div className="relative flex-1 min-w-[200px]">
              <label className="label">بحث / مسح باركود</label>
              <div className="relative">
                <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  onKeyDown={handleKeyDown}
                  placeholder="اسم، رقم، هاتف، أو مسح باركود..."
                  className="input-field pr-9"
                />
              </div>
              <p className="text-xs text-dark-500 mt-1">اكتب الاسم/الرقم/الهاتف أو استخدم ماسح الباركود. اضغط Enter للتسجيل.</p>
            </div>
          )}
        </div>
      </div>

      {selectedGroup && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm">
              <span className="text-dark-400">الحصة #{sessionNumber}</span>
              <span className="text-dark-600">|</span>
              <span className="text-dark-400">
                <span className="text-emerald-400 font-semibold">{markedIds.size}</span> / {students.length} حاضر
              </span>
              <span className="text-dark-600">|</span>
              <span className="text-dark-400">
                <span className="text-red-400 font-semibold">{students.length - markedIds.size}</span> غائب
              </span>
            </div>
            <button onClick={handleShowAbsentees} className="btn-secondary">
              <Users size={16} /> عرض الغائبين
            </button>
          </div>

          <div className="card overflow-hidden">
            <div className="divide-y divide-dark-700/50">
              {students.map((student) => {
                const isMarked = markedIds.has(student.id);
                return (
                  <motion.div
                    key={student.id}
                    animate={isMarked ? { backgroundColor: 'rgba(52, 211, 153, 0.08)' } : {}}
                    className={`flex items-center justify-between px-4 py-3 transition-all ${
                      isMarked ? 'bg-emerald-500/5' : 'hover:bg-dark-700/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isMarked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-dark-700 text-dark-400'
                      }`}>
                        {isMarked ? <CheckCircle2 size={16} /> : student.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-100">{student.full_name}</p>
                        <p className="text-xs text-dark-500">{student.student_id} {student.phone ? `• ${student.phone}` : ''}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-dark-500">حصص {student.sessions_attended}/{student.total_sessions}</span>
                      {!isMarked && (
                        <button onClick={() => markPresent(student.id)} className="btn-secondary py-1.5 px-3 text-xs">
                          <UserCheck size={14} /> تسجيل
                        </button>
                      )}
                      {isMarked && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={14} /> حاضر
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              {students.length === 0 && (
                <div className="text-center py-12 text-dark-500">
                  <ClipboardCheck size={40} className="mx-auto mb-3 opacity-30" />
                  <p>لا يوجد طلاب في هذه المجموعة</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <AnimatePresence>
        {showAbsentees && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAbsentees(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-red-400" />
                  <h2 className="text-lg font-semibold text-white">الطلاب الغائبون</h2>
                  <span className="text-sm text-dark-400">({absentees.length})</span>
                </div>
                <button onClick={() => setShowAbsentees(false)} className="btn-ghost p-1"><X size={16} /></button>
              </div>

              {absentees.length > 0 ? (
                <div className="space-y-2">
                  {absentees.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-dark-700/30">
                      <div>
                        <p className="text-sm font-medium text-dark-200">{s.full_name}</p>
                        <p className="text-xs text-dark-400">{s.student_id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-dark-400 flex items-center gap-1"><Phone size={12} /> {s.phone || '—'}</span>
                        {s.parent_phone && (
                          <span className="text-xs text-dark-500 flex items-center gap-1">ولي الأمر: {s.parent_phone}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-dark-500">جميع الطلاب حاضرون</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

