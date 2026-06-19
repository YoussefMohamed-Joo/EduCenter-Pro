import { create } from 'zustand';

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: number;
  dismissed?: boolean;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface AlertState {
  alerts: Alert[];
  safeMode: boolean;
  safeModule: string;
  safeMessage: string;
  systemStatus: 'healthy' | 'degraded' | 'critical';

  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => void;
  dismissAlert: (id: string) => void;
  clearAlerts: () => void;
  setSafeMode: (active: boolean, module?: string, message?: string) => void;
  setSystemStatus: (status: 'healthy' | 'degraded' | 'critical') => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  safeMode: false,
  safeModule: '',
  safeMessage: '',
  systemStatus: 'healthy',

  addAlert: (alert) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newAlert: Alert = { ...alert, id, timestamp: Date.now() };
    set((state) => ({ alerts: [...state.alerts.slice(-4), newAlert] }));
  },

  dismissAlert: (id) => {
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, dismissed: true } : a)),
    }));
    setTimeout(() => {
      set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
    }, 300);
  },

  clearAlerts: () => set({ alerts: [] }),

  setSafeMode: (active, module = '', message = '') => {
    set({ safeMode: active, safeModule: module, safeMessage: message });
  },

  setSystemStatus: (status) => {
    set({ systemStatus: status });
  },
}));
