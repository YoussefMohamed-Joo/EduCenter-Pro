import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: SqlJsDatabase;

export async function initDatabase(): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => {
      const isPackaged = app.isPackaged;
      if (isPackaged) {
        return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', file);
      }
      return path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file);
    },
  });
  const dbPath = path.join(app.getPath('userData'), 'educenter-pro.db');

  let buffer: Buffer | null = null;
  try {
    if (fs.existsSync(dbPath)) {
      buffer = fs.readFileSync(dbPath);
    }
  } catch {}

  db = new SQL.Database(buffer);

  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA cache_size = -8000');
  db.run('PRAGMA synchronous = NORMAL');
  db.run('PRAGMA temp_store = MEMORY');

  createTables();
  createIndexes();
  seedInitialData();
  saveDatabase(dbPath);
}

function saveDatabase(dbPath?: string): void {
  try {
    const data = db.export();
    const filePath = dbPath || path.join(app.getPath('userData'), 'educenter-pro.db');
    fs.writeFileSync(filePath, Buffer.from(data));
  } catch {}
}

function createTables(): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL DEFAULT 0,
      session_count INTEGER NOT NULL DEFAULT 12,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS groups_tbl (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      grade_id INTEGER NOT NULL,
      days TEXT NOT NULL DEFAULT '',
      time TEXT NOT NULL DEFAULT '',
      max_students INTEGER DEFAULT 30,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      parent_phone TEXT NOT NULL DEFAULT '',
      grade_id INTEGER,
      group_id INTEGER,
      sessions_attended INTEGER NOT NULL DEFAULT 0,
      total_sessions INTEGER NOT NULL DEFAULT 12,
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      amount_paid REAL NOT NULL DEFAULT 0,
      barcode TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL,
      FOREIGN KEY (group_id) REFERENCES groups_tbl(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      group_id INTEGER NOT NULL,
      session_date TEXT NOT NULL,
      session_number INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'present',
      marked_by TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES groups_tbl(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL DEFAULT 'partial',
      notes TEXT DEFAULT '',
      for_month TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);
  try { db.run("ALTER TABLE payments ADD COLUMN for_month TEXT DEFAULT ''"); } catch {}
  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff',
      permissions TEXT NOT NULL DEFAULT 'attendance_only',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS backup_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      size_bytes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      session_number INTEGER NOT NULL DEFAULT 1,
      exam_date TEXT NOT NULL,
      max_score REAL NOT NULL DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups_tbl(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS exam_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      student_id INTEGER NOT NULL,
      score REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      user_name TEXT DEFAULT 'system',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      email TEXT DEFAULT '',
      subject TEXT DEFAULT '',
      salary REAL DEFAULT 0,
      hire_date TEXT DEFAULT '',
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS teacher_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      check_in TEXT DEFAULT '',
      check_out TEXT DEFAULT '',
      status TEXT DEFAULT 'present',
      notes TEXT DEFAULT '',
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS teacher_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      teacher_id INTEGER NOT NULL,
      student_id INTEGER,
      rating INTEGER DEFAULT 5,
      comment TEXT DEFAULT '',
      evaluator TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS waiting_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      parent_phone TEXT DEFAULT '',
      grade_id INTEGER,
      notes TEXT DEFAULT '',
      status TEXT DEFAULT 'waiting',
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS installments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      installment_count INTEGER DEFAULT 4,
      per_installment REAL DEFAULT 0,
      start_date TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS installment_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      installment_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT DEFAULT '',
      paid_date TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (installment_id) REFERENCES installments(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      teacher_id INTEGER,
      type TEXT DEFAULT 'whatsapp',
      template TEXT DEFAULT '',
      message_text TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT NOT NULL UNIQUE,
      student_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_type TEXT DEFAULT 'partial',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS session_compensation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      original_date TEXT NOT NULL,
      compensation_date TEXT,
      status TEXT DEFAULT 'pending',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    )
  `);
}

function createIndexes(): void {
  db.run('CREATE INDEX IF NOT EXISTS idx_students_name ON students(full_name)');
  db.run('CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone)');
  db.run('CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_students_barcode ON students(barcode)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_group ON attendance(group_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(session_date)');
  db.run('CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_groups_grade ON groups_tbl(grade_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_exams_group ON exams(group_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_exam_scores_exam ON exam_scores(exam_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_exam_scores_student ON exam_scores(student_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_activity_log_date ON activity_log(created_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_teachers_active ON teachers(is_active)');
  db.run('CREATE INDEX IF NOT EXISTS idx_waiting_status ON waiting_list(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_installments_student ON installments(student_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status)');
  db.run('CREATE INDEX IF NOT EXISTS idx_receipts_student ON receipts(student_id)');
}

function seedInitialData(): void {
  const result = db.exec("SELECT id FROM staff WHERE username = 'admin'");
  if (result.length === 0 || result[0].values.length === 0) {
    db.run("INSERT INTO staff (username, password, full_name, role, permissions) VALUES (?, ?, ?, ?, ?)", ['admin', 'admin123', 'System Admin', 'admin', 'full_access']);
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['theme', 'dark']);
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", ['sound_enabled', 'true']);
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['payment_mode', 'session']);
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['academic_year', '2025-2026']);
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", ['ai_api_key', '']);
    db.run("INSERT INTO grades (name, price, session_count) VALUES (?, ?, ?)", ['الصف الأول', 250, 12]);
    db.run("INSERT INTO grades (name, price, session_count) VALUES (?, ?, ?)", ['الصف الثاني', 350, 12]);
    db.run("INSERT INTO grades (name, price, session_count) VALUES (?, ?, ?)", ['الصف الثالث', 400, 16]);
  }
}

function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function execute(sql: string, params: any[] = []): void {
  if (params.length > 0) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
  } else {
    db.run(sql);
  }
}

export function logActivity(action: string, description: string, userName: string = 'admin'): void {
  try {
    execute('INSERT INTO activity_log (action, description, user_name) VALUES (?, ?, ?)', [action, description, userName]);
  } catch {}
}

function getLastInsertId(): number {
  const result = db.exec('SELECT last_insert_rowid() as id');
  if (result.length > 0 && result[0].values.length > 0) {
    return Number(result[0].values[0][0]);
  }
  return 0;
}

export function getDb(): { queryAll: typeof queryAll; queryOne: typeof queryOne; execute: typeof execute; getLastInsertId: typeof getLastInsertId; logActivity: typeof logActivity; db: SqlJsDatabase; save: () => void } {
  return { queryAll, queryOne, execute, getLastInsertId, logActivity, db, save: () => saveDatabase() };
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
  }
}

export function backupDatabase(backupPath: string): void {
  const data = db.export();
  fs.writeFileSync(backupPath, Buffer.from(data));
  const stats = fs.statSync(backupPath);
  execute('INSERT INTO backup_log (file_path, size_bytes) VALUES (?, ?)', [backupPath, stats.size]);
  saveDatabase();
}

export function restoreDatabase(restorePath: string): void {
  const buffer = fs.readFileSync(restorePath);
  db.close();
  const SQL = (require('sql.js') as any).default;
  db = new SQL.Database(new Uint8Array(buffer));
  saveDatabase();
}

export function getStats() {
  const totalStudents = (queryOne("SELECT COUNT(*) as count FROM students WHERE is_active = 1") || { count: 0 }).count;
  const presentToday = (queryOne("SELECT COUNT(*) as count FROM attendance WHERE session_date = date('now')") || { count: 0 }).count;
  const unpaidStudents = (queryOne("SELECT COUNT(*) as count FROM students WHERE payment_status = 'unpaid' AND is_active = 1") || { count: 0 }).count;
  const activeGroups = (queryOne('SELECT COUNT(*) as count FROM groups_tbl') || { count: 0 }).count;
  const totalRevenue = (queryOne('SELECT COALESCE(SUM(amount), 0) as total FROM payments') || { total: 0 }).total;
  const recentActivity = queryAll(`
    SELECT a.id, s.full_name, a.session_date, a.status, g.name as group_name
    FROM attendance a
    JOIN students s ON a.student_id = s.id
    JOIN groups_tbl g ON a.group_id = g.id
    ORDER BY a.created_at DESC LIMIT 10
  `);
  const totalExams = (queryOne('SELECT COUNT(*) as count FROM exams') || { count: 0 }).count;
  const totalTeachers = (queryOne('SELECT COUNT(*) as count FROM teachers WHERE is_active = 1') || { count: 0 }).count;
  const waitingCount = (queryOne("SELECT COUNT(*) as count FROM waiting_list WHERE status = 'waiting'") || { count: 0 }).count;
  const totalReceipts = (queryOne('SELECT COUNT(*) as count FROM receipts') || { count: 0 }).count;
  const totalMessages = (queryOne("SELECT COUNT(*) as count FROM messages") || { count: 0 }).count;

  return { totalStudents, presentToday, unpaidStudents, activeGroups, totalRevenue, totalExams, totalTeachers, waitingCount, totalReceipts, totalMessages, recentActivity };
}

export function clearTable(tableName: string): void {
  const allowedTables = ['students', 'teachers', 'groups_tbl', 'grades', 'attendance', 'payments', 'exams', 'exam_scores', 'staff', 'messages', 'receipts', 'installments', 'installment_payments', 'waiting_list', 'activity_log', 'teacher_attendance', 'teacher_evaluations', 'session_compensation', 'branches'];
  if (allowedTables.includes(tableName)) {
    db.run(`DELETE FROM ${tableName}`);
    saveDatabase();
  }
}
