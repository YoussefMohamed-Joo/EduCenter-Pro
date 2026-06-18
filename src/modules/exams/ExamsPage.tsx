import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Search, CheckCircle2, X, Award, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/appStore';
import type { Student } from '@/types';

export default function ExamsPage() {
  const { grades, groups, loadGrades, loadGroups } = useAppStore();
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [tab, setTab] = useState<'exams' | 'top'>('exams');

  useEffect(() => { loadGrades(); loadGroups(); }, []);

  const filteredGroups = groups.filter(g => !selectedGrade || g.grade_id === Number(selectedGrade));

  const loadExams = async () => {
    if (!selectedGroup) return;
    const list = await window.electronAPI.getExams(Number(selectedGroup));
    setExams(list || []);
  };

  const loadStudents = async () => {
    if (!selectedGroup) return;
    const list = await window.electronAPI.getStudentsByGroup(Number(selectedGroup));
    setStudents(list);
  };

  useEffect(() => {
    if (selectedGroup) {
      loadExams();
      loadStudents();
    }
  }, [selectedGroup]);

  const openExam = async (exam: any) => {
    setSelectedExam(exam);
    const existingScores = await window.electronAPI.getExamScores(exam.id);
    const scoreMap: Record<number, string> = {};
    existingScores.forEach((s: any) => {
      scoreMap[s.student_id] = String(s.score);
    });
    setScores(scoreMap);
  };

  const saveScore = async (studentId: number) => {
    if (!selectedExam) return;
    const score = parseFloat(scores[studentId]);
    if (isNaN(score) || score < 0 || score > selectedExam.max_score) {
      toast.error(`الدرجة يجب أن تكون بين 0 و ${selectedExam.max_score}`);
      return;
    }
    await window.electronAPI.saveExamScore(selectedExam.id, studentId, score, '');
    toast.success('تم حفظ الدرجة');
  };

  const loadTopStudents = async () => {
    if (!selectedGrade) return;
    const list = await window.electronAPI.getTopStudents(Number(selectedGrade), 20);
    setTopStudents(list || []);
  };

  useEffect(() => {
    if (selectedGrade && tab === 'top') loadTopStudents();
  }, [selectedGrade, tab]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الامتحانات والدرجات</h1>
          <p className="text-dark-400 text-sm">إدارة الامتحانات ودرجات الطلاب</p>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <button onClick={() => setTab('exams')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'exams' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}>
          <GraduationCap size={16} className="inline ml-1" /> الامتحانات
        </button>
        <button onClick={() => setTab('top')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'top' ? 'bg-amber-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}>
          <Award size={16} className="inline ml-1" /> الطلاب المتميزون
        </button>
      </div>

      {tab === 'exams' && (
        <>
          <div className="card p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="label">الصف الدراسي</label>
                <select value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value); setSelectedGroup(''); setSelectedExam(null); }} className="input-field">
                  <option value="">كل الصفوف</option>
                  {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">المجموعة</label>
                <select value={selectedGroup} onChange={(e) => { setSelectedGroup(e.target.value); setSelectedExam(null); }} className="input-field">
                  <option value="">اختر مجموعة</option>
                  {filteredGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {selectedGroup && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-dark-200 mb-3">الامتحانات</h3>
                  <div className="space-y-1">
                    {exams.map((exam) => (
                      <button
                        key={exam.id}
                        onClick={() => openExam(exam)}
                        className={`w-full text-right px-3 py-2.5 rounded-lg text-sm transition-all ${
                          selectedExam?.id === exam.id ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30' : 'text-dark-300 hover:bg-dark-700'
                        }`}
                      >
                        <span className="font-medium">الامتحان {exam.session_number}</span>
                        <span className="text-xs text-dark-500 block">{exam.exam_date}</span>
                      </button>
                    ))}
                    {exams.length === 0 && (
                      <p className="text-sm text-dark-500 text-center py-4">لا توجد امتحانات بعد. سجل حضور أولاً.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                {selectedExam ? (
                  <div className="card p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-dark-200">
                        درجات الامتحان {selectedExam.session_number} - الدرجة القصوى: {selectedExam.max_score}
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {students.map((student) => (
                        <div key={student.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-dark-700/30">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-dark-100">{student.full_name}</p>
                            <p className="text-xs text-dark-400">{student.student_id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={scores[student.id] || ''}
                              onChange={(e) => setScores(s => ({ ...s, [student.id]: e.target.value }))}
                              placeholder="الدرجة"
                              className="input-field w-20 text-center"
                              min={0}
                              max={selectedExam.max_score}
                            />
                            <button onClick={() => saveScore(student.id)} className="btn-primary py-1.5 px-3 text-xs">
                              <CheckCircle2 size={14} /> حفظ
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="card p-12 text-center text-dark-500">
                    <GraduationCap size={48} className="mx-auto mb-4 opacity-30" />
                    <p>اختر امتحاناً لعرض الدرجات</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'top' && (
        <>
          <div className="card p-4">
            <label className="label">اختر الصف الدراسي</label>
            <select value={selectedGrade} onChange={(e) => { setSelectedGrade(e.target.value); }} className="input-field max-w-xs">
              <option value="">كل الصفوف</option>
              {grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          {topStudents.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="divide-y divide-dark-700/50">
                {topStudents.map((s: any, i: number) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-dark-700/20">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-300' : i === 2 ? 'bg-orange-500/20 text-orange-400' : 'bg-dark-600 text-dark-400'
                      }`}>{i + 1}</div>
                      <div>
                        <p className="text-sm font-medium text-dark-100">{s.full_name}</p>
                        <p className="text-xs text-dark-400">{s.student_id} • {s.grade_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-dark-400">{s.exams_taken} امتحان</span>
                      <span className={`text-lg font-bold ${s.avg_score >= 90 ? 'text-emerald-400' : s.avg_score >= 75 ? 'text-amber-400' : 'text-red-400'}`}>
                        {s.avg_score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-dark-500">
              <Award size={48} className="mx-auto mb-4 opacity-20" />
              <p>اختر صفاً دراسياً لعرض الطلاب المتميزين</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
