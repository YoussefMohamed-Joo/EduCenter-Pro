import { app, BrowserWindow } from 'electron';
import { getLogger } from './logger';
import { getRecovery } from './recovery';

const MAX_RESTART_ATTEMPTS = 3;
const RESTART_COOLDOWN_MS = 10000;

let restartAttempts = 0;
let lastRestartAttempt = 0;

export function initGlobalErrorHandler(mainWindow?: BrowserWindow): void {
  process.on('uncaughtException', (error: Error) => {
    getLogger().critical('Process', 'Uncaught exception', error);
    getRecovery().recordCrash('main');

    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('system:fatalError', {
          message: error.message,
          stack: error.stack,
        });
      } catch {}
    }

    if (error.message.includes('database') || error.message.includes('SQLITE')) {
      getLogger().info('Process', 'Database error detected - attempting recovery');
      return;
    }

    const now = Date.now();
    if (
      restartAttempts < MAX_RESTART_ATTEMPTS &&
      now - lastRestartAttempt > RESTART_COOLDOWN_MS
    ) {
      restartAttempts++;
      lastRestartAttempt = now;
      getLogger().info('Process', `Auto-restart attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS}`);

      try {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('system:restarting');
        }
      } catch {}

      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 1000);
    }
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    getLogger().error('Process', 'Unhandled promise rejection', {
      reason: reason?.message || String(reason),
      stack: reason?.stack,
    });
    getRecovery().recordCrash('main');

    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('system:rejection', {
          message: reason?.message || String(reason),
        });
      } catch {}
    }
  });

  process.on('warning', (warning: Error) => {
    if (warning.name === 'DeprecationWarning') return;
    getLogger().warn('Process', `Process warning: ${warning.name}`, {
      message: warning.message,
      stack: warning.stack,
    });
  });

  getLogger().info('Process', 'Global error handlers installed');
}

export function setupRendererErrorRelay(mainWindow: BrowserWindow): void {
  try {
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      getLogger().critical('Process', 'Renderer process gone', details);

      getRecovery().recordCrash('renderer');

      setTimeout(() => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.reload();
            getLogger().info('Process', 'Renderer reloaded after crash');
          }
        } catch (err) {
          getLogger().error('Process', 'Failed to reload renderer', err);
          app.relaunch();
          app.exit(0);
        }
      }, 2000);
    });

    mainWindow.webContents.on('crashed', () => {
      getLogger().critical('Process', 'WebContents crashed');
      getRecovery().recordCrash('renderer');

      setTimeout(() => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.reload();
          }
        } catch {}
      }, 2000);
    });

    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      getLogger().error('Process', `Failed to load: ${errorCode}`, { description: errorDescription });

      setTimeout(() => {
        try {
          if (mainWindow && !mainWindow.isDestroyed()) {
            if (process.env.VITE_DEV_SERVER_URL) {
              mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
            } else {
              mainWindow.loadFile(app.isPackaged
                ? require('path').join(__dirname, '../dist/index.html')
                : require('path').join(app.getAppPath(), 'dist/index.html'));
            }
          }
        } catch {}
      }, 3000);
    });
  } catch (err) {
    getLogger().error('Process', 'Failed to setup renderer error relay', err);
  }
}

export { restartAttempts };
