import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { getLogger } from './logger';
import { getDb } from './database';

const BACKUP_RETENTION_DAYS = 30;

interface BackupRecord {
  timestamp: string;
  path: string;
  size: number;
  type: 'daily' | 'pre_op' | 'manual';
  version: string;
}

class BackupSystem {
  private backupDir: string;
  private dailyTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  constructor() {
    this.backupDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    this.cleanOldBackups();
    this.scheduleDailyBackup();
    getLogger().info('BackupSystem', 'Backup system initialized', { backupDir: this.backupDir });
  }

  private getBackupPath(type: string): string {
    const date = new Date().toISOString().split('T')[0];
    const time = Date.now();
    return path.join(this.backupDir, `backup-${type}-${date}-${time}.db`);
  }

  private async performBackup(type: 'daily' | 'pre_op' | 'manual'): Promise<string | null> {
    try {
      const db = getDb();
      if (!db) {
        getLogger().error('BackupSystem', 'Cannot backup: database not available');
        return null;
      }

      const backupPath = this.getBackupPath(type);
      const appVersion = app.getVersion();

      const data = db.export();
      fs.writeFileSync(backupPath, Buffer.from(data));

      const stats = fs.statSync(backupPath);
      const record: BackupRecord = {
        timestamp: new Date().toISOString(),
        path: backupPath,
        size: stats.size,
        type,
        version: appVersion,
      };

      const manifestPath = path.join(this.backupDir, 'manifest.json');
      let manifest: BackupRecord[] = [];
      if (fs.existsSync(manifestPath)) {
        try {
          manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        } catch { manifest = []; }
      }
      manifest.push(record);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      getLogger().info('BackupSystem', `${type} backup created`, {
        path: backupPath,
        size: stats.size,
        version: appVersion,
      });

      return backupPath;
    } catch (err) {
      getLogger().error('BackupSystem', `Backup failed: ${type}`, err);
      return null;
    }
  }

  async createDailyBackup(): Promise<string | null> {
    return this.performBackup('daily');
  }

  async createPreOpBackup(): Promise<string | null> {
    return this.performBackup('pre_op');
  }

  async createManualBackup(): Promise<string | null> {
    return this.performBackup('manual');
  }

  private scheduleDailyBackup(): void {
    const now = new Date();
    const night = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0, 0);
    const msUntilNight = night.getTime() - now.getTime();
    const delay = msUntilNight > 0 ? msUntilNight : msUntilNight + 86400000;

    setTimeout(() => {
      this.createDailyBackup();
      this.dailyTimer = setInterval(() => {
        this.createDailyBackup();
      }, 86400000);
    }, delay);

    getLogger().info('BackupSystem', `Daily backup scheduled in ${Math.round(delay / 3600000)} hours`);
  }

  private cleanOldBackups(): void {
    try {
      const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 86400000;
      const manifestPath = path.join(this.backupDir, 'manifest.json');

      if (fs.existsSync(manifestPath)) {
        let manifest: BackupRecord[] = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const before = manifest.length;
        manifest = manifest.filter(r => {
          const ts = new Date(r.timestamp).getTime();
          if (ts < cutoff) {
            try { if (fs.existsSync(r.path)) fs.unlinkSync(r.path); } catch {}
            return false;
          }
          return true;
        });
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        getLogger().info('BackupSystem', `Cleaned ${before - manifest.length} old backups`);
      }

      const files = fs.readdirSync(this.backupDir);
      files.filter(f => f.startsWith('backup-') && f.endsWith('.db')).forEach(f => {
        const fpath = path.join(this.backupDir, f);
        const stat = fs.statSync(fpath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(fpath);
          getLogger().info('BackupSystem', `Removed old backup: ${f}`);
        }
      });
    } catch (err) {
      getLogger().error('BackupSystem', 'Error cleaning old backups', err);
    }
  }

  getBackupHistory(): BackupRecord[] {
    const manifestPath = path.join(this.backupDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      } catch { return []; }
    }
    return [];
  }

  async restoreFromBackup(backupPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(backupPath)) {
        getLogger().error('BackupSystem', 'Restore failed: backup file not found', { path: backupPath });
        return false;
      }

      const dbDir = app.getPath('userData');
      const dbPath = path.join(dbDir, 'educenter-pro.db');

      if (fs.existsSync(dbPath)) {
        const rollbackPath = path.join(this.backupDir, `pre-restore-${Date.now()}.db`);
        fs.copyFileSync(dbPath, rollbackPath);
        getLogger().info('BackupSystem', 'Pre-restore backup created', { path: rollbackPath });
      }

      fs.copyFileSync(backupPath, dbPath);
      getLogger().info('BackupSystem', 'Database restored successfully', { from: backupPath });
      return true;
    } catch (err) {
      getLogger().error('BackupSystem', 'Restore failed', err);
      return false;
    }
  }

  getLatestBackup(): BackupRecord | null {
    const history = this.getBackupHistory();
    if (history.length === 0) return null;
    return history.reduce((latest, current) =>
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    );
  }

  destroy(): void {
    if (this.dailyTimer) {
      clearInterval(this.dailyTimer);
    }
  }
}

let backupSystem: BackupSystem | null = null;

export function initBackupSystem(): BackupSystem {
  if (!backupSystem) {
    backupSystem = new BackupSystem();
  }
  backupSystem.init();
  return backupSystem;
}

export function getBackupSystem(): BackupSystem {
  if (!backupSystem) {
    return initBackupSystem();
  }
  return backupSystem;
}
