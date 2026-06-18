import { useState, useEffect } from 'react';
import { Plus, X, Trash2, UserPlus, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import type { WaitingEntry, Grade } from '@/types';

export default function WaitingListPage() {
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', parent_phone: '', grade_id: 0, notes: '', priority: 0 });

  const load = async () => {
    try {
      const [e, g] = await Promise.all([
        window.electronAPI.getWaitingList(),
        window.electronAPI.getGrades(),
      ]);
      setEntries(e || []);
      setGrades(g || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.full_name.trim()) { toast.error('الاسم مطلوب'); return; }
    try {
      await window.electronAPI.addWaitingEntry({ ...form, grade_id: form.grade_id || null });
      toast.success('تم إضافة الطالب إلى قائمة الانتظار');
      setShowModal(false);
      setForm({ full_name: '', phone: '', parent_phone: '', grade_id: 0, notes: '', priority: 0 });
      load();
    } catch { toast.error('فشل الإضافة'); }
  };

  const handleConvert = async (id: number) => {
    if (!confirm('تحويل الطالب إلى طالب مسجل؟')) return;
    try {
      const r = await window.electronAPI.convertWaitingEntry(id, form.grade_id || 0);
      if (r.success) { toast.success('تم التحويل!'); load(); }
    } catch { toast.error('فشل التحويل'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('حذف هذا الطالب من قائمة الانتظار؟')) return;
    try { await window.electronAPI.deleteWaitingEntry(id); toast.success('تم الحذف'); load(); } catch {}
  };

  const getStatusBadge = (s: string) => {
    if (s === 'waiting') return 'bg-amber-500/15 text-amber-400';
    if (s === 'converted') return 'bg-green-500/15 text-green-400';
    return 'bg-red-500/15 text-red-400';
  };

  const getStatusText = (s: string) => {
    if (s === 'waiting') return 'بانتظار';
    if (s === 'converted') return 'تم التحويل';
    return 'ملغي';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">قائمة الانتظار</h1>
          <p className="text-dark-400 text-sm">إدارة الطلاب المنتظرين ({entries.filter(e => e.status === 'waiting').length})</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> إضافة طالب</button>
      </div>

      <div className="card p-6">
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-dark-700/30">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-dark-200">{entry.full_name}</p>
                  {entry.priority > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">{'★'.repeat(entry.priority)}</span>
                  )}
                </div>
                <p className="text-xs text-dark-400">{entry.phone} • {entry.grade_name || 'بدون صف'} • {new Date(entry.created_at).toLocaleDateString('ar-EG')}</p>
                {entry.notes && <p className="text-xs text-dark-500 mt-0.5">{entry.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(entry.status)}`}>{getStatusText(entry.status)}</span>
                {entry.status === 'waiting' && (
                  <>
                    <button onClick={() => handleConvert(entry.id)} className="btn-ghost p-1 text-primary-400" title="تحويل إلى طالب"><UserPlus size={14} /></button>
                    <button onClick={() => handleDelete(entry.id)} className="btn-ghost p-1 text-red-400"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
          {entries.length === 0 && <p className="text-sm text-dark-500 text-center py-4">قائمة الانتظار فارغة</p>}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">إضافة طالب إلى قائمة الانتظار</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="label">الاسم</label><input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="input-field" /></div>
              <div><label className="label">رقم الهاتف</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
              <div><label className="label">هاتف ولي الأمر</label><input type="text" value={form.parent_phone} onChange={e => setForm({ ...form, parent_phone: e.target.value })} className="input-field" /></div>
              <div><label className="label">الصف</label>
                <select value={form.grade_id} onChange={e => setForm({ ...form, grade_id: Number(e.target.value) })} className="input-field">
                  <option value={0}>بدون صف</option>
                  {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div><label className="label">الأولوية</label>
                <input type="range" min={0} max={3} value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="w-full" />
                <div className="flex justify-between text-xs text-dark-400"><span>عادية</span><span>عالية</span></div>
              </div>
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
