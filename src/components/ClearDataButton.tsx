import { useState } from 'react';
import { Trash2, AlertTriangle, Shield, Skull, Bomb, X } from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = [
  { icon: AlertTriangle, text: 'هل أنت متأكد من مسح البيانات؟' },
  { icon: Shield, text: 'هذا الإجراء سيحذف جميع بيانات هذه الصفحة!' },
  { icon: Skull, text: 'لا يمكن التراجع عن الحذف!' },
  { icon: Bomb, text: 'جميع السجلات ستختفي إلى الأبد!' },
  { icon: AlertTriangle, text: 'هل أنت متأكد نهائياً؟' },
  { icon: Shield, text: 'بيانات مهمة قد تفقدها!' },
  { icon: X, text: 'اكتب "مسح" لتأكيد الحذف النهائي' },
];

interface Props {
  tableName: string;
  pageLabel: string;
  onClear: () => Promise<void>;
}

export default function ClearDataButton({ tableName, pageLabel, onClear }: Props) {
  const [step, setStep] = useState(-1);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    if (confirmText !== 'مسح') return;
    setLoading(true);
    try {
      await onClear();
      toast.success(`تم مسح بيانات ${pageLabel} بنجاح`);
      setStep(-1);
      setConfirmText('');
    } catch {
      toast.error('فشل مسح البيانات');
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setStep(0)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all text-xs font-medium"
        title="مسح بيانات هذه الصفحة"
      >
        <Trash2 size={13} />
        مسح البيانات
      </button>

      {step >= 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200]" onClick={() => setStep(-1)}>
          <div className="card p-6 w-full max-w-sm mx-4 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full bg-red-500/10 animate-pulse">
                {(() => {
                  const Icon = STEPS[step]?.icon || AlertTriangle;
                  return <Icon size={36} className="text-red-400" />;
                })()}
              </div>
            </div>

            <h2 className="text-base font-bold text-white mb-1">
              {STEPS[step]?.text}
            </h2>
            <p className="text-xs text-dark-400 mb-2">
              ({pageLabel}) — خطوة {step + 1} من {STEPS.length}
            </p>

            {/* Progress bar */}
            <div className="flex justify-center gap-1 mb-5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 w-6 rounded-full transition-all ${i <= step ? 'bg-red-500' : 'bg-dark-600'}`} />
              ))}
            </div>

            {step < 6 ? (
              <button onClick={() => setStep(step + 1)} className="btn-danger w-full">
                نعم، أواصل ({step + 1}/{STEPS.length})
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  className="input-field text-center text-lg"
                  placeholder='اكتب "مسح"'
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleClear(); }}
                />
                <button onClick={handleClear} disabled={confirmText !== 'مسح' || loading} className="btn-danger w-full">
                  {loading ? 'جاري المسح...' : 'تأكيد المسح النهائي'}
                </button>
              </div>
            )}

            <button
              onClick={() => { setStep(-1); setConfirmText(''); }}
              className="mt-3 text-xs text-dark-400 hover:text-dark-300 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </>
  );
}
