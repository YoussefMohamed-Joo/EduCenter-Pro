import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Layers, Plus, X, Edit2, Trash2, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/appStore';
import type { Group } from '@/types';

const daysOptions = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export default function GroupsPage() {
  const { grades, groups, loadGrades, loadGroups } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: '', grade_id: '', days: [] as string[], time: '' });

  useEffect(() => { loadGrades(); loadGroups(); }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.grade_id) { toast.error('الاسم والصف مطلوبان'); return; }
    try {
      const data = { name: form.name, grade_id: Number(form.grade_id), days: form.days.join(', '), time: form.time };
      if (editing) {
        await window.electronAPI.updateGroup(editing.id, data);
        toast.success('تم تحديث المجموعة');
      } else {
        await window.electronAPI.createGroup(data);
        toast.success('تم إضافة المجموعة');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', grade_id: '', days: [], time: '' });
      loadGroups();
    } catch { toast.error('فشل الحفظ'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل تريد حذف هذه المجموعة؟')) return;
    try {
      await window.electronAPI.deleteGroup(id);
      toast.success('تم حذف المجموعة');
      loadGroups();
    } catch { toast.error('فشل الحذف'); }
  };

  const toggleDay = (day: string) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">المجموعات والجداول</h1>
          <p className="text-dark-400 text-sm">إدارة الصفوف والمجموعات والجداول الزمنية</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', grade_id: '', days: [], time: '' }); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> إضافة مجموعة
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {grades.map((grade) => {
          const gradeGroups = groups.filter(g => g.grade_id === grade.id);
          return (
            <div key={grade.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-primary-400" />
                  <h3 className="text-sm font-semibold text-white">{grade.name}</h3>
                </div>
                <span className="text-xs text-dark-400">{grade.price} ج.م</span>
              </div>
              {gradeGroups.length > 0 ? (
                <div className="space-y-2">
                  {gradeGroups.map((group) => (
                    <div key={group.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-700/30 group">
                      <div>
                        <p className="text-sm font-medium text-dark-200">{group.name}</p>
                        <div className="flex items-center gap-3 text-xs text-dark-400 mt-0.5">
                          {group.days && <span className="flex items-center gap-1"><Calendar size={10} /> {group.days}</span>}
                          {group.time && <span className="flex items-center gap-1"><Clock size={10} /> {group.time}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditing(group); setForm({ name: group.name, grade_id: String(group.grade_id), days: group.days ? group.days.split(', ').filter(Boolean) : [], time: group.time || '' }); setShowModal(true); }} className="btn-ghost p-1"><Edit2 size={12} /></button>
                        <button onClick={() => handleDelete(group.id)} className="btn-ghost p-1 text-red-400"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-dark-500 text-xs py-4">لا توجد مجموعات</p>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{editing ? 'تعديل مجموعة' : 'مجموعة جديدة'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">اسم المجموعة</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="مثال: المجموعة أ" />
              </div>
              <div>
                <label className="label">الصف</label>
                <select value={form.grade_id} onChange={(e) => setForm({ ...form, grade_id: e.target.value })} className="input-field">
                  <option value="">اختر الصف</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">الأيام</label>
                <div className="flex flex-wrap gap-2">
                  {daysOptions.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                        form.days.includes(day)
                          ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                          : 'bg-dark-700 border-dark-600 text-dark-400 hover:border-dark-500'
                      }`}
                    >
                      {day.slice(0, 2)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">الوقت</label>
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input-field" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary">إلغاء</button>
                <button onClick={handleSave} className="btn-primary">{editing ? 'تحديث' : 'إضافة'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
