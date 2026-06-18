import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Search, Plus, X, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Student, Payment } from '@/types';
import { getStatusColor, getStatusText, formatCurrency } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';

export default function PaymentsPage() {
  const { grades } = useAppStore();
  const [students, setStudents] = useState<(Student & { price?: number })[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState('partial');
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadUnpaid = useCallback(async () => {
    try {
      const list = await window.electronAPI.getUnpaidStudents();
      setStudents(list);
    } catch { toast.error('فشل التحميل'); }
  }, []);

  useEffect(() => { loadUnpaid(); }, [loadUnpaid]);

  const loadPayments = async (studentId: number) => {
    try {
      const list = await window.electronAPI.getPayments(studentId);
      setPayments(list);
    } catch {}
  };

  const openStudent = async (student: Student) => {
    setSelectedStudent(student);
    await loadPayments(student.id);
  };

  const handleAddPayment = async () => {
    if (!selectedStudent || paymentAmount <= 0) { toast.error('أدخل مبلغ صحيح'); return; }
    try {
      await window.electronAPI.addPayment({
        student_id: selectedStudent.id,
        amount: paymentAmount,
        payment_type: paymentType,
        notes: paymentNotes,
      });
      toast.success('تم تسجيل الدفعة');
      setShowPaymentModal(false);
      setPaymentAmount(0);
      setPaymentNotes('');
      await loadPayments(selectedStudent.id);
      await loadUnpaid();
    } catch { toast.error('فشل تسجيل الدفعة'); }
  };

  const getGradePrice = (student: Student): number => {
    if ((student as any).price) return (student as any).price;
    const grade = grades.find(g => g.id === student.grade_id);
    return grade?.price || 0;
  };

  const filteredStudents = students.filter(s =>
    !search || s.full_name.includes(search) || s.student_id.includes(search) || s.phone.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">المدفوعات</h1>
          <p className="text-dark-400 text-sm">إدارة مدفوعات الطلاب</p>
        </div>
      </div>

      {selectedStudent ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => setSelectedStudent(null)} className="btn-ghost mb-4">&larr; العودة للقائمة</button>

          <div className="card p-6 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedStudent.full_name}</h2>
                <p className="text-dark-400 text-sm mt-1">{selectedStudent.student_id} {selectedStudent.phone && `• ${selectedStudent.phone}`}</p>
              </div>
              <div className="text-right">
                <span className={`badge ${getStatusColor(selectedStudent.payment_status)} text-sm`}>
                  {getStatusText(selectedStudent.payment_status)}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-6">
              <div className="bg-dark-700/30 rounded-lg p-4 text-center">
                <p className="text-xs text-dark-400 mb-1">سعر الصف</p>
                <p className="text-lg font-bold text-white">{formatCurrency(getGradePrice(selectedStudent))}</p>
              </div>
              <div className="bg-dark-700/30 rounded-lg p-4 text-center">
                <p className="text-xs text-dark-400 mb-1">المدفوع</p>
                <p className="text-lg font-bold text-emerald-400">{formatCurrency(selectedStudent.amount_paid)}</p>
              </div>
              <div className="bg-dark-700/30 rounded-lg p-4 text-center">
                <p className="text-xs text-dark-400 mb-1">المتبقي</p>
                <p className="text-lg font-bold text-red-400">{formatCurrency(Math.max(0, getGradePrice(selectedStudent) - selectedStudent.amount_paid))}</p>
              </div>
            </div>
            <div className="mt-4">
              <button onClick={() => setShowPaymentModal(true)} className="btn-primary">
                <DollarSign size={16} /> إضافة دفعة
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-semibold text-dark-200 mb-4">سجل المدفوعات</h3>
            {payments.length > 0 ? (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-700/20">
                    <div>
                      <span className="text-sm text-dark-200">{formatCurrency(p.amount)}</span>
                      <span className={`text-xs mr-2 ${p.payment_type === 'full' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        ({p.payment_type === 'full' ? 'كامل' : 'جزئي'})
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-dark-400">{new Date(p.created_at).toLocaleDateString('ar-EG')}</p>
                      {p.notes && <p className="text-xs text-dark-500">{p.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-dark-500 py-8">لا توجد مدفوعات مسجلة</p>
            )}
          </div>
        </motion.div>
      ) : (
        <>
          <div className="relative max-w-md">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث عن طالب..."
              className="input-field pr-9"
            />
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">الاسم</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">الرقم</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">الصف</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-dark-400 uppercase">الحالة</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">المدفوع</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">المتبقي</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50">
                  {filteredStudents.map((s) => {
                    const price = getGradePrice(s);
                    const remaining = Math.max(0, price - s.amount_paid);
                    return (
                      <tr key={s.id} className="hover:bg-dark-700/30 cursor-pointer" onClick={() => openStudent(s)}>
                        <td className="px-4 py-3 text-sm font-medium text-dark-100">{s.full_name}</td>
                        <td className="px-4 py-3 text-sm text-dark-400 font-mono">{s.student_id}</td>
                        <td className="px-4 py-3 text-sm text-dark-300">{s.grade_name || '—'}</td>
                        <td className="px-4 py-3 text-center"><span className={`badge ${getStatusColor(s.payment_status)}`}>{getStatusText(s.payment_status)}</span></td>
                        <td className="px-4 py-3 text-sm text-left text-emerald-400">{formatCurrency(s.amount_paid)}</td>
                        <td className="px-4 py-3 text-sm text-left text-red-400">{formatCurrency(remaining)}</td>
                        <td className="px-4 py-3 text-left"><button onClick={(e) => { e.stopPropagation(); openStudent(s); }} className="btn-ghost text-xs"><Plus size={14} /> دفع</button></td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-dark-500">لا يوجد طلاب غير مسددين</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowPaymentModal(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">إضافة دفعة</h2>
              <button onClick={() => setShowPaymentModal(false)} className="btn-ghost p-1"><X size={16} /></button>
            </div>
            <p className="text-sm text-dark-300 mb-4">الطالب: <span className="font-medium text-white">{selectedStudent.full_name}</span></p>
            <div className="space-y-4">
              <div>
                <label className="label">المبلغ</label>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(Number(e.target.value))} className="input-field" min={1} />
              </div>
              <div>
                <label className="label">النوع</label>
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="input-field">
                  <option value="partial">جزئي</option>
                  <option value="full">كامل</option>
                </select>
              </div>
              <div>
                <label className="label">ملاحظات (اختياري)</label>
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} className="input-field" placeholder="ملاحظات" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">إلغاء</button>
                <button onClick={handleAddPayment} className="btn-primary"><DollarSign size={16} /> تسجيل الدفعة</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
