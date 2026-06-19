import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, AlertCircle, Info, X, ShieldAlert } from 'lucide-react';
import { useAlertStore, type AlertLevel } from '../store/alertStore';

const levelConfig: Record<AlertLevel, { icon: typeof AlertTriangle; bg: string; border: string; text: string }> = {
  info: {
    icon: Info,
    bg: 'bg-blue-950/80 backdrop-blur-md',
    border: 'border-blue-500/40',
    text: 'text-blue-200',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-950/80 backdrop-blur-md',
    border: 'border-amber-500/40',
    text: 'text-amber-200',
  },
  critical: {
    icon: AlertTriangle,
    bg: 'bg-red-950/80 backdrop-blur-md',
    border: 'border-red-500/50',
    text: 'text-red-200',
  },
};

export function AlertBanner() {
  const { alerts, dismissAlert, safeMode, safeMessage } = useAlertStore();

  useEffect(() => {
    if (safeMode) {
      useAlertStore.getState().addAlert({
        level: 'warning',
        title: '⚠️ الوضع الآمن',
        message: safeMessage || 'بعض الميزات غير متاحة حالياً — النظام يحاول استعادة الاستقرار',
        action: { label: 'فهمت', handler: () => {} },
      });
    }
  }, [safeMode, safeMessage]);

  return (
    <div dir="rtl" className="fixed bottom-24 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {alerts
          .filter((a) => !a.dismissed)
          .map((alert) => {
            const config = levelConfig[alert.level];
            const Icon = config.icon;

            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`pointer-events-auto rounded-xl border ${config.border} ${config.bg} p-4 shadow-2xl`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.text}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${config.text}`}>
                      {alert.title}
                    </p>
                    <p className="text-white/70 text-xs mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                    {alert.action && (
                      <button
                        onClick={() => {
                          alert.action!.handler();
                          dismissAlert(alert.id);
                        }}
                        className="mt-2 text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1 transition-colors"
                      >
                        {alert.action.label}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-white/40 hover:text-white/70 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}

        {safeMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pointer-events-auto rounded-xl border border-amber-500/30 bg-amber-950/60 backdrop-blur-md p-3 shadow-2xl"
          >
            <div className="flex items-center gap-2 text-amber-300 text-xs">
              <ShieldAlert className="w-4 h-4" />
              <span>الوضع الآمن مفعل — النظام يتعافى</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
