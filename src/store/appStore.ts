import { create } from 'zustand';
import type { Grade, Group } from '@/types';

interface AppState {
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  grades: Grade[];
  groups: Group[];
  sidebarOpen: boolean;
  setTheme: (theme: 'dark' | 'light') => void;
  setSoundEnabled: (enabled: boolean) => void;
  setGrades: (grades: Grade[]) => void;
  setGroups: (groups: Group[]) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  loadSettings: () => Promise<void>;
  loadGrades: () => Promise<void>;
  loadGroups: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  theme: 'dark',
  soundEnabled: true,
  grades: [],
  groups: [],
  sidebarOpen: true,
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.className = theme;
    window.electronAPI.setSetting('theme', theme);
  },
  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    window.electronAPI.setSetting('sound_enabled', String(enabled));
  },
  setGrades: (grades) => set({ grades }),
  setGroups: (groups) => set({ groups }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  loadSettings: async () => {
    const settings = await window.electronAPI.getAllSettings();
    if (settings.theme) {
      set({ theme: settings.theme as 'dark' | 'light' });
      document.documentElement.className = settings.theme;
    }
    if (settings.sound_enabled) {
      set({ soundEnabled: settings.sound_enabled === 'true' });
    }
  },
  loadGrades: async () => {
    const grades = await window.electronAPI.getGrades();
    set({ grades });
  },
  loadGroups: async () => {
    const groups = await window.electronAPI.getGroups();
    set({ groups });
  },
}));
