import { app, BrowserWindow } from 'electron';
import { getLogger } from './logger';

const CRASH_THRESHOLD = 3;
const CRASH_WINDOW_MS = 60000;
const FREEZE_THRESHOLD_MS = 10000;

interface CrashRecord {
  module: string;
  timestamp: number;
}

interface ModuleState {
  healthy: boolean;
  lastHeartbeat: number;
  restartCount: number;
  disabled: boolean;
}

class RecoverySystem {
  private crashes: CrashRecord[] = [];
  private modules: Map<string, ModuleState> = new Map();
  private freezeCheckInterval: ReturnType<typeof setInterval> | null = null;
  private mainWindow: BrowserWindow | null = null;
  private safeMode = false;
  private featureFlags: Map<string, boolean> = new Map();

  init(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;
    this.startFreezeDetection();
    getLogger().info('RecoverySystem', 'Recovery system initialized');
  }

  private startFreezeDetection(): void {
    let lastPing = Date.now();
    this.freezeCheckInterval = setInterval(() => {
      if (!this.mainWindow || this.mainWindow.isDestroyed()) return;

      const now = Date.now();
      const elapsed = now - lastPing;
      if (elapsed > FREEZE_THRESHOLD_MS && !this.safeMode) {
        getLogger().warn('RecoverySystem', 'Renderer may be frozen', {
          elapsed,
          threshold: FREEZE_THRESHOLD_MS,
        });
        this.attemptRendererRecovery();
      }
      lastPing = now;
    }, 5000);
  }

  recordHeartbeat(): void {
    const state = this.modules.get('renderer') || {
      healthy: true,
      lastHeartbeat: 0,
      restartCount: 0,
      disabled: false,
    };
    state.lastHeartbeat = Date.now();
    state.healthy = true;
    this.modules.set('renderer', state);
  }

  private attemptRendererRecovery(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return;
    getLogger().info('RecoverySystem', 'Attempting renderer recovery');
    this.mainWindow.webContents.send('recovery:rendererRestart');
    this.mainWindow.reload();
    this.recordCrash('renderer');
  }

  recordCrash(module: string): void {
    const now = Date.now();
    this.crashes.push({ module, timestamp: now });
    const recent = this.crashes.filter(
      c => c.module === module && now - c.timestamp < CRASH_WINDOW_MS
    );

    if (recent.length >= CRASH_THRESHOLD) {
      getLogger().critical('RecoverySystem', `Module ${module} crashed ${recent.length} times in ${CRASH_WINDOW_MS}ms`, { count: recent.length });
      this.activateSafeMode(module);
    }
  }

  private activateSafeMode(failingModule: string): void {
    if (this.safeMode) return;
    this.safeMode = true;
    getLogger().warn('RecoverySystem', 'Activating safe mode due to repeated crashes', { module: failingModule });

    this.disableFeature(failingModule);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('system:safeMode', {
        active: true,
        module: failingModule,
        message: '🧪 تم تفعيل الوضع الآمن — بعض الميزات غير متاحة حالياً',
      });
    }

    setTimeout(() => {
      this.safeMode = false;
      const cutoff = Date.now() - CRASH_WINDOW_MS * 2;
      this.crashes = this.crashes.filter(c => c.timestamp > cutoff);
      getLogger().info('RecoverySystem', 'Safe mode deactivated - system stable');
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('system:safeMode', { active: false });
      }
    }, 300000);
  }

  disableFeature(feature: string): void {
    this.featureFlags.set(feature, false);
    getLogger().warn('RecoverySystem', `Feature disabled: ${feature}`);
  }

  isFeatureEnabled(feature: string): boolean {
    return this.featureFlags.get(feature) !== false;
  }

  isSafeMode(): boolean {
    return this.safeMode;
  }

  getDiagnostics(): any {
    return {
      safeMode: this.safeMode,
      modules: Array.from(this.modules.entries()).map(([name, state]) => ({
        name,
        healthy: state.healthy,
        restartCount: state.restartCount,
        disabled: state.disabled,
        lastHeartbeat: state.lastHeartbeat,
        lastHeartbeatAgo: state.lastHeartbeat ? Date.now() - state.lastHeartbeat : -1,
      })),
      featureFlags: Array.from(this.featureFlags.entries()).map(([k, v]) => ({ feature: k, enabled: v })),
      recentCrashes: this.crashes.slice(-10),
    };
  }

  destroy(): void {
    if (this.freezeCheckInterval) {
      clearInterval(this.freezeCheckInterval);
    }
  }
}

let recoverySystem: RecoverySystem | null = null;

export function initRecovery(mainWindow: BrowserWindow): RecoverySystem {
  if (!recoverySystem) {
    recoverySystem = new RecoverySystem();
  }
  recoverySystem.init(mainWindow);
  return recoverySystem;
}

export function getRecovery(): RecoverySystem {
  if (!recoverySystem) {
    recoverySystem = new RecoverySystem();
  }
  return recoverySystem;
}
