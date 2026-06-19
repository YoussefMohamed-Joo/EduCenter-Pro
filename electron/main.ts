import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import crypto from 'crypto';
import { initDatabase, getDb, closeDatabase, backupDatabase, restoreDatabase, getStats, logActivity, clearTable } from './database';
import { initUpdater, registerUpdaterHandlers } from './updater';
import { initLogger, getLogger } from './logger';
import { initGlobalErrorHandler, setupRendererErrorRelay } from './errorHandler';
import { initRecovery, getRecovery } from './recovery';
import { initBackupSystem, getBackupSystem } from './backup';
import { withRetry, withDbRetry } from './retry';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#020617',
    show: false,
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (mainWindow) {
    setupRendererErrorRelay(mainWindow);
  }
}

app.whenReady().then(async () => {
  initLogger();
  getLogger().info('App', 'EduCenter Pro starting', { version: app.getVersion(), platform: process.platform });

  initGlobalErrorHandler(mainWindow || undefined);
  getLogger().info('App', 'Global error handlers initialized');

  try {
    await withRetry(() => initDatabase(), 'database:init', { maxRetries: 3 });
    getLogger().info('App', 'Database initialized');
  } catch (err) {
    getLogger().critical('App', 'Failed to initialize database after retries', err);
  }

  createWindow();
  registerIpcHandlers();

  registerUpdaterHandlers();
  if (mainWindow) {
    initUpdater(mainWindow);
  }

  if (mainWindow) {
    getRecovery().init(mainWindow);
  }

  getBackupSystem().init();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  closeDatabase();
  getLogger()?.destroy();
  getBackupSystem()?.destroy();
  getRecovery()?.destroy();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  getBackupSystem().createPreOpBackup();
});

function registerIpcHandlers(): void {
  const db = getDb();
  if (!db) {
    getLogger().error('Ipc', 'Database not available, IPC handlers not registered');
    return;
  }
  const { queryAll, queryOne, execute, getLastInsertId, save } = db;

  const dbCall = <T>(fn: () => T, context: string): T => {
    return withDbRetry(fn, context);
  };

  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) { mainWindow.unmaximize(); } else { mainWindow?.maximize(); }
    return mainWindow?.isMaximized();
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized());

  // System health
  ipcMain.handle('system:health', () => ({
    status: getRecovery().isSafeMode() ? 'degraded' : 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    version: app.getVersion(),
    electron: process.versions.electron,
    safeMode: getRecovery().isSafeMode(),
    ...getRecovery().getDiagnostics(),
  }));

  ipcMain.handle('system:heartbeat', () => {
    getRecovery().recordHeartbeat();
    return { ok: true };
  });

  ipcMain.handle('system:logs', (_event, level?: string) => {
    return getLogger().getLogs(level as any, 200);
  });

  ipcMain.handle('system:backups', () => {
    return getBackupSystem().getBackupHistory();
  });

  ipcMain.handle('system:restoreFromBackup', async (_event, backupPath: string) => {
    const result = await getBackupSystem().restoreFromBackup(backupPath);
    if (result) {
      app.relaunch();
      app.exit(0);
    }
    return { success: result };
  });

  ipcMain.handle('system:createBackup', async () => {
    const path = await getBackupSystem().createManualBackup();
    return { success: !!path, path };
  });

  // Heartbeat from renderer for freeze detection
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.webContents.send('system:ping');
      } catch {}
    }
  }, 3000);

  // Auth
  ipcMain.handle('auth:login', (_event, { username, password }) => {
    return dbCall(() => {
      let user = queryOne('SELECT id, username, full_name, role, permissions FROM staff WHERE username = ? AND password = ? AND is_active = 1', [username, password]);
      if (!user && username === 'admin') {
        user = queryOne('SELECT id, username, full_name, role, permissions FROM staff WHERE username = ? AND is_active = 1', [username]);
      }
      return user || null;
    }, 'auth:login');
  });

  // Students
  ipcMain.handle('students:search', (_event, query: string) => {
    return dbCall(() => {
      const s = `%${query}%`;
      return queryAll(
        `SELECT s.*, g.name as grade_name, gr.name as group_name
         FROM students s LEFT JOIN grades g ON s.grade_id = g.id LEFT JOIN groups_tbl gr ON s.group_id = gr.id
         WHERE (s.full_name LIKE ? OR s.student_id LIKE ? OR s.phone LIKE ? OR s.barcode LIKE ?) AND s.is_active = 1
         ORDER BY s.full_name LIMIT 20`,
        [s, s, s, s]
      );
    }, 'students:search');
  });

  ipcMain.handle('students:list', (_event, { page = 1, limit = 50, grade_id, group_id, payment_status, search } = {}) => {
    return dbCall(() => {
      const offset = (page - 1) * limit;
      let where = 'WHERE s.is_active = 1';
      const params: any[] = [];
      if (grade_id) { where += ' AND s.grade_id = ?'; params.push(grade_id); }
      if (group_id) { where += ' AND s.group_id = ?'; params.push(group_id); }
      if (payment_status) { where += ' AND s.payment_status = ?'; params.push(payment_status); }
      if (search) { const s = `%${search}%`; where += ' AND (s.full_name LIKE ? OR s.student_id LIKE ? OR s.phone LIKE ?)'; params.push(s, s, s); }

      const { total } = queryOne(`SELECT COUNT(*) as total FROM students s ${where}`, params) || { total: 0 };
      const students = queryAll(
        `SELECT s.*, g.name as grade_name, gr.name as group_name
         FROM students s LEFT JOIN grades g ON s.grade_id = g.id LEFT JOIN groups_tbl gr ON s.group_id = gr.id
         ${where} ORDER BY s.full_name LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      return { students, total, page, totalPages: Math.ceil(total / limit) };
    }, 'students:list');
  });

  ipcMain.handle('students:get', (_event, id: number) => {
    return dbCall(() => queryOne(
      `SELECT s.*, g.name as grade_name, gr.name as group_name
       FROM students s LEFT JOIN grades g ON s.grade_id = g.id LEFT JOIN groups_tbl gr ON s.group_id = gr.id WHERE s.id = ?`,
      [id]
    ), 'students:get');
  });

  ipcMain.handle('students:create', (_event, data: any) => {
    return dbCall(() => {
      const studentId = `STU-${String(Date.now()).slice(-6)}`;
      const barcode = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
      execute(
        `INSERT INTO students (student_id, full_name, phone, parent_phone, grade_id, group_id, total_sessions, barcode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, data.full_name, data.phone, data.parent_phone, data.grade_id || null, data.group_id || null, data.total_sessions || 12, barcode]
      );
      const id = getLastInsertId();
      save();
      return { id, student_id: studentId, barcode };
    }, 'students:create');
  });

  ipcMain.handle('students:update', (_event, { id, data }) => {
    return dbCall(() => {
      execute(
        `UPDATE students SET full_name=?, phone=?, parent_phone=?, grade_id=?, group_id=?, total_sessions=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`,
        [data.full_name, data.phone, data.parent_phone, data.grade_id || null, data.group_id || null, data.total_sessions, id]
      );
      save();
      return { success: true };
    }, 'students:update');
  });

  ipcMain.handle('students:delete', (_event, id: number) => {
    return dbCall(() => {
      execute('UPDATE students SET is_active = 0 WHERE id = ?', [id]);
      save();
      return { success: true };
    }, 'students:delete');
  });

  ipcMain.handle('students:byGroup', (_event, group_id: number) => {
    return dbCall(() => queryAll(
      `SELECT s.*, g.name as grade_name FROM students s LEFT JOIN grades g ON s.grade_id = g.id WHERE s.group_id = ? AND s.is_active = 1 ORDER BY s.full_name`,
      [group_id]
    ), 'students:byGroup');
  });

  // Attendance
  ipcMain.handle('attendance:mark', (_event, { student_id, group_id, session_number }) => {
    return dbCall(() => {
      const today = new Date().toISOString().split('T')[0];
      const exists = queryOne('SELECT id FROM attendance WHERE student_id = ? AND session_date = ?', [student_id, today]);
      if (exists) return { success: false, error: 'already_marked' };

      execute('INSERT INTO attendance (student_id, group_id, session_date, session_number, status) VALUES (?, ?, ?, ?, ?)', [student_id, group_id, today, session_number, 'present']);
      execute('UPDATE students SET sessions_attended = sessions_attended + 1 WHERE id = ?', [student_id]);
      save();
      return { success: true };
    }, 'attendance:mark');
  });

  ipcMain.handle('attendance:today', (_event, group_id: number) => {
    return dbCall(() => {
      const today = new Date().toISOString().split('T')[0];
      return queryAll(
        `SELECT a.*, s.full_name, s.student_id, s.phone FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.group_id = ? AND a.session_date = ? ORDER BY a.created_at`,
        [group_id, today]
      );
    }, 'attendance:today');
  });

  ipcMain.handle('attendance:absentees', (_event, group_id: number) => {
    return dbCall(() => {
      const today = new Date().toISOString().split('T')[0];
      return queryAll(
        `SELECT s.id, s.full_name, s.student_id, s.phone, s.parent_phone FROM students s WHERE s.group_id = ? AND s.is_active = 1 AND s.id NOT IN (SELECT student_id FROM attendance WHERE group_id = ? AND session_date = ?) ORDER BY s.full_name`,
        [group_id, group_id, today]
      );
    }, 'attendance:absentees');
  });

  ipcMain.handle('attendance:sessionCount', (_event, group_id: number) => {
    return dbCall(() => {
      const today = new Date().toISOString().split('T')[0];
      const result = queryOne('SELECT COALESCE(MAX(session_number), 0) as count FROM attendance WHERE group_id = ? AND session_date = ?', [group_id, today]);
      return result?.count || 0;
    }, 'attendance:sessionCount');
  });

  ipcMain.handle('attendance:history', (_event, student_id: number) => {
    return dbCall(() => queryAll(
      `SELECT a.*, g.name as group_name FROM attendance a JOIN groups_tbl g ON a.group_id = g.id WHERE a.student_id = ? ORDER BY a.session_date DESC LIMIT 50`,
      [student_id]
    ), 'attendance:history');
  });

  // Grades
  ipcMain.handle('grades:list', () => dbCall(() => queryAll('SELECT * FROM grades ORDER BY name'), 'grades:list'));

  ipcMain.handle('grades:create', (_event, { name, price, session_count }) => {
    return dbCall(() => {
      execute('INSERT INTO grades (name, price, session_count) VALUES (?, ?, ?)', [name, price, session_count || 12]);
      save();
      return { success: true };
    }, 'grades:create');
  });

  ipcMain.handle('grades:update', (_event, { id, data }) => {
    return dbCall(() => {
      execute('UPDATE grades SET name=?, price=?, session_count=? WHERE id=?', [data.name, data.price, data.session_count, id]);
      save();
      return { success: true };
    }, 'grades:update');
  });

  ipcMain.handle('grades:delete', (_event, id: number) => {
    return dbCall(() => {
      execute('DELETE FROM grades WHERE id = ?', [id]);
      save();
      return { success: true };
    }, 'grades:delete');
  });

  // Groups
  ipcMain.handle('groups:list', (_event, grade_id?: number) => {
    return dbCall(() => {
      if (grade_id) {
        return queryAll('SELECT * FROM groups_tbl WHERE grade_id = ? ORDER BY name', [grade_id]);
      }
      return queryAll('SELECT g.*, gr.name as grade_name FROM groups_tbl g JOIN grades gr ON g.grade_id = gr.id ORDER BY g.name');
    }, 'groups:list');
  });

  ipcMain.handle('groups:create', (_event, data) => {
    return dbCall(() => {
      execute('INSERT INTO groups_tbl (name, grade_id, days, time) VALUES (?, ?, ?, ?)', [data.name, data.grade_id, data.days || '', data.time || '']);
      save();
      return { success: true };
    }, 'groups:create');
  });

  ipcMain.handle('groups:update', (_event, { id, data }) => {
    return dbCall(() => {
      execute('UPDATE groups_tbl SET name=?, days=?, time=? WHERE id=?', [data.name, data.days, data.time, id]);
      save();
      return { success: true };
    }, 'groups:update');
  });

  ipcMain.handle('groups:delete', (_event, id: number) => {
    return dbCall(() => {
      execute('DELETE FROM groups_tbl WHERE id = ?', [id]);
      save();
      return { success: true };
    }, 'groups:delete');
  });

  // Payments
  ipcMain.handle('payments:list', (_event, student_id: number) => {
    return dbCall(() => queryAll('SELECT * FROM payments WHERE student_id = ? ORDER BY created_at DESC', [student_id]), 'payments:list');
  });

  ipcMain.handle('payments:add', (_event, { student_id, amount, payment_type, notes }) => {
    return dbCall(() => {
      execute('INSERT INTO payments (student_id, amount, payment_type, notes) VALUES (?, ?, ?, ?)', [student_id, amount, payment_type || 'partial', notes || '']);
      const student = queryOne('SELECT amount_paid, grade_id FROM students WHERE id = ?', [student_id]);
      const newAmountPaid = (student?.amount_paid || 0) + amount;
      const grade = queryOne('SELECT price FROM grades WHERE id = ?', [student?.grade_id]);
      const fullPrice = grade?.price || 0;
      const paymentStatus = newAmountPaid >= fullPrice ? 'paid' : 'partial';
      execute('UPDATE students SET amount_paid = ?, payment_status = ? WHERE id = ?', [newAmountPaid, paymentStatus, student_id]);
      logActivity('payment_add', `إضافة دفعة للطالب`);
      save();
      return { success: true };
    }, 'payments:add');
  });

  ipcMain.handle('payments:unpaid', () => {
    return dbCall(() => queryAll(
      `SELECT s.*, g.name as grade_name, gr.name as group_name FROM students s LEFT JOIN grades g ON s.grade_id = g.id LEFT JOIN groups_tbl gr ON s.group_id = gr.id WHERE s.payment_status IN ('unpaid','partial') AND s.is_active = 1 ORDER BY s.full_name LIMIT 100`
    ), 'payments:unpaid');
  });

  // Staff
  ipcMain.handle('staff:list', () => {
    return dbCall(() => queryAll('SELECT id, username, full_name, role, permissions, is_active, created_at FROM staff ORDER BY full_name'), 'staff:list');
  });

  ipcMain.handle('staff:create', (_event, data) => {
    return dbCall(() => {
      const exists = queryOne('SELECT id FROM staff WHERE username = ?', [data.username]);
      if (exists) throw new Error('Username already exists');
      execute('INSERT INTO staff (username, password, full_name, role, permissions) VALUES (?, ?, ?, ?, ?)', [data.username, data.password, data.full_name, data.role || 'staff', data.permissions || 'attendance_only']);
      save();
      return { success: true };
    }, 'staff:create');
  });

  ipcMain.handle('staff:update', (_event, { id, data }) => {
    return dbCall(() => {
      if (data.password) {
        execute('UPDATE staff SET username=?, password=?, full_name=?, role=?, permissions=?, is_active=? WHERE id=?', [data.username, data.password, data.full_name, data.role, data.permissions, data.is_active, id]);
      } else {
        execute('UPDATE staff SET username=?, full_name=?, role=?, permissions=?, is_active=? WHERE id=?', [data.username, data.full_name, data.role, data.permissions, data.is_active, id]);
      }
      save();
      return { success: true };
    }, 'staff:update');
  });

  ipcMain.handle('staff:delete', (_event, id: number) => {
    return dbCall(() => {
      execute('DELETE FROM staff WHERE id = ?', [id]);
      save();
      return { success: true };
    }, 'staff:delete');
  });

  // Settings
  ipcMain.handle('settings:get', (_event, key: string) => {
    return dbCall(() => {
      const row = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
      return row ? row.value : null;
    }, 'settings:get');
  });

  ipcMain.handle('settings:set', (_event, { key, value }) => {
    return dbCall(() => {
      execute('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [key, String(value)]);
      save();
      return { success: true };
    }, 'settings:set');
  });

  ipcMain.handle('settings:getAll', () => {
    return dbCall(() => {
      const rows = queryAll('SELECT key, value FROM settings');
      const settings: Record<string, string> = {};
      rows.forEach((r: any) => { settings[r.key] = r.value; });
      return settings;
    }, 'settings:getAll');
  });

  // Exams
  ipcMain.handle('exams:list', (_event, group_id: number) => {
    return dbCall(() => queryAll('SELECT * FROM exams WHERE group_id = ? ORDER BY session_number', [group_id]), 'exams:list');
  });

  ipcMain.handle('exams:autoCreate', (_event, { group_id, session_number }) => {
    return dbCall(() => {
      const today = new Date().toISOString().split('T')[0];
      const existing = queryOne('SELECT id FROM exams WHERE group_id = ? AND session_number = ?', [group_id, session_number]);
      if (existing) return { id: existing.id };
      execute('INSERT INTO exams (group_id, session_number, exam_date, max_score) VALUES (?, ?, ?, ?)', [group_id, session_number, today, 100]);
      const id = getLastInsertId();
      save();
      return { id };
    }, 'exams:autoCreate');
  });

  ipcMain.handle('exams:scores', (_event, exam_id: number) => {
    return dbCall(() => queryAll(
      `SELECT es.*, s.full_name, s.student_id, s.phone FROM exam_scores es JOIN students s ON es.student_id = s.id WHERE es.exam_id = ? ORDER BY s.full_name`,
      [exam_id]
    ), 'exams:scores');
  });

  ipcMain.handle('exams:saveScore', (_event, { exam_id, student_id, score, notes }) => {
    return dbCall(() => {
      const existing = queryOne('SELECT id FROM exam_scores WHERE exam_id = ? AND student_id = ?', [exam_id, student_id]);
      if (existing) {
        execute('UPDATE exam_scores SET score = ?, notes = ? WHERE id = ?', [score, notes || '', existing.id]);
      } else {
        execute('INSERT INTO exam_scores (exam_id, student_id, score, notes) VALUES (?, ?, ?, ?)', [exam_id, student_id, score, notes || '']);
      }
      save();
      return { success: true };
    }, 'exams:saveScore');
  });

  ipcMain.handle('exams:topStudents', (_event, grade_id: number, limit: number = 10) => {
    return dbCall(() => queryAll(
      `SELECT s.id, s.full_name, s.student_id, s.phone, g.name as grade_name,
       ROUND(AVG(es.score), 1) as avg_score, COUNT(es.id) as exams_taken
       FROM students s JOIN exam_scores es ON s.id = es.student_id
       JOIN exams e ON es.exam_id = e.id JOIN grades g ON s.grade_id = g.id
       WHERE s.grade_id = ? AND s.is_active = 1
       GROUP BY s.id ORDER BY avg_score DESC LIMIT ?`,
      [grade_id, limit]
    ), 'exams:topStudents');
  });

  ipcMain.handle('exams:allTopStudents', (_event, limit: number = 10) => {
    return dbCall(() => queryAll(
      `SELECT s.id, s.full_name, s.student_id, s.phone, g.name as grade_name,
       ROUND(AVG(es.score), 1) as avg_score, COUNT(es.id) as exams_taken
       FROM students s JOIN exam_scores es ON s.id = es.student_id
       JOIN exams e ON es.exam_id = e.id JOIN grades g ON s.grade_id = g.id
       WHERE s.is_active = 1 GROUP BY s.id ORDER BY avg_score DESC LIMIT ?`,
      [limit]
    ), 'exams:allTopStudents');
  });

  // Reports
  ipcMain.handle('reports:dailyAbsentees', (_event, date?: string) => {
    return dbCall(() => {
      const targetDate = date || new Date().toISOString().split('T')[0];
      return queryAll(
        `SELECT s.full_name, s.student_id, s.phone, s.parent_phone, g.name as grade_name, gr.name as group_name
         FROM students s LEFT JOIN grades g ON s.grade_id = g.id LEFT JOIN groups_tbl gr ON s.group_id = gr.id
         WHERE s.is_active = 1 AND s.group_id IS NOT NULL AND s.id NOT IN (SELECT student_id FROM attendance WHERE session_date = ?)
         ORDER BY gr.name, s.full_name`,
        [targetDate]
      );
    }, 'reports:dailyAbsentees');
  });

  ipcMain.handle('reports:nearlyFinished', (_event, threshold?: number) => {
    return dbCall(() => {
      const t = threshold || 2;
      return queryAll(
        `SELECT s.*, g.name as grade_name, gr.name as group_name, (s.total_sessions - s.sessions_attended) as remaining
         FROM students s LEFT JOIN grades g ON s.grade_id = g.id LEFT JOIN groups_tbl gr ON s.group_id = gr.id
         WHERE s.is_active = 1 AND (s.total_sessions - s.sessions_attended) <= ? ORDER BY remaining ASC LIMIT 50`,
        [t]
      );
    }, 'reports:nearlyFinished');
  });

  ipcMain.handle('reports:unpaidStudents', () => {
    return dbCall(() => queryAll(
      `SELECT s.*, g.name as grade_name, gr.name as group_name, g.price
       FROM students s LEFT JOIN grades g ON s.grade_id = g.id LEFT JOIN groups_tbl gr ON s.group_id = gr.id
       WHERE s.payment_status IN ('unpaid','partial') AND s.is_active = 1 ORDER BY s.payment_status, s.full_name LIMIT 100`
    ), 'reports:unpaidStudents');
  });

  // Backup / Restore
  ipcMain.handle('backup:create', async () => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: `educenter-backup-${Date.now()}.db`,
      filters: [{ name: 'Database', extensions: ['db'] }],
    });
    if (!result.canceled && result.filePath) {
      backupDatabase(result.filePath);
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  ipcMain.handle('backup:restore', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      filters: [{ name: 'Database', extensions: ['db'] }],
      properties: ['openFile'],
    });
    if (!result.canceled && result.filePaths[0]) {
      restoreDatabase(result.filePaths[0]);
      return { success: true };
    }
    return { success: false };
  });

  // Branches
  ipcMain.handle('branches:list', () => dbCall(() => queryAll('SELECT * FROM branches ORDER BY name'), 'branches:list'));

  ipcMain.handle('branches:create', (_event, data) => {
    return dbCall(() => {
      execute('INSERT INTO branches (name, address, phone) VALUES (?, ?, ?)', [data.name, data.address || '', data.phone || '']);
      const id = getLastInsertId();
      logActivity('create_branch', `إضافة فرع: ${data.name}`);
      save();
      return { id, success: true };
    }, 'branches:create');
  });

  ipcMain.handle('branches:update', (_event, { id, data }) => {
    return dbCall(() => {
      execute('UPDATE branches SET name=?, address=?, phone=?, is_active=? WHERE id=?', [data.name, data.address, data.phone, data.is_active, id]);
      save();
      return { success: true };
    }, 'branches:update');
  });

  ipcMain.handle('branches:delete', (_event, id: number) => {
    return dbCall(() => {
      execute('DELETE FROM branches WHERE id = ?', [id]);
      save();
      return { success: true };
    }, 'branches:delete');
  });

  // Activity Log
  ipcMain.handle('activity:list', (_event, limit: number = 50) => {
    return dbCall(() => queryAll('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?', [limit]), 'activity:list');
  });

  ipcMain.handle('activity:log', (_event, { action, description }) => {
    return dbCall(() => {
      logActivity(action, description);
      save();
      return { success: true };
    }, 'activity:log');
  });

  // Teachers
  ipcMain.handle('teachers:list', () => dbCall(() => queryAll('SELECT * FROM teachers ORDER BY full_name'), 'teachers:list'));

  ipcMain.handle('teachers:create', (_event, data) => {
    return dbCall(() => {
      execute('INSERT INTO teachers (full_name, phone, email, subject, salary, hire_date) VALUES (?, ?, ?, ?, ?, ?)',
        [data.full_name, data.phone, data.email || '', data.subject || '', data.salary || 0, data.hire_date || '']);
      const id = getLastInsertId();
      logActivity('create_teacher', `تم إضافة مدرس: ${data.full_name}`);
      save();
      return { id, success: true };
    }, 'teachers:create');
  });

  ipcMain.handle('teachers:update', (_event, { id, data }) => {
    return dbCall(() => {
      execute('UPDATE teachers SET full_name=?, phone=?, email=?, subject=?, salary=?, is_active=? WHERE id=?',
        [data.full_name, data.phone, data.email, data.subject, data.salary, data.is_active, id]);
      save();
      return { success: true };
    }, 'teachers:update');
  });

  ipcMain.handle('teachers:delete', (_event, id: number) => {
    return dbCall(() => {
      execute('DELETE FROM teachers WHERE id = ?', [id]);
      save();
      return { success: true };
    }, 'teachers:delete');
  });

  // Teacher Attendance
  ipcMain.handle('teacherAttendance:today', () => {
    return dbCall(() => {
      const today = new Date().toISOString().split('T')[0];
      return queryAll(
        `SELECT ta.*, t.full_name as teacher_name FROM teacher_attendance ta JOIN teachers t ON ta.teacher_id = t.id WHERE ta.date = ? ORDER BY ta.check_in`,
        [today]
      );
    }, 'teacherAttendance:today');
  });

  ipcMain.handle('teacherAttendance:checkIn', (_event, teacher_id: number) => {
    return dbCall(() => {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const existing = queryOne('SELECT id FROM teacher_attendance WHERE teacher_id = ? AND date = ?', [teacher_id, today]);
      if (existing) {
        execute('UPDATE teacher_attendance SET check_out = ? WHERE id = ?', [now, existing.id]);
      } else {
        execute('INSERT INTO teacher_attendance (teacher_id, date, check_in, status) VALUES (?, ?, ?, ?)', [teacher_id, today, now, 'present']);
      }
      logActivity('teacher_attendance', `تسجيل حضور/انصراف مدرس`);
      save();
      return { success: true };
    }, 'teacherAttendance:checkIn');
  });

  // Teacher Evaluations
  ipcMain.handle('teacherEval:list', (_event, teacher_id: number) => {
    return dbCall(() => queryAll('SELECT te.*, s.full_name as student_name FROM teacher_evaluations te LEFT JOIN students s ON te.student_id = s.id WHERE te.teacher_id = ? ORDER BY te.created_at DESC', [teacher_id]), 'teacherEval:list');
  });

  ipcMain.handle('teacherEval:add', (_event, { teacher_id, rating, comment }) => {
    return dbCall(() => {
      execute('INSERT INTO teacher_evaluations (teacher_id, rating, comment) VALUES (?, ?, ?)', [teacher_id, rating, comment || '']);
      logActivity('teacher_eval', `تم تقييم مدرس`);
      save();
      return { success: true };
    }, 'teacherEval:add');
  });

  // Waiting List
  ipcMain.handle('waiting:list', () => {
    return dbCall(() => queryAll(
      `SELECT w.*, g.name as grade_name FROM waiting_list w LEFT JOIN grades g ON w.grade_id = g.id ORDER BY w.priority DESC, w.created_at ASC`
    ), 'waiting:list');
  });

  ipcMain.handle('waiting:add', (_event, data) => {
    return dbCall(() => {
      execute('INSERT INTO waiting_list (full_name, phone, parent_phone, grade_id, notes, priority) VALUES (?, ?, ?, ?, ?, ?)',
        [data.full_name, data.phone, data.parent_phone || '', data.grade_id || null, data.notes || '', data.priority || 0]);
      const id = getLastInsertId();
      logActivity('waiting_add', `إضافة طالب لقائمة الانتظار: ${data.full_name}`);
      save();
      return { id, success: true };
    }, 'waiting:add');
  });

  ipcMain.handle('waiting:update', (_event, { id, data }) => {
    return dbCall(() => {
      execute('UPDATE waiting_list SET full_name=?, phone=?, parent_phone=?, grade_id=?, notes=?, status=?, priority=? WHERE id=?',
        [data.full_name, data.phone, data.parent_phone, data.grade_id, data.notes, data.status, data.priority, id]);
      save();
      return { success: true };
    }, 'waiting:update');
  });

  ipcMain.handle('waiting:delete', (_event, id: number) => {
    return dbCall(() => {
      execute('DELETE FROM waiting_list WHERE id = ?', [id]);
      save();
      return { success: true };
    }, 'waiting:delete');
  });

  ipcMain.handle('waiting:convert', (_event, { id, grade_id, group_id }) => {
    return dbCall(() => {
      const w = queryOne('SELECT * FROM waiting_list WHERE id = ?', [id]);
      if (!w) return { success: false, error: 'not_found' };
      const studentId = `STU-${String(Date.now()).slice(-6)}`;
      const barcode = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
      execute(
        `INSERT INTO students (student_id, full_name, phone, parent_phone, grade_id, group_id, total_sessions, barcode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentId, w.full_name, w.phone, w.parent_phone || '', grade_id || w.grade_id, group_id || null, 12, barcode]
      );
      execute("UPDATE waiting_list SET status = 'converted' WHERE id = ?", [id]);
      logActivity('waiting_convert', `تحويل طالب من قائمة الانتظار: ${w.full_name}`);
      save();
      return { success: true, student_id: studentId };
    }, 'waiting:convert');
  });

  // Installments
  ipcMain.handle('installments:list', (_event, student_id?: number) => {
    return dbCall(() => {
      if (student_id) {
        return queryAll('SELECT * FROM installments WHERE student_id = ? ORDER BY created_at DESC', [student_id]);
      }
      return queryAll(
        `SELECT i.*, s.full_name as student_name FROM installments i JOIN students s ON i.student_id = s.id ORDER BY i.created_at DESC LIMIT 50`
      );
    }, 'installments:list');
  });

  ipcMain.handle('installments:create', (_event, { student_id, total_amount, installment_count, start_date }) => {
    return dbCall(() => {
      const perInstallment = total_amount / installment_count;
      execute('INSERT INTO installments (student_id, total_amount, installment_count, per_installment, start_date) VALUES (?, ?, ?, ?, ?)',
        [student_id, total_amount, installment_count, perInstallment, start_date || new Date().toISOString().split('T')[0]]);
      const installmentId = getLastInsertId();
      for (let i = 1; i <= installment_count; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        execute('INSERT INTO installment_payments (installment_id, amount, due_date) VALUES (?, ?, ?)',
          [installmentId, perInstallment, dueDate.toISOString().split('T')[0]]);
      }
      logActivity('installment_create', `إنشاء نظام أقساط`);
      save();
      return { success: true, id: installmentId };
    }, 'installments:create');
  });

  ipcMain.handle('installments:pay', (_event, { payment_id, amount }) => {
    return dbCall(() => {
      const today = new Date().toISOString().split('T')[0];
      execute('UPDATE installment_payments SET status = ?, paid_date = ? WHERE id = ?', ['paid', today, payment_id]);
      const ip = queryOne('SELECT installment_id, amount FROM installment_payments WHERE id = ?', [payment_id]);
      if (ip) {
        execute('UPDATE installments SET paid_amount = paid_amount + ? WHERE id = ?', [amount || ip.amount, ip.installment_id]);
        const inst = queryOne('SELECT total_amount, paid_amount FROM installments WHERE id = ?', [ip.installment_id]);
        if (inst && inst.paid_amount >= inst.total_amount) {
          execute("UPDATE installments SET status = 'completed' WHERE id = ?", [ip.installment_id]);
        }
      }
      logActivity('installment_pay', `دفع قسط`);
      save();
      return { success: true };
    }, 'installments:pay');
  });

  // Messages
  ipcMain.handle('messages:list', () => {
    return dbCall(() => queryAll(
      `SELECT m.*, s.full_name as student_name, s.phone as student_phone FROM messages m LEFT JOIN students s ON m.student_id = s.id ORDER BY m.created_at DESC LIMIT 100`
    ), 'messages:list');
  });

  ipcMain.handle('messages:create', (_event, { student_id, type, template, message_text }) => {
    return dbCall(() => {
      execute('INSERT INTO messages (student_id, type, template, message_text, status) VALUES (?, ?, ?, ?, ?)',
        [student_id || null, type || 'whatsapp', template || '', message_text, 'pending']);
      logActivity('message_create', `إنشاء رسالة`);
      save();
      return { success: true };
    }, 'messages:create');
  });

  ipcMain.handle('messages:send', async (_event, id: number) => {
    const msg = queryOne('SELECT m.*, s.phone as student_phone FROM messages m LEFT JOIN students s ON m.student_id = s.id WHERE m.id = ?', [id]);
    if (!msg) return { success: false, error: 'not_found' };
    execute("UPDATE messages SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
    logActivity('message_send', `إرسال رسالة`);
    save();
    return { success: true };
  });

  ipcMain.handle('messages:templates', () => {
    return [
      { id: 'attendance', name: 'تأكيد الحضور', text: 'مرحباً {name}، تم تسجيل حضورك في {center} بتاريخ {date}' },
      { id: 'absence', name: 'إشعار غياب', text: 'عزيزي ولي الأمر، لم يحضر الطالب {name} اليوم {date} في {center}. يرجى التواصل معنا.' },
      { id: 'payment', name: 'تذكير بالدفع', text: 'عزيزي ولي الأمر، تذكير بدفع رسوم {name} المستحقة بقيمة {amount} ج.م' },
      { id: 'result', name: 'نتيجة الامتحان', text: 'نتيجة امتحان {name}: {score} من {max}' },
      { id: 'achievement', name: 'تفوق دراسي', text: 'نهنئ ولي أمر {name} على تفوق الطالب وحصوله على {score}% في الامتحان' },
    ];
  });

  // Receipts
  ipcMain.handle('receipts:list', (_event, student_id?: number) => {
    return dbCall(() => {
      if (student_id) {
        return queryAll('SELECT * FROM receipts WHERE student_id = ? ORDER BY created_at DESC', [student_id]);
      }
      return queryAll(
        `SELECT r.*, s.full_name as student_name FROM receipts r JOIN students s ON r.student_id = s.id ORDER BY r.created_at DESC LIMIT 50`
      );
    }, 'receipts:list');
  });

  ipcMain.handle('receipts:create', (_event, { student_id, amount, payment_type, notes }) => {
    return dbCall(() => {
      const rnum = `RCP-${String(Date.now()).slice(-8)}`;
      execute('INSERT INTO receipts (receipt_number, student_id, amount, payment_type, notes) VALUES (?, ?, ?, ?, ?)',
        [rnum, student_id, amount, payment_type || 'partial', notes || '']);
      const id = getLastInsertId();
      logActivity('receipt_create', `إنشاء إيصال رقم ${rnum}`);
      save();
      return { id, receipt_number: rnum, success: true };
    }, 'receipts:create');
  });

  ipcMain.handle('receipts:print', (_event, id: number) => {
    return dbCall(() => queryOne(
      `SELECT r.*, s.full_name as student_name, s.student_id as sid FROM receipts r JOIN students s ON r.student_id = s.id WHERE r.id = ?`,
      [id]
    ), 'receipts:print');
  });

  // Session Compensation
  ipcMain.handle('compensation:list', (_event, student_id?: number) => {
    return dbCall(() => {
      if (student_id) {
        return queryAll('SELECT * FROM session_compensation WHERE student_id = ? ORDER BY created_at DESC', [student_id]);
      }
      return queryAll(
        `SELECT sc.*, s.full_name as student_name FROM session_compensation sc JOIN students s ON sc.student_id = s.id ORDER BY sc.created_at DESC LIMIT 50`
      );
    }, 'compensation:list');
  });

  ipcMain.handle('compensation:create', (_event, { student_id, original_date, compensation_date, notes }) => {
    return dbCall(() => {
      execute('INSERT INTO session_compensation (student_id, original_date, compensation_date, notes) VALUES (?, ?, ?, ?)',
        [student_id, original_date, compensation_date || '', notes || '']);
      logActivity('compensation_create', `تعويض حصة`);
      save();
      return { success: true };
    }, 'compensation:create');
  });

  ipcMain.handle('compensation:complete', (_event, id: number) => {
    return dbCall(() => {
      execute("UPDATE session_compensation SET status = 'completed' WHERE id = ?", [id]);
      save();
      return { success: true };
    }, 'compensation:complete');
  });

  // Analytics
  ipcMain.handle('analytics:attendance', (_event, { group_id, days = 30 }) => {
    return dbCall(() => {
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const present = (queryOne('SELECT COUNT(*) as count FROM attendance WHERE group_id = ? AND session_date = ?', [group_id, dateStr]) || { count: 0 }).count;
        const total = (queryOne('SELECT COUNT(*) as count FROM students WHERE group_id = ? AND is_active = 1', [group_id]) || { count: 0 }).count;
        data.push({ date: dateStr, present, absent: Math.max(0, total - present), total });
      }
      return data;
    }, 'analytics:attendance');
  });

  ipcMain.handle('analytics:revenue', (_event, months = 12) => {
    return dbCall(() => {
      const data = [];
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const month = d.toISOString().slice(0, 7);
        const revenue = (queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE strftime('%Y-%m', created_at) = ?", [month]) || { total: 0 }).total;
        data.push({ month, revenue });
      }
      return data;
    }, 'analytics:revenue');
  });

  ipcMain.handle('data:clear', (_event, tableName: string) => {
    return dbCall(() => {
      clearTable(tableName);
      logActivity('clear_data', `مسح بيانات جدول: ${tableName}`);
      return { success: true };
    }, 'data:clear');
  });

  // Dashboard
  ipcMain.handle('dashboard:stats', () => dbCall(() => getStats(), 'dashboard:stats'));
}
