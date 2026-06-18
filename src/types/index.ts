export interface Student {
  id: number;
  student_id: string;
  full_name: string;
  phone: string;
  parent_phone: string;
  grade_id: number | null;
  group_id: number | null;
  sessions_attended: number;
  total_sessions: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  amount_paid: number;
  barcode: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  grade_name?: string;
  group_name?: string;
}

export interface Grade {
  id: number;
  name: string;
  price: number;
  session_count: number;
  created_at: string;
}

export interface Group {
  id: number;
  name: string;
  grade_id: number;
  days: string;
  time: string;
  max_students: number;
  created_at: string;
  grade_name?: string;
}

export interface Attendance {
  id: number;
  student_id: number;
  group_id: number;
  session_date: string;
  session_number: number;
  status: string;
  marked_by: string;
  created_at: string;
  full_name?: string;
  student_id_display?: string;
  phone?: string;
  group_name?: string;
}

export interface Payment {
  id: number;
  student_id: number;
  amount: number;
  payment_type: string;
  notes: string;
  created_at: string;
}

export interface Staff {
  id: number;
  username: string;
  full_name: string;
  role: 'admin' | 'staff';
  permissions: string;
  is_active: number;
  created_at: string;
}

export interface Teacher {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  subject: string;
  salary: number;
  hire_date: string;
  is_active: number;
  created_at: string;
}

export interface TeacherAttendance {
  id: number;
  teacher_id: number;
  date: string;
  check_in: string;
  check_out: string;
  status: string;
  notes: string;
  teacher_name?: string;
}

export interface TeacherEvaluation {
  id: number;
  teacher_id: number;
  student_id: number | null;
  rating: number;
  comment: string;
  evaluator: string;
  created_at: string;
  student_name?: string;
}

export interface WaitingEntry {
  id: number;
  full_name: string;
  phone: string;
  parent_phone: string;
  grade_id: number | null;
  notes: string;
  status: 'waiting' | 'converted' | 'cancelled';
  priority: number;
  created_at: string;
  grade_name?: string;
}

export interface Installment {
  id: number;
  student_id: number;
  total_amount: number;
  paid_amount: number;
  installment_count: number;
  per_installment: number;
  start_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  student_name?: string;
}

export interface InstallmentPayment {
  id: number;
  installment_id: number;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'overdue';
}

export interface Message {
  id: number;
  student_id: number | null;
  teacher_id: number | null;
  type: 'whatsapp' | 'sms';
  template: string;
  message_text: string;
  status: 'pending' | 'sent';
  sent_at: string | null;
  created_at: string;
  student_name?: string;
  student_phone?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  text: string;
}

export interface Receipt {
  id: number;
  receipt_number: string;
  student_id: number;
  amount: number;
  payment_type: string;
  notes: string;
  created_at: string;
  student_name?: string;
  sid?: string;
}

export interface CompensationEntry {
  id: number;
  student_id: number;
  original_date: string;
  compensation_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes: string;
  created_at: string;
  student_name?: string;
}

export interface ActivityLogEntry {
  id: number;
  action: string;
  description: string;
  user_name: string;
  created_at: string;
}

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  unpaidStudents: number;
  activeGroups: number;
  totalRevenue: number;
  recentActivity: Activity[];
  totalTeachers: number;
  waitingCount: number;
  totalReceipts: number;
  totalMessages: number;
}

export interface Activity {
  id: number;
  full_name: string;
  session_date: string;
  status: string;
  group_name: string;
}

export interface StudentListResponse {
  students: Student[];
  total: number;
  page: number;
  totalPages: number;
}

export interface SearchResult extends Student {}

declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>;
      maximize: () => Promise<boolean>;
      close: () => Promise<void>;
      isMaximized: () => Promise<boolean>;
      login: (username: string, password: string) => Promise<Staff | null>;
      searchStudents: (query: string) => Promise<Student[]>;
      listStudents: (params: any) => Promise<StudentListResponse>;
      getStudent: (id: number) => Promise<Student>;
      createStudent: (data: any) => Promise<any>;
      updateStudent: (id: number, data: any) => Promise<any>;
      deleteStudent: (id: number) => Promise<any>;
      getStudentsByGroup: (groupId: number) => Promise<Student[]>;
      markAttendance: (studentId: number, groupId: number, sessionNumber: number) => Promise<any>;
      getTodayAttendance: (groupId: number) => Promise<Attendance[]>;
      getAbsentees: (groupId: number) => Promise<Student[]>;
      getSessionCount: (groupId: number) => Promise<number>;
      getAttendanceHistory: (studentId: number) => Promise<Attendance[]>;
      getGrades: () => Promise<Grade[]>;
      createGrade: (data: any) => Promise<any>;
      updateGrade: (id: number, data: any) => Promise<any>;
      deleteGrade: (id: number) => Promise<any>;
      getGroups: (gradeId?: number) => Promise<Group[]>;
      createGroup: (data: any) => Promise<any>;
      updateGroup: (id: number, data: any) => Promise<any>;
      deleteGroup: (id: number) => Promise<any>;
      getPayments: (studentId: number) => Promise<Payment[]>;
      addPayment: (data: any) => Promise<any>;
      getUnpaidStudents: () => Promise<Student[]>;
      listStaff: () => Promise<Staff[]>;
      createStaff: (data: any) => Promise<any>;
      updateStaff: (id: number, data: any) => Promise<any>;
      deleteStaff: (id: number) => Promise<any>;
      getSetting: (key: string) => Promise<string | null>;
      setSetting: (key: string, value: string) => Promise<any>;
      getAllSettings: () => Promise<Record<string, string>>;
      getExams: (groupId: number) => Promise<any[]>;
      autoCreateExam: (groupId: number, sessionNumber: number) => Promise<any>;
      getExamScores: (examId: number) => Promise<any[]>;
      saveExamScore: (examId: number, studentId: number, score: number, notes?: string) => Promise<any>;
      getTopStudents: (gradeId: number, limit?: number) => Promise<any[]>;
      getAllTopStudents: (limit?: number) => Promise<any[]>;
      getDailyAbsentees: (date?: string) => Promise<Student[]>;
      getNearlyFinished: (threshold?: number) => Promise<(Student & { remaining: number })[]>;
      getUnpaidReport: () => Promise<(Student & { price: number })[]>;
      createBackup: () => Promise<any>;
      restoreBackup: () => Promise<any>;
      getDashboardStats: () => Promise<DashboardStats>;
      // Activity Log
      getActivityLog: (limit?: number) => Promise<ActivityLogEntry[]>;
      logActivity: (action: string, description: string) => Promise<any>;
      // Teachers
      listTeachers: () => Promise<Teacher[]>;
      createTeacher: (data: any) => Promise<any>;
      updateTeacher: (id: number, data: any) => Promise<any>;
      deleteTeacher: (id: number) => Promise<any>;
      // Teacher Attendance
      getTeacherAttendanceToday: () => Promise<TeacherAttendance[]>;
      teacherCheckIn: (teacherId: number) => Promise<any>;
      // Teacher Evaluations
      getTeacherEvaluations: (teacherId: number) => Promise<TeacherEvaluation[]>;
      addTeacherEvaluation: (data: any) => Promise<any>;
      // Waiting List
      getWaitingList: () => Promise<WaitingEntry[]>;
      addWaitingEntry: (data: any) => Promise<any>;
      updateWaitingEntry: (id: number, data: any) => Promise<any>;
      deleteWaitingEntry: (id: number) => Promise<any>;
      convertWaitingEntry: (id: number, gradeId: number, groupId?: number) => Promise<any>;
      // Installments
      getInstallments: (studentId?: number) => Promise<Installment[]>;
      createInstallment: (data: any) => Promise<any>;
      payInstallment: (paymentId: number, amount?: number) => Promise<any>;
      // Messages
      getMessages: () => Promise<Message[]>;
      createMessage: (data: any) => Promise<any>;
      sendMessage: (id: number) => Promise<any>;
      getMessageTemplates: () => Promise<MessageTemplate[]>;
      // Receipts
      getReceipts: (studentId?: number) => Promise<Receipt[]>;
      createReceipt: (data: any) => Promise<any>;
      getReceiptForPrint: (id: number) => Promise<Receipt>;
      // Session Compensation
      getCompensationList: (studentId?: number) => Promise<CompensationEntry[]>;
      createCompensation: (data: any) => Promise<any>;
      completeCompensation: (id: number) => Promise<any>;
      // Branches
      clearData: (tableName: string) => Promise<any>;
      listBranches: () => Promise<any[]>;
      createBranch: (data: any) => Promise<any>;
      updateBranch: (id: number, data: any) => Promise<any>;
      deleteBranch: (id: number) => Promise<any>;
      // Analytics
      getAttendanceAnalytics: (groupId: number, days?: number) => Promise<any[]>;
      getRevenueAnalytics: (months?: number) => Promise<any[]>;
    };
  }
}
