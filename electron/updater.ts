import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow: BrowserWindow | null = null;

export function initUpdater(window: BrowserWindow): void {
  mainWindow = window;

  setTimeout(() => {
    if (mainWindow) {
      autoUpdater.checkForUpdates();
    }
  }, 5000);

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update:status', { type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update:status', { type: 'available', info });
  });

  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('update:status', { type: 'not-available', info });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:status', { type: 'progress', progress });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:status', { type: 'downloaded', info });
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update:status', { type: 'error', error: err.message });
  });
}

export function registerUpdaterHandlers(): void {
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, updateAvailable: !!result?.updateInfo };
    } catch {
      return { success: false, error: 'فشل التحقق من التحديثات' };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch {
      return { success: false, error: 'فشل تحميل التحديث' };
    }
  });

  ipcMain.handle('update:install', () => {
    setImmediate(() => {
      autoUpdater.quitAndInstall(false, true);
    });
    return { success: true };
  });

  ipcMain.handle('update:checkNow', async () => {
    try {
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'فشل الاتصال' };
    }
  });
}
