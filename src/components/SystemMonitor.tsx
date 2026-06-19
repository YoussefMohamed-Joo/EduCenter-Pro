import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, HardDrive, AlertTriangle, RefreshCw, Server, Shield, CheckCircle, XCircle, MemoryStick as Memory } from 'lucide-react';
import { useAlertStore, type AlertLevel } from '../store/alertStore';

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  memory: { heapUsed: number; heapTotal: number; percentUsed: number };
  platform: string;
  version: string;
  electron: string;
  safeMode: boolean;
  featureFlags: { feature: string; enabled: boolean }[];
  modules: { name: string; healthy: boolean; restartCount: number; disabled: boolean; lastHeartbeatAgo: number }[];
  recentCrashes: { module: string; timestamp: number }[];
}

interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
}

export function SystemMonitor() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');
  const [showLogs, setShowLogs] = useState(false);
  const { alerts, addAlert } = useAlertStore();

  const fetchHealth = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api?.getSystemHealth) return;
    try {
      const h = await api.getSystemHealth();
      setHealth(h);
    } catch {}
  }, []);

  const fetchLogs = useCallback(async () => {
    const api = (window as any).electronAPI;
    if (!api?.getSystemLogs) return;
    try {
      const l = await api.getSystemLogs(logFilter === 'all' ? undefined : logFilter);
      setLogs(l);
    } catch {}
  }, [logFilter]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  useEffect(() => {
    if (showLogs) fetchLogs();
  }, [showLogs, logFilter, fetchLogs]);

  const simulateAlert = (level: AlertLevel) => {
    const msgs: Record<AlertLevel, { title: string; message: string }> = {
      info: { title: 'ℹ️ معلومات', message: 'هذه رسالة معلوماتية من النظام' },
      warning: { title: '⚠️ تحذير', message: 'قد يحدث خلل في النظام قريباً — يرجى حفظ عملك' },
      critical: { title: '🚨 خطر', message: 'تم اكتشاف مشكلة حرجة — النظام يحاول التعافي' },
    };
    addAlert({ level, title: msgs[level].title, message: msgs[level].message });
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}s ${m}d`;
  };

  return (
    <div dir="rtl" className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">مراقبة النظام</h1>
          <p className="text-slate-400 text-sm mt-1">لوحة تحكم الأداء والصحة العامة للنظام</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchHealth()} className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
            health?.status === 'healthy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
            health?.status === 'degraded' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
            'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {health?.status === 'healthy' ? 'سليم' : health?.status === 'degraded' ? 'منخفض الأداء' : 'حرج'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Memory className="w-4 h-4" />
            <span className="text-xs font-medium">الذاكرة</span>
          </div>
          {health ? (
            <div>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-bold text-white">
                  {health.memory.percentUsed.toFixed(0)}%
                </span>
                <span className="text-xs text-slate-500 mb-1">مستخدم</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(health.memory.percentUsed, 100)}%` }}
                  className={`h-full rounded-full ${
                    health.memory.percentUsed > 80 ? 'bg-red-500' :
                    health.memory.percentUsed > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {Math.round(health.memory.heapUsed / 1024 / 1024)}MB / {Math.round(health.memory.heapTotal / 1024 / 1024)}MB
              </p>
            </div>
          ) : (
            <div className="h-12 flex items-center text-slate-600 text-sm">جاري التحميل...</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Server className="w-4 h-4" />
            <span className="text-xs font-medium">النظام</span>
          </div>
          {health ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">المنصة</span>
                <span className="text-white">{health.platform === 'win32' ? 'Windows' : 'macOS'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">الإصدار</span>
                <span className="text-white">v{health.version}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">شغال منذ</span>
                <span className="text-white">{formatUptime(health.uptime)}</span>
              </div>
            </div>
          ) : (
            <div className="h-12 flex items-center text-slate-600 text-sm">جاري التحميل...</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <div className="flex items-center gap-2 text-slate-400 mb-3">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-medium">الوضع الآمن</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {health?.safeMode ? (
                <>
                  <XCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400 text-sm font-medium">مفعل</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-medium">غير مفعل</span>
                </>
              )}
            </div>
            {health && (
              <p className="text-xs text-slate-500">
                {health.modules.filter(m => !m.healthy).length > 0
                  ? `${health.modules.filter(m => !m.healthy).length} وحدة تحتاج اهتمام`
                  : 'جميع الوحدات تعمل بكفاءة'}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            الوحدات
          </h3>
          <div className="space-y-2">
            {health?.modules.map((mod) => (
              <div key={mod.name} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  {mod.healthy ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="text-sm text-slate-300">{mod.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  {mod.restartCount > 0 && <span>إعادة تشغيل: {mod.restartCount}</span>}
                  {mod.disabled && <span className="text-amber-400">معطل</span>}
                </div>
              </div>
            ))}
            {!health?.modules.length && (
              <p className="text-xs text-slate-600 py-2">لا توجد بيانات</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4"
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            محاكاة التنبيهات
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => simulateAlert('info')}
              className="px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/20 transition-colors"
            >
              ↫ معلومات
            </button>
            <button
              onClick={() => simulateAlert('warning')}
              className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/20 transition-colors"
            >
              ⚠ تحذير
            </button>
            <button
              onClick={() => simulateAlert('critical')}
              className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors"
            >
              🚨 خطر
            </button>
          </div>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="mt-4 w-full py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 text-xs transition-colors"
          >
            {showLogs ? 'إخفاء السجلات' : 'عرض السجلات'}
          </button>
        </motion.div>
      </div>

      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-slate-700/50 bg-slate-800/50 overflow-hidden mb-6"
          >
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  سجلات النظام
                </h3>
                <div className="flex gap-1">
                  {['all', 'error', 'warn', 'info', 'critical'].map((level) => (
                    <button
                      key={level}
                      onClick={() => setLogFilter(level)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${
                        logFilter === level
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {level === 'all' ? 'الكل' : level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto font-mono">
              {logs.length === 0 ? (
                <p className="text-slate-600 text-xs text-center py-4">لا توجد سجلات</p>
              ) : (
                logs.slice().reverse().map((log, i) => (
                  <div key={i} className="flex items-start gap-2 py-1 border-b border-slate-700/20 last:border-0">
                    <span className={`text-xs shrink-0 ${
                      log.level === 'error' ? 'text-red-400' :
                      log.level === 'critical' ? 'text-red-400 font-bold' :
                      log.level === 'warn' ? 'text-amber-400' :
                      'text-slate-500'
                    }`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-xs text-slate-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString('en-GB')}</span>
                    <span className="text-xs text-slate-500 shrink-0">[{log.module}]</span>
                    <span className="text-xs text-slate-300 truncate">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
