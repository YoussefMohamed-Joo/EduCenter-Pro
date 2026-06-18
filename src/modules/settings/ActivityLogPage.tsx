import { useState, useEffect } from 'react';
import { History, RefreshCw } from 'lucide-react';
import type { ActivityLogEntry } from '@/types';

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);

  const load = async () => {
    try { setLogs(await window.electronAPI.getActivityLog(200) || []); } catch {}
  };

  useEffect(() => { load(); }, []);

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      create_teacher: 'إضافة مدرس',
      teacher_attendance: 'تسجيل حضور مدرس',
      teacher_eval: 'تقييم مدرس',
      waiting_add: 'إضافة لقائمة الانتظار',
      waiting_convert: 'تحويل من قائمة الانتظار',
      installment_create: 'إنشاء نظام أقساط',
      installment_pay: 'دفع قسط',
      message_create: 'إنشاء رسالة',
      message_send: 'إرسال رسالة',
      receipt_create: 'إنشاء إيصال',
      compensation_create: 'تعويض حصة',
    };
    return map[action] || action;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">سجل النشاطات</h1>
          <p className="text-dark-400 text-sm">آخر الأحداث في النظام</p>
        </div>
        <button onClick={load} className="btn-secondary"><RefreshCw size={16} /> تحديث</button>
      </div>

      <div className="card p-6">
        <div className="space-y-1">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-dark-700/20 transition-colors">
              <History size={14} className="text-dark-500 mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark-200">{getActionLabel(log.action)}</p>
                {log.description && <p className="text-xs text-dark-400 truncate">{log.description}</p>}
              </div>
              <span className="text-xs text-dark-500 shrink-0">{new Date(log.created_at).toLocaleString('ar-EG')}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-dark-500 text-center py-4">لا توجد نشاطات</p>}
        </div>
      </div>
    </div>
  );
}
