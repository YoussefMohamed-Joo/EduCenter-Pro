import { useEffect, useRef } from 'react';
import type { Student } from '@/types';

export default function StudentCard({ student, onClose }: { student: Student; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      printRef.current?.querySelector('button')?.click();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML || '';
    const win = window.open('', '', 'width=400,height=600');
    if (!win) return;
    win.document.write(`
      <html dir="rtl">
      <head><title>بطاقة طالب</title>
      <style>
        body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; display: flex; justify-content: center; }
        .card { width: 320px; border: 2px solid #333; border-radius: 12px; padding: 20px; text-align: center; }
        .card h2 { margin: 0 0 5px; font-size: 18px; }
        .card .id { font-size: 12px; color: #666; margin-bottom: 10px; }
        .card .info { text-align: right; font-size: 14px; margin: 10px 0; }
        .card .info p { margin: 4px 0; }
        .card .barcode { font-family: monospace; font-size: 11px; letter-spacing: 2px; background: #f0f0f0; padding: 6px; border-radius: 4px; margin: 10px 0; }
        .card .footer { font-size: 10px; color: #999; margin-top: 10px; }
      </style>
      </head>
      <body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 mx-4" onClick={e => e.stopPropagation()}>
        <div ref={printRef}>
          <div className="text-center p-4" style={{ width: 320, fontFamily: 'Cairo, sans-serif' }}>
            <h2 className="text-lg font-bold text-gray-800">{student.full_name}</h2>
            <p className="text-xs text-gray-500">{student.student_id}</p>
            <div className="text-right text-sm mt-3 space-y-1 text-gray-700">
              <p><strong>الصف:</strong> {student.grade_name || '---'}</p>
              <p><strong>المجموعة:</strong> {student.group_name || '---'}</p>
              {student.phone && <p><strong>الهاتف:</strong> {student.phone}</p>}
              {student.parent_phone && <p><strong>ولي الأمر:</strong> {student.parent_phone}</p>}
            </div>
            <div className="font-mono text-xs tracking-wider bg-gray-100 p-2 rounded mt-3 text-center text-gray-800">{student.barcode}</div>
            <p className="text-[10px] text-gray-400 mt-3">EduCenter Pro - بطاقة تعريفية</p>
          </div>
        </div>
        <div className="flex justify-center gap-3 mt-4">
          <button onClick={handlePrint} className="btn-primary">طباعة</button>
          <button onClick={onClose} className="btn-secondary">إغلاق</button>
        </div>
      </div>
    </div>
  );
}
