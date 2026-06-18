import { useState, useEffect, useRef } from 'react';
import { Bell, BellDot, CheckCheck, X } from 'lucide-react';

interface INotification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const load = async () => {
    try {
      if (window.electronAPI.getActivityLog) {
        const logs = await window.electronAPI.getActivityLog(10);
        const mapped: INotification[] = (logs || []).map((l: any, i: number) => ({
          id: l.id || i,
          type: l.action || 'info',
          title: l.action || 'نشاط',
          message: l.description || '',
          is_read: 0,
          created_at: l.created_at || new Date().toISOString(),
        }));
        setNotifications(mapped);
      }
    } catch {}
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200 transition-all"
      >
        {unreadCount > 0 ? <BellDot size={18} /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl shadow-black/40 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-600">
            <h3 className="text-sm font-semibold text-white">الإشعارات</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                <CheckCheck size={12} /> تحديد الكل مقروء
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-dark-500 text-center py-8">لا توجد إشعارات</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-dark-700/50 hover:bg-dark-700/30 transition-all ${
                    !n.is_read ? 'bg-primary-500/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-200 truncate">{n.title}</p>
                      <p className="text-xs text-dark-400 truncate">{n.message}</p>
                      <p className="text-[10px] text-dark-500 mt-1">
                        {new Date(n.created_at).toLocaleString('ar-EG')}
                      </p>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
