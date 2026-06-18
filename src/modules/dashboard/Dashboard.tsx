import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ClipboardCheck, Wallet, Layers, TrendingUp, DollarSign, Calendar, GraduationCap, Award } from 'lucide-react';
import type { DashboardStats, Activity } from '@/types';
import { formatDate } from '@/lib/utils';
import { SkeletonCard, SkeletonList } from '@/components/Skeleton';

const statCards = [
  { key: 'totalStudents', icon: Users, label: 'إجمالي الطلاب', color: 'from-primary-500 to-primary-700', bg: 'bg-primary-500/10' },
  { key: 'presentToday', icon: ClipboardCheck, label: 'الحضور اليوم', color: 'from-emerald-500 to-emerald-700', bg: 'bg-emerald-500/10' },
  { key: 'unpaidStudents', icon: Wallet, label: 'غير المسددين', color: 'from-red-500 to-red-700', bg: 'bg-red-500/10' },
  { key: 'activeGroups', icon: Layers, label: 'المجموعات النشطة', color: 'from-amber-500 to-amber-700', bg: 'bg-amber-500/10' },
  { key: 'totalRevenue', icon: DollarSign, label: 'إجمالي الإيرادات', color: 'from-violet-500 to-violet-700', bg: 'bg-violet-500/10', currency: true },
  { key: 'totalExams', icon: GraduationCap, label: 'الامتحانات', color: 'from-rose-500 to-rose-700', bg: 'bg-rose-500/10' },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      window.electronAPI.getDashboardStats().then(setStats),
      window.electronAPI.getAllTopStudents(10).then(setTopStudents),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div data-search-input>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="text-dark-400 text-sm mt-1">نظرة عامة على المركز التعليمي</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-dark-400">
          <Calendar size={14} />
          <span>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : statCards.map(({ key, icon: Icon, label, color, bg, currency }) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-hover p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${bg} text-dark-300`}>اليوم</span>
                  <div className={`p-2 rounded-lg ${bg}`}>
                    <Icon size={18} className={`bg-gradient-to-br ${color} bg-clip-text text-transparent`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-dark-400">{label}</p>
                  <p className="text-xl font-bold text-white">
                    {stats
                      ? currency
                        ? `${(stats as any)[key]?.toLocaleString() || 0} ج.م`
                        : (stats as any)[key]?.toLocaleString() || '0'
                      : '—'}
                  </p>
                </div>
              </motion.div>
            ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary-400" />
            <h2 className="text-lg font-semibold text-white">آخر النشاطات</h2>
          </div>
          {loading ? <SkeletonList count={5} /> : (
            stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-2">
                {stats.recentActivity.map((act: Activity) => (
                  <div key={act.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-700/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${act.status === 'present' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-dark-200">{act.full_name}</p>
                        <p className="text-xs text-dark-400">{act.group_name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-dark-500">{formatDate(act.session_date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-500 text-center py-8">لا توجد نشاطات حديثة</p>
            )
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-white">الطلاب المتميزون</h2>
          </div>
          {loading ? <SkeletonList count={5} /> : (
            topStudents.length > 0 ? (
              <div className="space-y-2">
                {topStudents.map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-dark-700/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-dark-600 text-dark-400'
                      }`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-200">{s.full_name}</p>
                        <p className="text-xs text-dark-400">{s.grade_name}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-emerald-400">{s.avg_score}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-500 text-center py-8">لا توجد بيانات امتحانات بعد</p>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
}
