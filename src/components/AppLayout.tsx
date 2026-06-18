import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import TitleBar from './TitleBar';
import Sidebar from './Sidebar';
import ClearDataButton from './ClearDataButton';
import { useAppStore } from '@/store/appStore';
import { useAuthStore } from '@/store/authStore';

const pageTableMap: Record<string, string> = {
  '/': 'الكل',
  '/students': 'students',
  '/attendance': 'attendance',
  '/exams': 'exams',
  '/payments': 'payments',
  '/reports': 'الكل',
  '/settings': 'grades',
  '/staff': 'staff',
  '/groups': 'groups_tbl',
  '/teachers': 'teachers',
  '/waiting-list': 'waiting_list',
  '/activity-log': 'activity_log',
  '/compensation': 'session_compensation',
  '/messages': 'messages',
};

const pageLabels: Record<string, string> = {
  '/students': 'الطلاب',
  '/attendance': 'الحضور',
  '/exams': 'الامتحانات',
  '/payments': 'المدفوعات',
  '/settings': 'الصفوف',
  '/staff': 'الموظفين',
  '/groups': 'المجموعات',
  '/teachers': 'المدرسين',
  '/waiting-list': 'قائمة الانتظار',
  '/activity-log': 'النشاطات',
  '/compensation': 'تعويض الحصص',
  '/messages': 'الرسائل',
};

export default function AppLayout() {
  const { sidebarOpen, toggleSidebar, loadSettings, loadGrades, loadGroups } = useAppStore();
  const { user } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    loadSettings();
    loadGrades();
    loadGroups();
  }, []);

  const currentPath = location.pathname;
  const tableName = pageTableMap[currentPath] || null;
  const pageLabel = pageLabels[currentPath] || 'هذه الصفحة';

  return (
    <div className="h-screen flex flex-col bg-dark-900">
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-6 relative">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>

          {user?.role === 'admin' && tableName && (
            <div className="fixed bottom-4 left-4 z-50">
              <ClearDataButton
                tableName={tableName}
                pageLabel={pageLabel}
                onClear={async () => {
                  if (tableName === 'الكل') {
                    const tables = ['students', 'attendance', 'payments', 'exams', 'exam_scores', 'teachers', 'teacher_attendance', 'teacher_evaluations', 'messages', 'receipts', 'installments', 'installment_payments', 'waiting_list', 'session_compensation', 'activity_log'];
                    for (const t of tables) await window.electronAPI.clearData(t);
                  } else {
                    await window.electronAPI.clearData(tableName);
                  }
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
