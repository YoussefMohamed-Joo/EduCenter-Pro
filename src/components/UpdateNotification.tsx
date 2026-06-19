import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type UpdateState = {
  visible: boolean;
  type: 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  message: string;
  progress?: number;
};

export default function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({ visible: false, type: 'checking', message: '' });

  useEffect(() => {
    window.electronAPI?.onUpdateStatus?.((status) => {
      switch (status.type) {
        case 'checking':
          setState({ visible: false, type: 'checking', message: 'جاري التحقق من التحديثات...' });
          break;

        case 'available':
          setState({
            visible: true,
            type: 'available',
            message: `تحديث جديد متاح (${status.info?.version || ''}) — جاري التحميل...`,
          });
          window.electronAPI?.downloadUpdate?.();
          break;

        case 'not-available':
          setState({ visible: false, type: 'checking', message: '' });
          break;

        case 'progress':
          setState((prev) => ({
            ...prev,
            visible: true,
            type: 'downloading',
            message: `جاري تحميل التحديث... ${Math.round(status.progress?.percent || 0)}%`,
            progress: status.progress?.percent,
          }));
          break;

        case 'downloaded':
          setState({
            visible: true,
            type: 'downloaded',
            message: 'تم تحميل التحديث — أعد تشغيل البرنامج للتثبيت',
            progress: 100,
          });
          break;

        case 'error':
          console.error('Update error:', status.error);
          break;
      }
    });

    return () => {
      window.electronAPI?.removeUpdateListener?.();
    };
  }, []);

  const handleInstall = () => {
    window.electronAPI?.installUpdate?.();
  };

  const handleCheckNow = () => {
    setState({ visible: true, type: 'checking', message: 'جاري التحقق من التحديثات...' });
    window.electronAPI?.checkForUpdates?.();
  };

  return (
    <>
      <AnimatePresence>
        {state.visible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 left-4 right-4 z-[9999] max-w-md mx-auto"
          >
            <div className="bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl p-4 backdrop-blur-xl bg-opacity-95">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                  {state.type === 'downloading' ? (
                    <svg className="animate-spin w-4 h-4 text-primary-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="text-primary-400 text-sm">🔄</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-100">{state.message}</p>
                  {state.type === 'downloading' && state.progress !== undefined && (
                    <div className="mt-2 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${state.progress}%` }}
                        className="h-full bg-gradient-to-l from-primary-500 to-purple-500 rounded-full"
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                  {state.type === 'downloaded' && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={handleInstall} className="px-4 py-1.5 text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors">
                        تثبيت الآن
                      </button>
                      <button onClick={() => setState({ ...state, visible: false })} className="px-4 py-1.5 text-xs font-medium text-dark-400 hover:text-dark-200 transition-colors">
                        لاحقاً
                      </button>
                    </div>
                  )}
                </div>
                {state.type !== 'downloaded' && (
                  <button onClick={() => setState({ ...state, visible: false })} className="flex-shrink-0 w-6 h-6 rounded-md bg-dark-700 flex items-center justify-center text-dark-400 hover:text-dark-200 text-xs">
                    ✕
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
