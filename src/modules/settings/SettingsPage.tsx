import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, GraduationCap, Sun, Moon, Volume2, VolumeX, Database, Download, Upload, Plus, X, Edit2, Trash2, BookOpen, ListOrdered, History, Calendar, MessageSquare, Palette, Cloud, Globe, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '@/store/appStore';
import type { Grade } from '@/types';
import BrandingSettings from '@/components/BrandingSettings';

export default function SettingsPage() {
  const { theme, setTheme, soundEnabled, setSoundEnabled, grades, loadGrades } = useAppStore();
  const navigate = useNavigate();
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeForm, setGradeForm] = useState({ name: '', price: 0, session_count: 12 });
  const [activeTab, setActiveTab] = useState<'general' | 'grades' | 'branding' | 'updates'>('general');
  const [updateChecking, setUpdateChecking] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<string | null>(null);

  const quickLinks = [
    { to: '/teachers', icon: BookOpen, label: 'المدرسون', desc: 'إدارة المدرسين والحضور والتقييمات' },
    { to: '/waiting-list', icon: ListOrdered, label: 'قائمة الانتظار', desc: 'إدارة الطلاب المنتظرين' },
    { to: '/activity-log', icon: History, label: 'سجل النشاطات', desc: 'عرض أحداث النظام' },
    { to: '/compensation', icon: Calendar, label: 'تعويض الحصص', desc: 'إدارة تعويضات الغياب' },
    { to: '/messages', icon: MessageSquare, label: 'الرسائل', desc: 'قوالب واتساب ورسائل' },
  ];

  useEffect(() => { loadGrades(); }, []);

  const handleSaveGrade = async () => {
    if (!gradeForm.name.trim()) { toast.error('الاسم مطلوب'); return; }
    try {
      if (editingGrade) {
        await window.electronAPI.updateGrade(editingGrade.id, gradeForm);
        toast.success('تم تحديث الصف');
      } else {
        await window.electronAPI.createGrade(gradeForm);
        toast.success('تم إضافة الصف');
      }
      setShowGradeModal(false);
      setEditingGrade(null);
      setGradeForm({ name: '', price: 0, session_count: 12 });
      loadGrades();
    } catch { toast.error('فشل الحفظ'); }
  };

  const handleDeleteGrade = async (id: number) => {
    if (!confirm('هل تريد حذف هذا الصف؟')) return;
    try {
      await window.electronAPI.deleteGrade(id);
      toast.success('تم حذف الصف');
      loadGrades();
    } catch { toast.error('فشل الحذف'); }
  };

  const handleBackup = async () => {
    try {
      const result = await window.electronAPI.createBackup();
      if (result.success) toast.success('تم إنشاء النسخة الاحتياطية');
    } catch { toast.error('فشل النسخ الاحتياطي'); }
  };

  const handleRestore = async () => {
    if (!confirm('استعادة النسخة الاحتياطية ستستبدل جميع البيانات. هل تريد المتابعة؟')) return;
    try {
      const result = await window.electronAPI.restoreBackup();
      if (result.success) {
        toast.success('تم استعادة قاعدة البيانات');
        loadGrades();
      }
    } catch { toast.error('فشل الاستعادة'); }
  };

  const handleCloudBackup = () => {
    handleBackup();
    toast('يمكنك رفع النسخة يدوياً إلى Google Drive أو OneDrive', { icon: '☁️', duration: 4000 });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">الإعدادات</h1>
        <p className="text-dark-400 text-sm">إدارة إعدادات النظام</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quickLinks.map(({ to, icon: Icon, label, desc }) => (
          <button key={to} onClick={() => navigate(to)} className="card p-4 text-right hover:bg-dark-700/50 transition-all text-dark-200">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={18} className="text-primary-400" />
              <span className="font-semibold">{label}</span>
            </div>
            <p className="text-xs text-dark-400">{desc}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2 flex-wrap">
        <button onClick={() => setActiveTab('general')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'general' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}>
          <Settings size={16} className="inline ml-1" /> عام
        </button>
        <button onClick={() => setActiveTab('grades')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'grades' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}>
          <GraduationCap size={16} className="inline ml-1" /> الصفوف
        </button>
        <button onClick={() => setActiveTab('branding')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'branding' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}>
          <Palette size={16} className="inline ml-1" /> العلامة التجارية
        </button>
        <button onClick={() => setActiveTab('updates')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'updates' ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:bg-dark-600'}`}>
          <RefreshCw size={16} className="inline ml-1" /> التحديثات
        </button>
      </div>

      {activeTab === 'general' && (
        <>
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Sun size={16} className="text-primary-400" /> المظهر
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-200">الوضع الليلي</p>
                <p className="text-xs text-dark-400">تبديل بين الوضع الليلي والنهاري</p>
              </div>
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className={`w-12 h-7 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-primary-600' : 'bg-dark-600'}`}
              >
                <motion.div
                  animate={{ x: theme === 'dark' ? 22 : 2 }}
                  className="w-5 h-5 bg-white rounded-full absolute top-1 flex items-center justify-center"
                >
                  {theme === 'dark' ? <Moon size={10} className="text-dark-900" /> : <Sun size={10} className="text-dark-900" />}
                </motion.div>
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Volume2 size={16} className="text-primary-400" /> الصوت
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-200">المؤثرات الصوتية</p>
                <p className="text-xs text-dark-400">تشغيل أصوات عند تسجيل الحضور والإجراءات</p>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-12 h-7 rounded-full transition-colors relative ${soundEnabled ? 'bg-primary-600' : 'bg-dark-600'}`}
              >
                <motion.div
                  animate={{ x: soundEnabled ? 22 : 2 }}
                  className="w-5 h-5 bg-white rounded-full absolute top-1 flex items-center justify-center"
                >
                  {soundEnabled ? <Volume2 size={10} className="text-dark-900" /> : <VolumeX size={10} className="text-dark-900" />}
                </motion.div>
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Database size={16} className="text-primary-400" /> النسخ الاحتياطي
            </h2>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleBackup} className="btn-secondary"><Download size={16} /> نسخة محلية</button>
              <button onClick={handleRestore} className="btn-secondary"><Upload size={16} /> استعادة</button>
              <button onClick={handleCloudBackup} className="btn-secondary"><Cloud size={16} /> نسخة للسحابة</button>
            </div>
            <p className="text-xs text-dark-500 mt-3">النسخ الاحتياطي يحفظ جميع بيانات الطلاب والمدفوعات والإعدادات.</p>
          </div>
        </>
      )}

      {activeTab === 'grades' && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
              <GraduationCap size={16} className="text-primary-400" /> إدارة الصفوف الدراسية
            </h2>
            <button
              onClick={() => { setEditingGrade(null); setGradeForm({ name: '', price: 0, session_count: 12 }); setShowGradeModal(true); }}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Plus size={14} /> إضافة صف
            </button>
          </div>
          <div className="space-y-2">
            {grades.map((grade) => (
              <div key={grade.id} className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-dark-700/30">
                <div>
                  <p className="text-sm font-medium text-dark-200">{grade.name}</p>
                  <p className="text-xs text-dark-400">{grade.price} ج.م • {grade.session_count} حصة</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingGrade(grade); setGradeForm({ name: grade.name, price: grade.price, session_count: grade.session_count }); setShowGradeModal(true); }} className="btn-ghost p-1"><Edit2 size={14} /></button>
                  <button onClick={() => handleDeleteGrade(grade.id)} className="btn-ghost p-1 text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
            {grades.length === 0 && (
              <p className="text-sm text-dark-500 text-center py-4">لا توجد صفوف دراسية</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'branding' && <BrandingSettings />}

      {activeTab === 'updates' && (
        <div className="card p-6">
          <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
            <RefreshCw size={16} className="text-primary-400" /> التحديثات التلقائية
          </h2>
          <div className="space-y-4">
            <p className="text-xs text-dark-400 leading-relaxed">
              البرنامج يتحقق من وجود تحديثات تلقائياً عند بدء التشغيل. عند توفر تحديث جديد، سيتم تحميله في الخلفية
              ويمكنك تثبيته عند الانتهاء. جميع بياناتك تبقى محفوظة أثناء التحديث.
            </p>
            <button
              onClick={async () => {
                setUpdateChecking(true);
                setUpdateInfo(null);
                try {
                  const result = await window.electronAPI.checkForUpdates();
                  if (result.success) {
                    setUpdateInfo(result.updateAvailable ? 'يوجد تحديث متاح' : 'البرنامج محدث لأحدث إصدار');
                  } else {
                    setUpdateInfo('فشل التحقق من التحديثات');
                  }
                } catch {
                  setUpdateInfo('فشل الاتصال بخادم التحديثات');
                }
                setUpdateChecking(false);
              }}
              disabled={updateChecking}
              className="btn-primary text-xs py-2 px-4"
            >
              <RefreshCw size={14} className={`${updateChecking ? 'animate-spin' : ''}`} />
              {updateChecking ? 'جارٍ الفحص...' : 'التحقق من وجود تحديثات'}
            </button>
            {updateInfo && (
              <p className="text-sm text-dark-300 bg-dark-700/50 rounded-lg px-4 py-2">{updateInfo}</p>
            )}
            <div className="border-t border-dark-700 pt-4 mt-4">
              <p className="text-xs text-dark-500">
                الإصدار الحالي: <span className="text-dark-300 font-mono">1.0.1</span>
              </p>
              <p className="text-xs text-dark-500 mt-1">
                آخر إصدار على GitHub: يتم الفحص تلقائياً
              </p>
            </div>
          </div>
        </div>
      )}

      {showGradeModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowGradeModal(false)}>
          <div className="card p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{editingGrade ? 'تعديل صف' : 'إضافة صف جديد'}</h2>
              <button onClick={() => setShowGradeModal(false)} className="btn-ghost p-1"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">اسم الصف</label>
                <input type="text" value={gradeForm.name} onChange={(e) => setGradeForm({ ...gradeForm, name: e.target.value })} className="input-field" placeholder="مثال: الصف الأول" />
              </div>
              <div>
                <label className="label">الرسوم (ج.م)</label>
                <input type="number" value={gradeForm.price} onChange={(e) => setGradeForm({ ...gradeForm, price: Number(e.target.value) })} className="input-field" min={0} />
              </div>
              <div>
                <label className="label">عدد الحصص</label>
                <input type="number" value={gradeForm.session_count} onChange={(e) => setGradeForm({ ...gradeForm, session_count: Number(e.target.value) })} className="input-field" min={1} max={100} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowGradeModal(false)} className="btn-secondary">إلغاء</button>
                <button onClick={handleSaveGrade} className="btn-primary">{editingGrade ? 'تحديث' : 'إضافة'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
