import { useEffect, useRef } from 'react';
import { useAlertStore } from '@/store/alertStore';

export function useSystemResilience() {
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>();
  const { addAlert, setSafeMode } = useAlertStore();

  useEffect(() => {
    const api = (window as any).electronAPI;
    if (!api) return;

    heartbeatRef.current = setInterval(() => {
      api.sendHeartbeat().catch(() => {});
    }, 5000);

    const handleSafeMode = (data: { active: boolean; module?: string; message?: string }) => {
      setSafeMode(data.active, data.module, data.message || '');
      if (data.active) {
        addAlert({
          level: 'warning',
          title: '⚠️ الوضع الآمن',
          message: data.message || 'تم تفعيل الوضع الآمن بسبب خلل في النظام',
          action: { label: 'فهمت', handler: () => {} },
        });
      }
    };

    const handleFatalError = (data: { message: string; stack?: string }) => {
      addAlert({
        level: 'critical',
        title: '🚨 خطأ حرج',
        message: `حدث خطأ غير متوقع: ${data.message}. النظام سيحاول استعادة العمل.`,
        action: { label: 'إعادة تحميل', handler: () => window.location.reload() },
      });
    };

    const handleRecoveryRestart = () => {
      addAlert({
        level: 'info',
        title: '🔄 إعادة تشغيل',
        message: 'النظام يقوم بإعادة تشغيل الواجهة لاستعادة الاستقرار...',
      });
    };

    const handlePing = () => {};

    api.onSafeMode(handleSafeMode);
    api.onFatalError(handleFatalError);
    api.onRecoveryRestart(handleRecoveryRestart);
    api.onSystemPing(handlePing);

    api.getSystemHealth().then((health: any) => {
      if (health?.safeMode) {
        setSafeMode(true, '', 'تم استئناف العمل في الوضع الآمن من جلسة سابقة');
      }
      if (health?.status === 'critical') {
        addAlert({
          level: 'critical',
          title: '🚨 النظام في حالة حرجة',
          message: 'بعض المكونات لا تعمل بشكل صحيح. يرجى حفظ عملك والتواصل مع الدعم الفني.',
        });
      } else if (health?.status === 'degraded') {
        addAlert({
          level: 'warning',
          title: '⚠️ أداء منخفض',
          message: 'بعض المكونات تعمل بأداء أقل من المعتاد',
        });
      }
    }).catch(() => {});

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      api.removeSafeModeListener();
      api.removeFatalErrorListener();
      api.removeRecoveryRestartListener();
      api.removeSystemPingListener();
    };
  }, [addAlert, setSafeMode]);
}
