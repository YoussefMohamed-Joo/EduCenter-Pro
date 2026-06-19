import { BrowserWindow } from 'electron';
import crypto from 'crypto';
import { getDb } from './database';
import { askGemini } from './ai';

type ActionHandler = (params: any) => Promise<any>;

interface AgentAction {
  intent: string;
  handler: ActionHandler;
  description: string;
  requiredParams: string[];
}

const actions: AgentAction[] = [];

export function registerAction(intent: string, handler: ActionHandler, description: string, requiredParams: string[] = []): void {
  actions.push({ intent, handler, description, requiredParams });
}

export function getRegisteredActions(): AgentAction[] {
  return actions;
}

export async function executeAction(intent: string, params: any = {}): Promise<{ success: boolean; result?: any; error?: string }> {
  const action = actions.find(a => a.intent === intent);
  if (!action) return { success: false, error: `الإجراء "${intent}" غير معروف` };
  try {
    const result = await action.handler(params);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function parseAndExecute(text: string): Promise<{ success: boolean; result?: any; error?: string; action?: string }> {
  const db = getDb();
  const { queryAll, queryOne, execute } = db;

  const lower = text.toLowerCase();

  // --- Student management ---
  if (lower.includes('أضف') && (lower.includes('طالب') || lower.includes('طالبة'))) {
    const nameMatch = text.match(/(?:طالب|طالبة)\s+(\S+)/);
    const phoneMatch = text.match(/تليفون\s*(\d+)/) || text.match(/موبايل\s*(\d+)/) || text.match(/رقم\s*(\d+)/);
    if (!nameMatch) return { success: false, error: 'لم أجد اسم الطالب. مثال: أضف طالب محمد تليفون 01033448125', action: 'createStudent' };
    const name = nameMatch[1];
    const phone = phoneMatch ? phoneMatch[1] : '';
    const studentId = `STU-${String(Date.now()).slice(-6)}`;
    const barcode = crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
    execute(
      `INSERT INTO students (student_id, full_name, phone, total_sessions, barcode) VALUES (?, ?, ?, ?, ?)`,
      [studentId, name, phone, 12, barcode]
    );
    const id = queryOne('SELECT last_insert_rowid() as id')?.id || 0;
    save();
    logActivity('agent_add_student', `إضافة طالب بواسطة المساعد الذكي: ${name}`);
    return { success: true, result: `✅ تم إضافة الطالب ${name} برقم ${studentId}`, action: 'createStudent' };
  }

  // --- Attendance ---
  if ((lower.includes('سجل') || lower.includes('حضور')) && lower.includes('حضور')) {
    const nameMatch = text.match(/(?:حضور|سجل)\s+(\S+)/);
    if (!nameMatch) return { success: false, error: 'لم أجد اسم الطالب', action: 'markAttendance' };
    const name = nameMatch[1];
    const student = queryOne('SELECT id, group_id FROM students WHERE full_name LIKE ? LIMIT 1', [`%${name}%`]);
    if (!student) return { success: false, error: `لم أجد طالباً باسم ${name}`, action: 'markAttendance' };
    if (!student.group_id) return { success: false, error: 'الطالب ليس له مجموعة', action: 'markAttendance' };
    const today = new Date().toISOString().split('T')[0];
    const groupId = student.group_id;
    const sessionCount = (queryOne("SELECT COALESCE(MAX(session_number), 0) as cnt FROM attendance WHERE group_id = ? AND session_date = ?", [groupId, today])?.cnt || 0) + 1;
    execute('INSERT INTO attendance (student_id, group_id, session_date, session_number) VALUES (?, ?, ?, ?)', [student.id, groupId, today, sessionCount]);
    save();
    logActivity('agent_attendance', `تسجيل حضور بواسطة المساعد الذكي: ${name}`);
    return { success: true, result: `✅ تم تسجيل حضور ${name}`, action: 'markAttendance' };
  }

  // --- Payment ---
  if ((lower.includes('دفعة') || lower.includes('دفع') || lower.includes('فلوس')) && lower.includes('لـ')) {
    const amountMatch = text.match(/(\d+)\s*(?:جنيه|جنية|ج\.م|جنبة)/);
    const nameMatch = text.match(/لـ\s*(\S+)/);
    if (!amountMatch) return { success: false, error: 'لم أجد المبلغ. مثال: دفعة لـ أحمد 200 جنيه', action: 'addPayment' };
    if (!nameMatch) return { success: false, error: 'لم أجد اسم الطالب', action: 'addPayment' };
    const amount = parseInt(amountMatch[1]);
    const name = nameMatch[1];
    const student = queryOne('SELECT id, grade_id FROM students WHERE full_name LIKE ? LIMIT 1', [`%${name}%`]);
    if (!student) return { success: false, error: `لم أجد طالباً باسم ${name}`, action: 'addPayment' };
    const mode = queryOne("SELECT value FROM settings WHERE key = 'payment_mode'")?.value || 'session';
    execute('INSERT INTO payments (student_id, amount, payment_type, notes) VALUES (?, ?, ?, ?)', [student.id, amount, 'partial', 'مدفوع عن طريق المساعد الذكي']);
    const studentInfo = queryOne('SELECT amount_paid FROM students WHERE id = ?', [student.id]);
    const newAmountPaid = (studentInfo?.amount_paid || 0) + amount;
    const grade = queryOne('SELECT price FROM grades WHERE id = ?', [student.grade_id]);
    const gradePrice = grade?.price || 0;
    const fullPrice = mode === 'session' ? gradePrice * 12 : gradePrice;
    const status = newAmountPaid >= fullPrice ? 'paid' : 'partial';
    execute('UPDATE students SET amount_paid = ?, payment_status = ? WHERE id = ?', [newAmountPaid, status, student.id]);
    save();
    logActivity('agent_payment', `إضافة دفعة ${amount} للطالب ${name} بواسطة المساعد الذكي`);
    return { success: true, result: `✅ تم إضافة دفعة ${amount} جنيه لـ ${name}`, action: 'addPayment' };
  }

  // --- Report / Analytics queries ---
  if (lower.includes('كم') || lower.includes('تقرير') || lower.includes('وريني') || lower.includes('ديني') || lower.includes('عدد')) {
    if (lower.includes('غير مسدد') || lower.includes('مدفعوش') || lower.includes('متأخر')) {
      const unpaid = queryAll("SELECT COUNT(*) as cnt FROM students WHERE payment_status IN ('unpaid','partial') AND is_active = 1");
      return { success: true, result: `📋 عدد الطلاب غير المسددين: ${unpaid[0]?.cnt || 0}`, action: 'queryReport' };
    }
    if (lower.includes('حضور') || lower.includes('موجود') || lower.includes('النهارده') || lower.includes('اليوم')) {
      const today = new Date().toISOString().split('T')[0];
      const count = queryOne("SELECT COUNT(*) as cnt FROM attendance WHERE session_date = ?", [today])?.cnt || 0;
      return { success: true, result: `📋 عدد الحضور اليوم: ${count}`, action: 'queryReport' };
    }
    if (lower.includes('طالب') && (lower.includes('كل') || lower.includes('إجمالي') || lower.includes('مجموع'))) {
      const count = queryOne("SELECT COUNT(*) as cnt FROM students WHERE is_active = 1")?.cnt || 0;
      return { success: true, result: `📋 إجمالي الطلاب النشطين: ${count}`, action: 'queryReport' };
    }
    if (lower.includes('ايراد') || lower.includes('إيراد') || lower.includes('دخل')) {
      const total = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payments")?.total || 0;
      return { success: true, result: `💰 إجمالي الإيرادات: ${total} ج.م`, action: 'queryReport' };
    }
    if (lower.includes('مدرس') || lower.includes('معلم')) {
      const count = queryOne("SELECT COUNT(*) as cnt FROM teachers WHERE is_active = 1")?.cnt || 0;
      return { success: true, result: `📋 عدد المدرسين: ${count}`, action: 'queryReport' };
    }
    if (lower.includes('مجموعة') || lower.includes('فصل') || lower.includes('فرقة')) {
      const count = queryOne("SELECT COUNT(*) as cnt FROM groups_tbl")?.cnt || 0;
      return { success: true, result: `📋 عدد المجموعات: ${count}`, action: 'queryReport' };
    }
  }

  // --- Send WhatsApp ---
  if ((lower.includes('ابعت') || lower.includes('أرسل') || lower.includes('رسالة')) && (lower.includes('واتس') || lower.includes('واتساب'))) {
    const nameMatch = text.match(/(?:لـ|إلى|الى)\s*(\S+)/);
    const msgMatch = text.match(/(?:نص|رسالة|مضمون)\s*[""](.+?)[""]/);
    if (!nameMatch) return { success: false, error: 'لم أجد اسم الطالب. مثال: ابعت رسالة واتساب لـ أحمد', action: 'sendWhatsApp' };
    const name = nameMatch[1];
    const student = queryOne('SELECT id, phone FROM students WHERE full_name LIKE ? LIMIT 1', [`%${name}%`]);
    if (!student) return { success: false, error: `لم أجد طالباً باسم ${name}`, action: 'sendWhatsApp' };
    const messageText = msgMatch ? msgMatch[1] : 'رسالة من المركز التعليمي';
    execute('INSERT INTO messages (student_id, type, message_text, status) VALUES (?, ?, ?, ?)', [student.id, 'whatsapp', messageText, 'pending']);
    save();
    logActivity('agent_whatsapp', `إرسال واتساب للطالب ${name} بواسطة المساعد الذكي`);
    return { success: true, result: `✅ تم إنشاء رسالة واتساب لـ ${name}`, action: 'sendWhatsApp' };
  }

  // Fallback: use Gemini to understand
  try {
    const context = buildContext();
    const geminiResponse = await askGemini(
      `المستخدم قال: "${text}". أنت مساعد ذكي لنظام إدارة المراكز التعليمية.
      المطلوب: افهم الأمر ونفذه.
      إذا كان الأمر يتعلق بإضافة طالب أو تسجيل حضور أو إضافة دفعة أو إرسال رسالة أو استعلام عن بيانات — حوله إلى صيغة واضحة.
      إذا لم تفهم — اطلب توضيحاً.
      البيانات المتاحة: ${context}`,
      'agent'
    );
    return { success: true, result: geminiResponse, action: 'gemini' };
  } catch {
    return { success: false, error: 'لم أفهم الأمر. جرب: أضف طالب محمد, سجل حضور أحمد, دفعة لـ أحمد 200, كم عدد الطلاب؟', action: 'unknown' };
  }

  function logActivity(action: string, description: string): void {
    try { execute('INSERT INTO activity_log (action, description, user_name) VALUES (?, ?, ?)', [action, description, 'agent']); } catch {}
  }

  function save(): void {
    try { getDb().save(); } catch {}
  }
}

function buildContext(): string {
  const db = getDb();
  const { queryOne } = db;
  const totalStudents = queryOne("SELECT COUNT(*) as cnt FROM students WHERE is_active = 1")?.cnt || 0;
  const unpaid = queryOne("SELECT COUNT(*) as cnt FROM students WHERE payment_status IN ('unpaid','partial') AND is_active = 1")?.cnt || 0;
  const gradesCount = queryOne("SELECT COUNT(*) as cnt FROM grades")?.cnt || 0;
  const groupsCount = queryOne("SELECT COUNT(*) as cnt FROM groups_tbl")?.cnt || 0;
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = queryOne("SELECT COUNT(*) as cnt FROM attendance WHERE session_date = ?", [today])?.cnt || 0;
  const mode = queryOne("SELECT value FROM settings WHERE key = 'payment_mode'")?.value || 'session';
  const year = queryOne("SELECT value FROM settings WHERE key = 'academic_year'")?.value || '2025-2026';
  return `إجمالي الطلاب: ${totalStudents}, غير المسددين: ${unpaid}, الصفوف: ${gradesCount}, المجموعات: ${groupsCount}, حضور اليوم: ${todayAttendance}, وضع الدفع: ${mode === 'session' ? 'بالحصة' : 'بالشهر'}, السنة: ${year}`;
}

// === MONITORING AGENT ===
let monitorInterval: NodeJS.Timeout | null = null;
let mainWin: BrowserWindow | null = null;
let lastNotification: string[] = [];

export function initAgent(window: BrowserWindow): void {
  mainWin = window;

  // Smart monitoring every 60 seconds
  monitorInterval = setInterval(async () => {
    try {
      await checkAlerts();
    } catch {}
  }, 60000);

  // Also check on startup
  setTimeout(() => checkAlerts(), 5000);
}

export function destroyAgent(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

async function checkAlerts(): Promise<void> {
  if (!mainWin) return;
  const db = getDb();
  const { queryOne, queryAll } = db;
  const today = new Date().toISOString().split('T')[0];
  const alerts: { type: string; message: string; icon: string }[] = [];

  // 1. Check unpaid students
  const unpaid = queryAll("SELECT s.full_name, s.amount_paid, g.price as grade_price, s.total_sessions, s.id FROM students s LEFT JOIN grades g ON s.grade_id = g.id WHERE s.payment_status IN ('unpaid','partial') AND s.is_active = 1 ORDER BY s.amount_paid ASC LIMIT 5");
  if (unpaid.length > 0) {
    const topUnpaid = unpaid[0];
    const mode = queryOne("SELECT value FROM settings WHERE key = 'payment_mode'")?.value || 'session';
    const fullPrice = mode === 'session' ? (topUnpaid.grade_price || 0) * (topUnpaid.total_sessions || 12) : (topUnpaid.grade_price || 0);
    const remaining = Math.max(0, fullPrice - topUnpaid.amount_paid);
    alerts.push({ type: 'unpaid', message: `📋 ${unpaid.length} طالب غير مسدد — أكثرهم ${topUnpaid.full_name} متبقي عليه ${remaining} ج.م`, icon: '💰' });
  }

  // 2. Check attendance today
  const todayAtt = queryOne("SELECT COUNT(*) as cnt FROM attendance WHERE session_date = ?", [today])?.cnt || 0;
  if (todayAtt === 0) {
    alerts.push({ type: 'info', message: '📅 لم يتم تسجيل حضور حتى الآن اليوم', icon: '📅' });
  }

  // 3. Check nearly finished sessions
  const nearly = queryAll("SELECT full_name, total_sessions, sessions_attended FROM students WHERE is_active = 1 AND (total_sessions - sessions_attended) <= 2 AND total_sessions > 0 LIMIT 3");
  if (nearly.length > 0) {
    alerts.push({ type: 'warning', message: `🎯 ${nearly.length} طالب شارفت حصصهم على الانتهاء`, icon: '🎯' });
  }

  // 4. Check waiting list
  const waiting = queryOne("SELECT COUNT(*) as cnt FROM waiting_list WHERE status = 'waiting'")?.cnt || 0;
  if (waiting > 0) {
    alerts.push({ type: 'info', message: `📋 ${waiting} طالب في قائمة الانتظار`, icon: '📋' });
  }

  // Send to renderer if new alerts
  const alertKeys = alerts.map(a => a.type);
  const newAlerts = alerts.filter(a => !lastNotification.includes(a.type));
  if (newAlerts.length > 0 && !mainWin.isDestroyed()) {
    try {
      mainWin.webContents.send('agent:alerts', alerts);
    } catch {}
  }
  lastNotification = alertKeys;
}

// === PREDICTIVE ANALYTICS ===
export function getPredictions(): any {
  const db = getDb();
  const { queryAll, queryOne } = db;

  // Revenue forecast (based on last 3 months)
  const monthlyRevenue = queryAll(`
    SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as total
    FROM payments WHERE created_at >= date('now', '-6 months')
    GROUP BY month ORDER BY month
  `);
  const avgMonthly = monthlyRevenue.length > 0
    ? monthlyRevenue.reduce((sum: number, r: any) => sum + r.total, 0) / monthlyRevenue.length
    : 0;

  // Student growth
  const totalStudents = queryOne("SELECT COUNT(*) as cnt FROM students WHERE is_active = 1")?.cnt || 0;
  const lastMonthStudents = queryOne("SELECT COUNT(*) as cnt FROM students WHERE is_active = 1 AND created_at < date('now', '-1 month')")?.cnt || 0;
  const growth = lastMonthStudents > 0 ? ((totalStudents - lastMonthStudents) / lastMonthStudents) * 100 : 0;

  // Best attendance day
  const dayAttendance = queryAll(`
    SELECT CASE CAST(strftime('%w', session_date) AS INTEGER)
      WHEN 0 THEN 'الأحد' WHEN 1 THEN 'الإثنين' WHEN 2 THEN 'الثلاثاء'
      WHEN 3 THEN 'الأربعاء' WHEN 4 THEN 'الخميس' WHEN 5 THEN 'الجمعة'
      WHEN 6 THEN 'السبت'
    END as day_name, COUNT(*) as cnt
    FROM attendance GROUP BY strftime('%w', session_date) ORDER BY cnt DESC LIMIT 1
  `);

  // Unpaid students count
  const unpaidStudents = queryOne("SELECT COUNT(*) as cnt FROM students WHERE payment_status IN ('unpaid','partial') AND is_active = 1")?.cnt || 0;
  const totalPaid = queryOne("SELECT COALESCE(SUM(amount), 0) as total FROM payments")?.total || 0;

  return {
    forecastedMonthlyRevenue: Math.round(avgMonthly),
    studentGrowth: Math.round(growth * 10) / 10,
    bestDay: dayAttendance[0]?.day_name || '—',
    bestDayCount: dayAttendance[0]?.cnt || 0,
    unpaidStudents,
    totalStudents,
    totalRevenue: totalPaid,
    healthScore: unpaidStudents === 0 ? 100 : Math.max(0, 100 - Math.round((unpaidStudents / Math.max(totalStudents, 1)) * 100)),
  };
}


