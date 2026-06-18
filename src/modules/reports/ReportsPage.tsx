import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, Download, AlertTriangle, DollarSign, Award, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/appStore';
import type { Student } from '@/types';
import { getStatusColor, getStatusText, formatDate } from '@/lib/utils';
import { exportToExcel } from '@/lib/xlsx';

type ReportType = 'absentees' | 'nearlyFinished' | 'unpaid' | 'topStudents';

export default function ReportsPage() {
  const { grades } = useAppStore();
  const [activeReport, setActiveReport] = useState<ReportType>('absentees');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedGrade, setSelectedGrade] = useState('');

  const reports = [
    { key: 'absentees' as ReportType, icon: Users, label: 'الغائبين اليوم', desc: 'الطلاب غير الحاضرين اليوم', color: 'text-red-400' },
    { key: 'nearlyFinished' as ReportType, icon: AlertTriangle, label: 'الحصص المتبقية', desc: 'الطلاب الذين شارفت حصصهم على الانتهاء', color: 'text-amber-400' },
    { key: 'unpaid' as ReportType, icon: DollarSign, label: 'غير المسددين', desc: 'الطلاب الذين لم يسددوا الرسوم', color: 'text-rose-400' },
    { key: 'topStudents' as ReportType, icon: Award, label: 'الطلاب المتميزون', desc: 'أعلى الطلاب درجات في الامتحانات', color: 'text-emerald-400' },
  ];

  const generateReport = async () => {
    setLoading(true);
    try {
      let result: any[] = [];
      switch (activeReport) {
        case 'absentees':
          result = await window.electronAPI.getDailyAbsentees(date);
          break;
        case 'nearlyFinished':
          result = await window.electronAPI.getNearlyFinished(2);
          break;
        case 'unpaid':
          result = await window.electronAPI.getUnpaidReport();
          break;
        case 'topStudents':
          if (selectedGrade) {
            result = await window.electronAPI.getTopStudents(Number(selectedGrade), 50);
          } else {
            result = await window.electronAPI.getAllTopStudents(50);
          }
          break;
      }
      setData(result || []);
      if (!result || result.length === 0) toast('لا توجد نتائج');
    } catch { toast.error('فشل إنشاء التقرير'); }
    finally { setLoading(false); }
  };

  const downloadCSV = () => {
    if (data.length === 0) return;
    const headers = ['الاسم', 'الرقم', 'الهاتف', 'هاتف ولي الأمر', 'الصف', 'المجموعة'];
    const rows = data.map((d: any) => [d.full_name, d.student_id, d.phone, d.parent_phone, d.grade_name || '', d.group_name || '']);
    const csv = [headers.join(','), ...rows.map(r => r.map((c: string) => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير-${activeReport}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل التقرير');
  };

  const downloadExcel = () => {
    const reportNames: Record<ReportType, string> = { absentees: 'الغائبين', nearlyFinished: 'الحصص-المتبقية', unpaid: 'غير-المسددين', topStudents: 'المتميزون' };
    exportToExcel(data, [
      { key: 'full_name', label: 'الاسم' },
      { key: 'student_id', label: 'الرقم' },
      { key: 'phone', label: 'الهاتف' },
      { key: 'grade_name', label: 'الصف' },
      { key: 'group_name', label: 'المجموعة' },
    ], `تقرير-${reportNames[activeReport]}-${Date.now()}`);
    toast.success('تم تحميل Excel');
  };

  const printPdf = useCallback(() => {
    if (data.length === 0) return;
    const reportTitles: Record<ReportType, string> = {
      absentees: 'تقرير الغائبين',
      nearlyFinished: 'تقرير الحصص المتبقية',
      unpaid: 'تقرير غير المسددين',
      topStudents: 'تقرير الطلاب المتميزون',
    };
    const win = window.open('', '', 'width=800,height=600');
    if (!win) return;
    const rows = data.map((d: any, i: number) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${i + 1}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${d.full_name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${d.student_id || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${d.phone || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${d.grade_name || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${d.group_name || ''}</td>
      </tr>
    `).join('');
    win.document.write(`
      <html dir="rtl"><head><title>${reportTitles[activeReport]}</title>
      <style>
        body { font-family: 'Cairo', sans-serif; padding: 30px; color: #333; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 22px; margin: 0; }
        .header p { color: #666; font-size: 12px; margin: 4px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 10px 12px; font-size: 12px; text-align: center; border-bottom: 2px solid #ddd; }
        td { font-size: 13px; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
      </style></head><body>
        <div class="header"><h1>${reportTitles[activeReport]}</h1><p>${new Date().toLocaleDateString('ar-EG')}</p><p>عدد النتائج: ${data.length}</p></div>
        <table><thead><tr><th>م</th><th>الاسم</th><th>الرقم</th><th>الهاتف</th><th>الصف</th><th>المجموعة</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">EduCenter Pro - تقرير آلي</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  }, [data, activeReport]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">التقارير</h1>
          <p className="text-dark-400 text-sm">إنشاء وتحميل التقارير</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {reports.map(({ key, icon: Icon, label, desc, color }) => (
          <button
            key={key}
            onClick={() => { setActiveReport(key); setData([]); }}
            className={`card-hover p-4 text-right ${activeReport === key ? 'border-primary-500/50 ring-1 ring-primary-500/20' : ''}`}
          >
            <div className="flex items-center gap-3 mb-2">
              <Icon size={18} className={color} />
              <span className="text-sm font-semibold text-white">{label}</span>
            </div>
            <p className="text-xs text-dark-400">{desc}</p>
          </button>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          {activeReport === 'absentees' && (
            <div>
              <label className="label">التاريخ</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
            </div>
          )}
          {activeReport === 'topStudents' && (
            <div>
              <label className="label">اختر الصف (اختياري)</label>
              <select value={selectedGrade} onChange={(e) => setSelectedGrade(e.target.value)} className="input-field">
                <option value="">كل الصفوف</option>
                {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <button onClick={generateReport} disabled={loading} className="btn-primary">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BarChart3 size={16} />}
            إنشاء التقرير
          </button>
          {data.length > 0 && (
            <>
              <button onClick={downloadCSV} className="btn-secondary"><Download size={16} /> CSV</button>
              <button onClick={downloadExcel} className="btn-secondary"><Download size={16} /> Excel</button>
              <button onClick={printPdf} className="btn-secondary"><FileText size={16} /> PDF</button>
            </>
          )}
        </div>
      </div>

      {data.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between">
            <span className="text-sm text-dark-300">النتائج: {data.length}</span>
          </div>
          <div className="divide-y divide-dark-700/50">
            {data.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-dark-700/20">
                <div className="flex-1">
                  <p className="text-sm font-medium text-dark-100">{item.full_name}</p>
                  <p className="text-xs text-dark-400 flex items-center gap-2 mt-0.5">
                    <span>{item.student_id}</span>
                    {item.phone && <><span className="text-dark-600">|</span><span>{item.phone}</span></>}
                    {item.parent_phone && <><span className="text-dark-600">|</span><span className="text-dark-500">ولي الأمر: {item.parent_phone}</span></>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.grade_name && <span className="text-xs text-dark-400">{item.grade_name}</span>}
                  {item.group_name && <span className="text-xs text-dark-400">{item.group_name}</span>}
                  {item.payment_status && (
                    <span className={`badge ${getStatusColor(item.payment_status)}`}>{getStatusText(item.payment_status)}</span>
                  )}
                  {item.remaining !== undefined && (
                    <span className="text-xs text-amber-400">{item.remaining} حصة متبقية</span>
                  )}
                  {item.avg_score !== undefined && (
                    <span className={`text-sm font-bold ${item.avg_score >= 90 ? 'text-emerald-400' : item.avg_score >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                      {item.avg_score}%
                    </span>
                  )}
                  {item.price !== undefined && (
                    <span className="text-xs text-dark-400">
                      الرسوم: {item.price} | مدفوع: {item.amount_paid}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {!loading && data.length === 0 && (
        <div className="text-center py-16 text-dark-500">
          <BarChart3 size={48} className="mx-auto mb-4 opacity-20" />
          <p>اختر نوع التقرير واضغط إنشاء</p>
        </div>
      )}
    </div>
  );
}
