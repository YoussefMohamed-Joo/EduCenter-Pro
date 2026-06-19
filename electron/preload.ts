import { contextBridge, ipcRenderer } from 'electron';

const updateListeners = new Map<string, (...args: any[]) => void>();

contextBridge.exposeInMainWorld('electronAPI', {
  // Window
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Auth
  login: (username: string, password: string) => ipcRenderer.invoke('auth:login', { username, password }),

  // Students
  searchStudents: (query: string) => ipcRenderer.invoke('students:search', query),
  listStudents: (params: any) => ipcRenderer.invoke('students:list', params),
  getStudent: (id: number) => ipcRenderer.invoke('students:get', id),
  createStudent: (data: any) => ipcRenderer.invoke('students:create', data),
  updateStudent: (id: number, data: any) => ipcRenderer.invoke('students:update', { id, data }),
  deleteStudent: (id: number) => ipcRenderer.invoke('students:delete', id),
  getStudentsByGroup: (groupId: number) => ipcRenderer.invoke('students:byGroup', groupId),

  // Attendance
  markAttendance: (studentId: number, groupId: number, sessionNumber: number) => ipcRenderer.invoke('attendance:mark', { student_id: studentId, group_id: groupId, session_number: sessionNumber }),
  getTodayAttendance: (groupId: number) => ipcRenderer.invoke('attendance:today', groupId),
  getAbsentees: (groupId: number) => ipcRenderer.invoke('attendance:absentees', groupId),
  getSessionCount: (groupId: number) => ipcRenderer.invoke('attendance:sessionCount', groupId),
  getAttendanceHistory: (studentId: number) => ipcRenderer.invoke('attendance:history', studentId),

  // Grades
  getGrades: () => ipcRenderer.invoke('grades:list'),
  createGrade: (data: any) => ipcRenderer.invoke('grades:create', data),
  updateGrade: (id: number, data: any) => ipcRenderer.invoke('grades:update', { id, data }),
  deleteGrade: (id: number) => ipcRenderer.invoke('grades:delete', id),

  // Groups
  getGroups: (gradeId?: number) => ipcRenderer.invoke('groups:list', gradeId),
  createGroup: (data: any) => ipcRenderer.invoke('groups:create', data),
  updateGroup: (id: number, data: any) => ipcRenderer.invoke('groups:update', { id, data }),
  deleteGroup: (id: number) => ipcRenderer.invoke('groups:delete', id),

  // Payments
  getPayments: (studentId: number) => ipcRenderer.invoke('payments:list', studentId),
  addPayment: (data: any) => ipcRenderer.invoke('payments:add', data),
  getUnpaidStudents: () => ipcRenderer.invoke('payments:unpaid'),

  // Staff
  listStaff: () => ipcRenderer.invoke('staff:list'),
  createStaff: (data: any) => ipcRenderer.invoke('staff:create', data),
  updateStaff: (id: number, data: any) => ipcRenderer.invoke('staff:update', { id, data }),
  deleteStaff: (id: number) => ipcRenderer.invoke('staff:delete', id),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('settings:set', { key, value }),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),

  // Exams
  getExams: (groupId: number) => ipcRenderer.invoke('exams:list', groupId),
  autoCreateExam: (groupId: number, sessionNumber: number) => ipcRenderer.invoke('exams:autoCreate', { group_id: groupId, session_number: sessionNumber }),
  getExamScores: (examId: number) => ipcRenderer.invoke('exams:scores', examId),
  saveExamScore: (examId: number, studentId: number, score: number, notes?: string) => ipcRenderer.invoke('exams:saveScore', { exam_id: examId, student_id: studentId, score, notes }),
  getTopStudents: (gradeId: number, limit?: number) => ipcRenderer.invoke('exams:topStudents', gradeId, limit),
  getAllTopStudents: (limit?: number) => ipcRenderer.invoke('exams:allTopStudents', limit),

  // Reports
  getDailyAbsentees: (date?: string) => ipcRenderer.invoke('reports:dailyAbsentees', date),
  getNearlyFinished: (threshold?: number) => ipcRenderer.invoke('reports:nearlyFinished', threshold),
  getUnpaidReport: () => ipcRenderer.invoke('reports:unpaidStudents'),

  // Backup
  createBackup: () => ipcRenderer.invoke('backup:create'),
  restoreBackup: () => ipcRenderer.invoke('backup:restore'),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke('dashboard:stats'),

  // Activity Log
  getActivityLog: (limit?: number) => ipcRenderer.invoke('activity:list', limit),
  logActivity: (action: string, description: string) => ipcRenderer.invoke('activity:log', { action, description }),

  // Teachers
  listTeachers: () => ipcRenderer.invoke('teachers:list'),
  createTeacher: (data: any) => ipcRenderer.invoke('teachers:create', data),
  updateTeacher: (id: number, data: any) => ipcRenderer.invoke('teachers:update', { id, data }),
  deleteTeacher: (id: number) => ipcRenderer.invoke('teachers:delete', id),

  // Teacher Attendance
  getTeacherAttendanceToday: () => ipcRenderer.invoke('teacherAttendance:today'),
  teacherCheckIn: (teacherId: number) => ipcRenderer.invoke('teacherAttendance:checkIn', teacherId),

  // Teacher Evaluations
  getTeacherEvaluations: (teacherId: number) => ipcRenderer.invoke('teacherEval:list', teacherId),
  addTeacherEvaluation: (data: any) => ipcRenderer.invoke('teacherEval:add', data),

  // Waiting List
  getWaitingList: () => ipcRenderer.invoke('waiting:list'),
  addWaitingEntry: (data: any) => ipcRenderer.invoke('waiting:add', data),
  updateWaitingEntry: (id: number, data: any) => ipcRenderer.invoke('waiting:update', { id, data }),
  deleteWaitingEntry: (id: number) => ipcRenderer.invoke('waiting:delete', id),
  convertWaitingEntry: (id: number, gradeId: number, groupId?: number) => ipcRenderer.invoke('waiting:convert', { id, grade_id: gradeId, group_id: groupId }),

  // Installments
  getInstallments: (studentId?: number) => ipcRenderer.invoke('installments:list', studentId),
  createInstallment: (data: any) => ipcRenderer.invoke('installments:create', data),
  payInstallment: (paymentId: number, amount?: number) => ipcRenderer.invoke('installments:pay', { payment_id: paymentId, amount }),

  // Messages
  getMessages: () => ipcRenderer.invoke('messages:list'),
  createMessage: (data: any) => ipcRenderer.invoke('messages:create', data),
  sendMessage: (id: number) => ipcRenderer.invoke('messages:send', id),
  getMessageTemplates: () => ipcRenderer.invoke('messages:templates'),

  // Receipts
  getReceipts: (studentId?: number) => ipcRenderer.invoke('receipts:list', studentId),
  createReceipt: (data: any) => ipcRenderer.invoke('receipts:create', data),
  getReceiptForPrint: (id: number) => ipcRenderer.invoke('receipts:print', id),

  // Session Compensation
  getCompensationList: (studentId?: number) => ipcRenderer.invoke('compensation:list', studentId),
  createCompensation: (data: any) => ipcRenderer.invoke('compensation:create', data),
  completeCompensation: (id: number) => ipcRenderer.invoke('compensation:complete', id),

  // Clear Data
  clearData: (tableName: string) => ipcRenderer.invoke('data:clear', tableName),

  // Branches
  listBranches: () => ipcRenderer.invoke('branches:list'),
  createBranch: (data: any) => ipcRenderer.invoke('branches:create', data),
  updateBranch: (id: number, data: any) => ipcRenderer.invoke('branches:update', { id, data }),
  deleteBranch: (id: number) => ipcRenderer.invoke('branches:delete', id),

  // Analytics
  getAttendanceAnalytics: (groupId: number, days?: number) => ipcRenderer.invoke('analytics:attendance', { group_id: groupId, days }),
  getRevenueAnalytics: (months?: number) => ipcRenderer.invoke('analytics:revenue', months),

  // Auto Update
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  checkForUpdatesNow: () => ipcRenderer.invoke('update:checkNow'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),

  onUpdateStatus: (callback: (status: any) => void) => {
    const listener = (_event: any, status: any) => callback(status);
    ipcRenderer.on('update:status', listener);
    updateListeners.set('update:status', listener as any);
  },

  removeUpdateListener: () => {
    const listener = updateListeners.get('update:status');
    if (listener) {
      ipcRenderer.removeListener('update:status', listener as any);
      updateListeners.delete('update:status');
    }
  },
});
