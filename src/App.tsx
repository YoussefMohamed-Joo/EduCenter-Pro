import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import CommandPalette from '@/components/CommandPalette';
import UpdateNotification from '@/components/UpdateNotification';
import { AlertBanner } from '@/components/AlertBanner';
import { SystemMonitor } from '@/components/SystemMonitor';
import Login from '@/modules/dashboard/Login';
import Dashboard from '@/modules/dashboard/Dashboard';
import StudentsPage from '@/modules/students/StudentsPage';
import AttendancePage from '@/modules/attendance/AttendancePage';
import ExamsPage from '@/modules/exams/ExamsPage';
import PaymentsPage from '@/modules/payments/PaymentsPage';
import ReportsPage from '@/modules/reports/ReportsPage';
import SettingsPage from '@/modules/settings/SettingsPage';
import StaffPage from '@/modules/staff/StaffPage';
import GroupsPage from '@/modules/groups/GroupsPage';
import TeachersPage from '@/modules/settings/TeachersPage';
import WaitingListPage from '@/modules/settings/WaitingListPage';
import ActivityLogPage from '@/modules/settings/ActivityLogPage';
import CompensationPage from '@/modules/settings/CompensationPage';
import MessagesPage from '@/modules/settings/MessagesPage';
import AppLayout from '@/components/AppLayout';
import { useSystemResilience } from './hooks/useSystemResilience';

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  useGlobalShortcuts();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<ErrorBoundary name="dashboard"><Dashboard /></ErrorBoundary>} />
        <Route path="students" element={<ErrorBoundary name="students"><StudentsPage /></ErrorBoundary>} />
        <Route path="attendance" element={<ErrorBoundary name="attendance"><AttendancePage /></ErrorBoundary>} />
        <Route path="exams" element={<ErrorBoundary name="exams"><ExamsPage /></ErrorBoundary>} />
        <Route path="payments" element={<ErrorBoundary name="payments"><PaymentsPage /></ErrorBoundary>} />
        <Route path="reports" element={<ErrorBoundary name="reports"><ReportsPage /></ErrorBoundary>} />
        <Route path="settings" element={<ProtectedRoute requireAdmin><ErrorBoundary name="settings"><SettingsPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="staff" element={<ProtectedRoute requireAdmin><ErrorBoundary name="staff"><StaffPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="groups" element={<ProtectedRoute requireAdmin><ErrorBoundary name="groups"><GroupsPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="teachers" element={<ProtectedRoute requireAdmin><ErrorBoundary name="teachers"><TeachersPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="waiting-list" element={<ProtectedRoute requireAdmin><ErrorBoundary name="waiting"><WaitingListPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="activity-log" element={<ProtectedRoute requireAdmin><ErrorBoundary name="activity"><ActivityLogPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="compensation" element={<ProtectedRoute requireAdmin><ErrorBoundary name="compensation"><CompensationPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="messages" element={<ProtectedRoute requireAdmin><ErrorBoundary name="messages"><MessagesPage /></ErrorBoundary></ProtectedRoute>} />
        <Route path="system-monitor" element={<ProtectedRoute requireAdmin><ErrorBoundary name="system"><SystemMonitor /></ErrorBoundary></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useSystemResilience();

  return (
    <HashRouter>
      <Toaster
        position="top-left"
        toastOptions={{
          duration: 3000,
          style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '12px', fontSize: '14px', fontFamily: 'Cairo, sans-serif' },
          success: { iconTheme: { primary: '#34d399', secondary: '#1e293b' } },
          error: { iconTheme: { primary: '#f87171', secondary: '#1e293b' } },
        }}
      />
      <CommandPalette />
      <UpdateNotification />
      <AlertBanner />
      <AppRoutes />
    </HashRouter>
  );
}
