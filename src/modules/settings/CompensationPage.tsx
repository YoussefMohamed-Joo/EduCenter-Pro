import { useState, useEffect } from 'react';
import { Plus, X, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { CompensationEntry, Student } from '@/types';

export default function CompensationPage() {
  const [entries, setEntries] = useState<CompensationEntry[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ student_id: 0, original_date: '', compensation_date: '', notes: '' });

  const load = async () => {
    try {
      const [e, s] = await Promise.all([
        window.electronAPI.getCompensationList(),
        window.electronAPI.listStudents({ page: 1, limit: 1000 }),
      ]);
      setEntries(e || []);
      setStudents(s?.students || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.student_id || !form.original_date) { toast.error('يرجى اختيار الطالب وتاريخ الحصة الأصلية'); return; }
    try {
      await window.electronAPI.createCompensation(form);
      toast.success('تم إضافة التعويض');
      setShowModal(false);
      setForm({ student_id: 0, original_date: '', compensation_date: '', notes: '' });
      load();
    } catch { toast.error('فشل الإضافة'); }
  };

  const handleComplete = async (id: number) => {
    try { await window.electronAPI.completeCompensation(id); toast.success('تم إتمام التعويض'); load(); } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">تعويض الحصص</h1>
          <p className="text-dark-400 text-sm">إدارة تعويض الحصص للطلاب الغائبين</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> إضافة تعويض</button>
      </div>

      <div className="card p-6">
        <div className="space-y-2">
          {entries.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-dark-700/30">
              <div>
                <p className="text-sm font-medium text-dark-200">{c.student_name}</p>
                <p className="text-xs text-dark-400">
                  الحصة الأصلية: {new Date(c.original_date).toLocaleDateString('ar-EG')}
                  {c.compensation_date ? ` • تاريخ التعويض: ${new Date(c.compensation_date).toLocaleDateString('ar-EG')}` : ''}
                </p>
                {c.notes && <p className="text-xs text-dark-500 mt-0.5">{c.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${c.status === 'completed' ? 'bg-green-500/15 text-green-400' : c.status === 'cancelled' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  {c.status === 'completed' ? 'تم' : c.status === 'cancelled' ? 'ملغي' : 'معلق'}
                </span>
                {c.status === 'pending' && (
                  <button onClick={() => handleComplete(c.id)} className="btn-ghost p-1 text-green-400" title="إتمام"><CheckCircle size={14} /></button>
                )}
              </div>
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-dark-500 text-center py-4">لا توجد تعويضات</p>}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">إضافة تعويض حصة</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="label">الطالب</label>
                <select value={form.student_id} onChange={e => setForm({ ...form, student_id: Number(e.target.value) })} className="input-field">
                  <option value={0}>اختر طالباً</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
                </select>
              </div>
              <div><label className="label">تاريخ الحصة الأصلية</label><input type="date" value={form.original_date} onChange={e => setForm({ ...form, original_date: e.target.value })} className="input-field" /></div>
              <div><label className="label">تاريخ التعويض (اختياري)</label><input type="date" value={form.compensation_date} onChange={e => setForm({ ...form, compensation_date: e.target.value })} className="input-field" /></div>
              <div><label className="label">ملاحظات</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows={3} /></div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
                <button onClick={handleAdd} className="btn-primary">إضافة</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
