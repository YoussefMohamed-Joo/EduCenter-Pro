import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, ClipboardCheck, Wallet,
  BarChart3, Settings, LogOut, UserCog, Layers, GraduationCap, ChevronRight,
  BookOpen, ListOrdered, History, Calendar, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { to: '/students', icon: Users, label: 'الطلاب' },
  { to: '/attendance', icon: ClipboardCheck, label: 'الحضور' },
  { to: '/exams', icon: GraduationCap, label: 'الامتحانات' },
  { to: '/payments', icon: Wallet, label: 'المدفوعات' },
  { to: '/reports', icon: BarChart3, label: 'التقارير' },
  { to: '/settings', icon: Settings, label: 'الإعدادات' },
];

const adminItems = [
  { to: '/staff', icon: UserCog, label: 'الموظفين' },
  { to: '/groups', icon: Layers, label: 'المجموعات' },
  { to: '/teachers', icon: BookOpen, label: 'المدرسون' },
  { to: '/waiting-list', icon: ListOrdered, label: 'قائمة الانتظار' },
  { to: '/activity-log', icon: History, label: 'سجل النشاطات' },
  { to: '/compensation', icon: Calendar, label: 'تعويض الحصص' },
  { to: '/messages', icon: MessageSquare, label: 'الرسائل' },
  { to: '/system-monitor', icon: BarChart3, label: 'مراقبة النظام' },
];

export default function Sidebar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const { user, logout } = useAuthStore();

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        initial={false}
        animate={{ width: open ? 240 : 64 }}
        className="h-full bg-dark-800 border-l border-dark-700 flex flex-col overflow-hidden shrink-0"
      >
        <div className="flex items-center justify-start p-2">
          <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-dark-200">
            <motion.div animate={{ rotate: open ? 180 : 0 }}>
              <ChevronRight size={16} />
            </motion.div>
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-primary-500/15 text-primary-400 shadow-sm shadow-primary-500/10'
                    : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {open && <span className="text-sm font-medium truncate">{label}</span>}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <div className="h-px bg-dark-700 my-2" />
              {adminItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-500/15 text-primary-400 shadow-sm shadow-primary-500/10'
                        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {open && <span className="text-sm font-medium truncate">{label}</span>}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-2 border-t border-dark-700">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={18} className="shrink-0" />
            {open && <span className="text-sm font-medium">تسجيل الخروج</span>}
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
