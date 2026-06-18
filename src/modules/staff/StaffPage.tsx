import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCog, Plus, X, Edit2, Trash2, Shield, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Staff } from '@/types';

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState({
    username: '', password: '', full_name: '', role: 'staff' as 'admin' | 'staff', permissions: 'attendance_only', is_active: 1,
  });

  const loadStaff = async () => {
    try {
      const list = await window.electronAPI.listStaff();
      setStaff(list);
    } catch { toast.error('فشل تحميل الموظفين'); }
  };

  useEffect(() => { loadStaff(); }, []);

  const handleSave = async () => {
    if (!form.username.trim() || !form.full_name.trim()) { toast.error('اسم المستخدم والاسم مطلوبان'); return; }
    if (!editing && !form.password.trim()) { toast.error('كلمة المرور مطلوبة'); return; }
    try {
      if (editing) {
        await window.electronAPI.updateStaff(editing.id, form);
        toast.success('تم تحديث الموظف');
      } else {
        await window.electronAPI.createStaff(form);
        toast.success('تم إضافة الموظف');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ username: '', password: '', full_name: '', role: 'staff', permissions: 'attendance_only', is_active: 1 });
      loadStaff();
    } catch (e: any) { toast.error(e.message || 'فشل'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل تريد حذف هذا الموظف؟')) return;
    try {
      await window.electronAPI.deleteStaff(id);
      toast.success('تم حذف الموظف');
      loadStaff();
    } catch { toast.error('فشل الحذف'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الموظفين</h1>
          <p className="text-dark-400 text-sm">إدارة مستخدمي النظام</p>
        </div>
        <button onClick={() => { setEditing(null); resetForm(); setShowModal(true); }} className="btn-primary">
          <Plus size={16} /> إضافة موظف
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="divide-y divide-dark-700/50">
          {staff.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-dark-700/20">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  s.role === 'admin' ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-700 text-dark-400'
                }`}>
                  {s.role === 'admin' ? <ShieldAlert size={16} /> : <Shield size={16} />}
                </div>
                <div>
                  <p className="text-sm font-medium text-dark-100">{s.full_name}</p>
                  <p className="text-xs text-dark-400">@{s.username} • {s.role === 'admin' ? 'مدير' : 'موظف'} • {s.permissions === 'full_access' ? 'صلاحية كاملة' : 'حضور فقط'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {s.is_active ? 'نشط' : 'غير نشط'}
                </span>
                <button onClick={() => { setEditing(s); setForm({ ...s, password: '' }); setShowModal(true); }} className="btn-ghost p-1"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(s.id)} className="btn-ghost p-1 text-red-400"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="text-center py-12 text-dark-500">لا يوجد موظفون</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{editing ? 'تعديل موظف' : 'إضافة موظف'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-1"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">الاسم الكامل</label>
                <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">اسم المستخدم</label>
                <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="label">كلمة المرور {editing && '(اتركه فارغاً للإبقاء)'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">الدور</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'staff' })} className="input-field">
                    <option value="staff">موظف</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                <div>
                  <label className="label">الصلاحيات</label>
                  <select value={form.permissions} onChange={(e) => setForm({ ...form, permissions: e.target.value })} className="input-field">
                    <option value="attendance_only">حضور فقط</option>
                    <option value="full_access">صلاحية كاملة</option>
                  </select>
                </div>
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

function resetForm() {
  // handled inline
}
