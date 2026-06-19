import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, X, Edit2, Trash2, ChevronLeft, ChevronRight, Upload, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/appStore';
import type { Student } from '@/types';
import { getStatusColor, getStatusText } from '@/lib/utils';
import { exportToExcel, importFromExcel, parseStudentRow } from '@/lib/xlsx';
import { SkeletonTable } from '@/components/Skeleton';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import StudentCard from './StudentCard';

export default function StudentsPage() {
  const { grades, groups, loadGrades, loadGroups } = useAppStore();
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cardStudent, setCardStudent] = useState<Student | null>(null);
  const [importing, setImporting] = useState(false);
  const [paymentMode, setPaymentMode] = useState('session');
  const limit = 25;

  const [form, setForm] = useState({
    full_name: '', phone: '', parent_phone: '', grade_id: '', group_id: '', total_sessions: 12,
  });

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await window.electronAPI.listStudents({
        page, limit,
        grade_id: filterGrade || undefined,
        group_id: filterGroup || undefined,
        payment_status: filterPayment || undefined,
        search: search || undefined,
      });
      setStudents(res.students);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch { toast.error('فشل تحميل الطلاب'); }
    finally { setLoading(false); }
  }, [page, search, filterGrade, filterGroup, filterPayment]);

  useEffect(() => { loadStudents(); }, [loadStudents]);
  useEffect(() => { loadGrades(); loadGroups(); }, []);

  useEffect(() => {
    (async () => {
      try {
        const cfg = await window.electronAPI.getPaymentConfig();
        setPaymentMode(cfg.payment_mode);
      } catch {}
    })();
  }, []);

  useKeyboardShortcuts([
    { key: 'n', ctrl: true, handler: () => { resetForm(); setEditingStudent(null); setShowAddModal(true); } },
  ]);

  const handleCreate = async () => {
    if (!form.full_name.trim()) { toast.error('الاسم مطلوب'); return; }
    try {
      await window.electronAPI.createStudent({
        ...form,
        grade_id: form.grade_id ? Number(form.grade_id) : null,
        group_id: form.group_id ? Number(form.group_id) : null,
      });
      toast.success('تم إضافة الطالب');
      setShowAddModal(false);
      resetForm();
      loadStudents();
    } catch { toast.error('فشل إضافة الطالب'); }
  };

  const handleUpdate = async () => {
    if (!editingStudent) return;
    try {
      await window.electronAPI.updateStudent(editingStudent.id, {
        ...form,
        grade_id: form.grade_id ? Number(form.grade_id) : null,
        group_id: form.group_id ? Number(form.group_id) : null,
      });
      toast.success('تم تحديث الطالب');
      setEditingStudent(null);
      resetForm();
      loadStudents();
    } catch { toast.error('فشل التحديث'); }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`هل تريد حذف ${student.full_name}؟`)) return;
    try {
      await window.electronAPI.deleteStudent(student.id);
      toast.success('تم حذف الطالب');
      loadStudents();
    } catch { toast.error('فشل الحذف'); }
  };

  const resetForm = () => {
    setForm({ full_name: '', phone: '', parent_phone: '', grade_id: '', group_id: '', total_sessions: 12 });
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setForm({
      full_name: student.full_name,
      phone: student.phone,
      parent_phone: student.parent_phone,
      grade_id: student.grade_id?.toString() || '',
      group_id: student.group_id?.toString() || '',
      total_sessions: student.total_sessions,
    });
    setShowAddModal(true);
  };

  const handleExport = () => {
    exportToExcel(students, [
      { key: 'student_id', label: 'الرقم' },
      { key: 'full_name', label: 'الاسم' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'grade_name', label: 'الصف' },
      { key: 'group_name', label: 'المجموعة' },
      { key: 'payment_status', label: 'حالة الدفع' },
    ], `الطلاب-${new Date().toISOString().split('T')[0]}`);
    toast.success('تم التصدير');
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const rows = await importFromExcel(file);
        let imported = 0;
        for (const row of rows) {
          const data = parseStudentRow(row);
          if (data.full_name) {
            await window.electronAPI.createStudent({
              ...data,
              grade_id: null,
              group_id: null,
              total_sessions: 12,
            });
            imported++;
          }
        }
        toast.success(`تم استيراد ${imported} طالب بنجاح`);
        loadStudents();
      } catch { toast.error('فشل استيراد الملف'); }
      finally { setImporting(false); }
    };
    input.click();
  };

  const filteredGroups = groups.filter(g => !form.grade_id || g.grade_id === Number(form.grade_id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الطلاب</h1>
          <p className="text-dark-400 text-sm">إدارة جميع الطلاب المسجلين ({total})</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleImport} disabled={importing} className="btn-secondary text-xs py-1.5 px-3">
            <Upload size={14} /> {importing ? 'جاري...' : 'استيراد Excel'}
          </button>
          <button onClick={handleExport} className="btn-secondary text-xs py-1.5 px-3">
            <Download size={14} /> تصدير Excel
          </button>
          <button onClick={() => { resetForm(); setEditingStudent(null); setShowAddModal(true); }} className="btn-primary text-xs py-1.5 px-3">
            <Plus size={14} /> إضافة طالب
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالاسم، الرقم، أو الهاتف..."
            className="input-field pr-9"
            data-search-input
          />
        </div>
        <button onClick={() => setFilterOpen(!filterOpen)} className={`btn-secondary ${filterOpen ? 'border-primary-500/50' : ''}`}>
          <Filter size={16} /> فلترة
        </button>
        <kbd className="text-[10px] px-1.5 py-1 rounded bg-dark-700 text-dark-400 hidden md:inline-flex items-center gap-1">
          <span className="text-[9px]">Ctrl</span>N
        </kbd>
      </div>

      <AnimatePresence>
        {filterOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="card p-4 flex flex-wrap gap-4">
              <div>
                <label className="label">الصف</label>
                <select value={filterGrade} onChange={(e) => { setFilterGrade(e.target.value); setPage(1); }} className="input-field">
                  <option value="">الكل</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">المجموعة</label>
                <select value={filterGroup} onChange={(e) => { setFilterGroup(e.target.value); setPage(1); }} className="input-field">
                  <option value="">الكل</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">حالة الدفع</label>
                <select value={filterPayment} onChange={(e) => { setFilterPayment(e.target.value); setPage(1); }} className="input-field">
                  <option value="">الكل</option>
                  <option value="paid">مدفوع</option>
                  <option value="unpaid">غير مدفوع</option>
                  <option value="partial">جزئي</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">الرقم</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">الاسم</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">الهاتف</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">الصف</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">المجموعة</th>
                {paymentMode === 'session' && <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">الحصص</th>}
                <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">الدفع</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/50">
              {loading ? (
                <tr><td colSpan={8}><SkeletonTable rows={5} /></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-dark-500">لا يوجد طلاب</td></tr>
              ) : students.map((student) => (
                <motion.tr key={student.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hover:bg-dark-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-dark-400 font-mono">{student.student_id}</td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-dark-100">{student.full_name}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-400" dir="ltr">{student.phone}</td>
                  <td className="px-4 py-3 text-sm text-dark-300">{student.grade_name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-dark-300">{student.group_name || '—'}</td>
                  {paymentMode === 'session' && (
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-dark-300">{student.sessions_attended}/{student.total_sessions}</span>
                  </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${getStatusColor(student.payment_status)}`}>{getStatusText(student.payment_status)}</span>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setCardStudent(student)} className="btn-ghost p-1.5" title="بطاقة طالب"><Printer size={14} /></button>
                      <button onClick={() => openEdit(student)} className="btn-ghost p-1.5"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(student)} className="btn-ghost p-1.5 text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-dark-700">
            <span className="text-sm text-dark-400">صفحة {page} من {totalPages}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-ghost p-1.5"><ChevronRight size={16} /></button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-ghost p-1.5"><ChevronLeft size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {cardStudent && <StudentCard student={cardStudent} onClose={() => setCardStudent(null)} />}

      <AnimatePresence>
        {showAddModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="card p-6 w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">{editingStudent ? 'تعديل طالب' : 'إضافة طالب جديد'}</h2>
                <button onClick={() => setShowAddModal(false)} className="btn-ghost p-1"><X size={16} /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">الاسم الكامل *</label>
                  <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" placeholder="اسم الطالب" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">الهاتف</label>
                    <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="هاتف الطالب" />
                  </div>
                  <div>
                    <label className="label">هاتف ولي الأمر</label>
                    <input type="text" value={form.parent_phone} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} className="input-field" placeholder="هاتف ولي الأمر" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">الصف</label>
                    <select value={form.grade_id} onChange={(e) => { setForm({ ...form, grade_id: e.target.value, group_id: '' }); }} className="input-field">
                      <option value="">اختر الصف</option>
                      {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">المجموعة</label>
                    <select value={form.group_id} onChange={(e) => setForm({ ...form, group_id: e.target.value })} className="input-field">
                      <option value="">اختر المجموعة</option>
                      {filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                </div>
                {paymentMode === 'session' && (
                <div>
                  <label className="label">عدد الحصص المسجل فيها</label>
                  <input type="number" value={form.total_sessions} onChange={(e) => setForm({ ...form, total_sessions: Number(e.target.value) })} className="input-field" min={1} max={100} />
                </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowAddModal(false)} className="btn-secondary">إلغاء</button>
                  <button onClick={editingStudent ? handleUpdate : handleCreate} className="btn-primary">
                    {editingStudent ? 'تحديث' : 'إضافة'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
