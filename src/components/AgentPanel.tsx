import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, TrendingUp, Users, DollarSign, Calendar, Brain, Activity } from 'lucide-react';
import type { AgentAlert, AgentPredictions } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function AgentPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [alerts, setAlerts] = useState<AgentAlert[]>([]);
  const [predictions, setPredictions] = useState<AgentPredictions | null>(null);
  const [newAlert, setNewAlert] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadPredictions();

    const handler = (incoming: AgentAlert[]) => {
      setAlerts(incoming);
      setNewAlert(true);
      setTimeout(() => setNewAlert(false), 3000);
    };
    window.electronAPI.onAgentAlerts(handler);
    return () => {
      window.electronAPI.removeAgentAlertsListener();
    };
  }, [open]);

  const loadPredictions = async () => {
    try {
      const p = await window.electronAPI.getAgentPredictions();
      setPredictions(p);
    } catch {}
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed top-12 right-0 bottom-0 w-[360px] bg-dark-800 border-r border-dark-700 z-40 flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-primary-400" />
              <span className="font-semibold text-white">الوكيل الذكي</span>
              {newAlert && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2 h-2 rounded-full bg-red-500"
                />
              )}
            </div>
            <button onClick={onClose} className="btn-ghost p-1"><X size={16} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Alerts */}
            {alerts.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-dark-400 mb-3 flex items-center gap-1.5">
                  <Bell size={12} /> التنبيهات الذكية
                </h3>
                <div className="space-y-2">
                  {alerts.map((alert, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`rounded-xl px-4 py-3 text-sm border ${
                        alert.type === 'unpaid' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                        alert.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                        'bg-dark-700 border-dark-600 text-dark-200'
                      }`}
                    >
                      {alert.message}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Predictions */}
            {predictions && (
              <div>
                <h3 className="text-xs font-semibold text-dark-400 mb-3 flex items-center gap-1.5">
                  <TrendingUp size={12} /> التحليلات التنبؤية
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign size={14} className="text-emerald-400" />
                      <p className="text-xs text-dark-400">متوقع شهرياً</p>
                    </div>
                    <p className="text-lg font-bold text-white">{formatCurrency(predictions.forecastedMonthlyRevenue)}</p>
                  </div>

                  <div className="bg-dark-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={14} className="text-primary-400" />
                      <p className="text-xs text-dark-400">نمو الطلاب</p>
                    </div>
                    <p className={`text-lg font-bold ${predictions.studentGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {predictions.studentGrowth >= 0 ? '+' : ''}{predictions.studentGrowth}%
                    </p>
                  </div>

                  <div className="bg-dark-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-amber-400" />
                      <p className="text-xs text-dark-400">أفضل يوم حضور</p>
                    </div>
                    <p className="text-lg font-bold text-white">{predictions.bestDay}</p>
                  </div>

                  <div className="bg-dark-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Activity size={14} className="text-violet-400" />
                      <p className="text-xs text-dark-400">صحة النظام</p>
                    </div>
                    <p className={`text-lg font-bold ${
                      predictions.healthScore >= 80 ? 'text-emerald-400' :
                      predictions.healthScore >= 50 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {predictions.healthScore}%
                    </p>
                  </div>
                </div>

                <div className="mt-3 bg-dark-700/30 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-dark-400">إجمالي الطلاب</span>
                    <span className="text-white font-bold">{predictions.totalStudents}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-dark-400">غير المسددين</span>
                    <span className="text-red-400 font-bold">{predictions.unpaidStudents}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-dark-400">إجمالي الإيرادات</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(predictions.totalRevenue)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick commands */}
            <div>
              <h3 className="text-xs font-semibold text-dark-400 mb-3 flex items-center gap-1.5">
                <Brain size={12} /> أوامر سريعة جربها
              </h3>
              <div className="space-y-1.5">
                {[
                  'كم عدد الطلاب غير المسددين؟',
                  'سجل حضور محمد',
                  'دفعة لـ أحمد 200 جنيه',
                  'كم عدد الحضور اليوم؟',
                  'أضف طالب علي تليفون 01001112233',
                ].map((cmd, i) => (
                  <button
                    key={i}
                    onClick={async () => {
                      const res = await window.electronAPI.agentParseAndExecute(cmd);
                      alert(res.success ? res.result : res.error);
                    }}
                    className="w-full text-right px-3 py-2 rounded-lg bg-dark-700/30 hover:bg-dark-700 text-sm text-dark-300 hover:text-dark-100 transition-all"
                  >
                    🎯 {cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
