import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Edit2, Trash2, UserCheck, Star, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Teacher, TeacherAttendance, TeacherEvaluation } from '@/types';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [attendance, setAttendance] = useState<TeacherAttendance[]>([]);
  const [evaluations, setEvaluations] = useState<TeacherEvaluation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', subject: '', salary: 0, hire_date: '' });
  const [evalForm, setEvalForm] = useState({ teacher_id: 0, rating: 5, comment: '' });
  const [activeTab, setActiveTab] = useState<'list' | 'attendance' | 'eval'>('list');

  const load = async () => {
    try {
      const [t, a, ev] = await Promise.all([
        window.electronAPI.listTeachers(),
        window.electronAPI.getTeacherAttendanceToday(),
        Promise.resolve([]),
      ]);
      setTeachers(t || []);
      setAttendance(a || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('الاسم مطلوب'); return; }
    try {
      if (editing) {
        await window.electronAPI.updateTeacher(editing.id, form);
        toast.success('تم تحديث المدرس');
      } else {
        await window.electronAPI.createTeacher(form);
        toast.success('تم إضافة المدرس');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ full_name: '', phone: '', email: '', subject: '', salary: 0, hire_date: '' });
      load();
    } catch { toast.error('فشل الحفظ'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل تريد حذف هذا المدرس؟')) return;
    try { await window.electronAPI.deleteTeacher(id); toast.success('تم الحذف'); load(); } catch {}
  };

  const handleCheckIn = async (id: number) => {
    try { await window.electronAPI.teacherCheckIn(id); toast.success('تم تسجيل الحضور'); load(); } catch {}
  };

  const handleEval = async () => {
    if (!evalForm.teacher_id) { toast.error('اختر مدرساً'); return; }
    try { await window.electronAPI.addTeacherEvaluation(evalForm); toast.success('تم إضافة التقييم'); setEvalForm({ teacher_id: 0, rating: 5, comment: '' }); } catch {}
  };

  const loadEvals = async (id: number) => {
    try { const e = await window.electronAPI.getTeacherEvaluations(id); setEvaluations(e || []); } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">المدرسون</h1>
          <p className="text-dark-400 text-sm">إدارة المدرسين والحضور والتقييمات</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ full_name: '', phone: '', email: '', subject: '', salary: 0, hire_date: '' }); setShowModal(true); }} className="btn-primary"><Plus size={16} /> إضافة مدرس</button>
      </div>

      <div className="flex gap-2 mb-2">
        <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'list' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}><UserCheck size={16} className="inline ml-1" /> المدرسون</button>
        <button onClick={() => setActiveTab('attendance')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'attendance' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}><UserCheck size={16} className="inline ml-1" /> الحضور اليوم</button>
        <button onClick={() => setActiveTab('eval')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'eval' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}><Star size={16} className="inline ml-1" /> التقييمات</button>
      </div>

      {activeTab === 'list' && (
        <div className="card p-6">
          <div className="space-y-2">
            {teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-dark-700/30">
                <div>
                  <p className="text-sm font-medium text-dark-200">{t.full_name}</p>
                  <p className="text-xs text-dark-400">{t.subject} • {t.phone} • {t.is_active ? 'نشط' : 'غير نشط'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCheckIn(t.id)} className="btn-ghost p-1 text-green-400" title="تسجيل حضور"><UserCheck size={14} /></button>
                  <button onClick={() => { setEditing(t); setForm({ full_name: t.full_name, phone: t.phone, email: t.email, subject: t.subject, salary: t.salary, hire_date: t.hire_date }); setShowModal(true); }} className="btn-ghost p-1"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(t.id)} className="btn-ghost p-1 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {teachers.length === 0 && <p className="text-sm text-dark-500 text-center py-4">لا يوجد مدرسون</p>}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-dark-200 mb-4">حضور المدرسين اليوم</h2>
          <div className="space-y-2">
            {attendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-dark-700/30">
                <div>
                  <p className="text-sm font-medium text-dark-200">{a.teacher_name}</p>
                  <p className="text-xs text-dark-400">دخول: {a.check_in || '--'} • خروج: {a.check_out || '--'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${a.status === 'present' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>{a.status === 'present' ? 'حاضر' : 'غائب'}</span>
              </div>
            ))}
            {attendance.length === 0 && <p className="text-sm text-dark-500 text-center py-4">لا يوجد تسجيل حضور اليوم</p>}
          </div>
        </div>
      )}

      {activeTab === 'eval' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-dark-200 mb-4">إضافة تقييم</h2>
            <div className="space-y-4">
              <div>
                <label className="label">المدرس</label>
                <select value={evalForm.teacher_id} onChange={(e) => { setEvalForm({ ...evalForm, teacher_id: Number(e.target.value) }); loadEvals(Number(e.target.value)); }} className="input-field">
                  <option value={0}>اختر مدرساً</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">التقييم ({evalForm.rating}/10)</label>
                <input type="range" min={1} max={10} value={evalForm.rating} onChange={(e) => setEvalForm({ ...evalForm, rating: Number(e.target.value) })} className="w-full" />
              </div>
              <div>
                <label className="label">ملاحظات</label>
                <textarea value={evalForm.comment} onChange={(e) => setEvalForm({ ...evalForm, comment: e.target.value })} className="input-field" rows={3} />
              </div>
              <button onClick={handleEval} className="btn-primary"><Save size={16} /> حفظ التقييم</button>
            </div>
          </div>
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-dark-200 mb-4">التقييمات السابقة</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {evaluations.map((ev) => (
                <div key={ev.id} className="py-2 px-3 rounded-lg bg-dark-700/30">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-dark-400">{new Date(ev.created_at).toLocaleDateString('ar-EG')}</p>
                    <span className="text-xs text-yellow-400">{'★'.repeat(Math.round(ev.rating / 2))}</span>
                  </div>
                  {ev.comment && <p className="text-xs text-dark-300 mt-1">{ev.comment}</p>}
                </div>
              ))}
              {evaluations.length === 0 && <p className="text-sm text-dark-500 text-center py-4">لا توجد تقييمات</p>}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{editing ? 'تعديل مدرس' : 'إضافة مدرس جديد'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div><label className="label">الاسم</label><input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="input-field" /></div>
              <div><label className="label">رقم الهاتف</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" /></div>
              <div><label className="label">البريد الإلكتروني</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" /></div>
              <div><label className="label">المادة</label><input type="text" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="input-field" /></div>
              <div><label className="label">الراتب</label><input type="number" value={form.salary} onChange={e => setForm({ ...form, salary: Number(e.target.value) })} className="input-field" /></div>
              <div><label className="label">تاريخ التعيين</label><input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} className="input-field" /></div>
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
