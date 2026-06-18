import { useState, useEffect } from 'react';
import { Send, Copy, Check, MessageSquare, Users, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import type { MessageTemplate, Student, Message } from '@/types';

export default function MessagesPage() {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [messageText, setMessageText] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const [t, m, s] = await Promise.all([
        window.electronAPI.getMessageTemplates(),
        window.electronAPI.getMessages(),
        window.electronAPI.listStudents({ page: 1, limit: 1000 }),
      ]);
      setTemplates(t || []);
      setMessages(m || []);
      setStudents(s?.students || []);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const applyTemplate = (t: MessageTemplate) => {
    setSelectedTemplate(t);
    let text = t.text;
    if (selectedStudents.length === 1) {
      const student = students.find(s => s.id === selectedStudents[0]);
      if (student) {
        text = text.replace(/{name}/g, student.full_name);
      }
    }
    text = text.replace(/{center}/g, 'EduCenter Pro');
    text = text.replace(/{date}/g, new Date().toLocaleDateString('ar-EG'));
    setMessageText(text);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('تم النسخ');
    } catch { toast.error('فشل النسخ'); }
  };

  const handleSend = async () => {
    if (!messageText.trim()) { toast.error('الرسالة فارغة'); return; }
    for (const sid of selectedStudents) {
      try {
        await window.electronAPI.createMessage({ student_id: sid, type: 'whatsapp', template: selectedTemplate?.id || '', message_text: messageText });
      } catch {}
    }
    await window.electronAPI.logActivity('message_create', `إنشاء ${selectedStudents.length} رسالة`);
    toast.success(`تم إنشاء ${selectedStudents.length} رسالة`);
    load();
  };

  const toggleStudent = (id: number) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">الرسائل</h1>
        <p className="text-dark-400 text-sm">قوالب الرسائل لواتساب / SMS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates */}
        <div className="card p-6 lg:col-span-1">
          <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2"><MessageSquare size={16} className="text-primary-400" /> القوالب</h2>
          <div className="space-y-2">
            {templates.map((t) => (
              <button key={t.id} onClick={() => applyTemplate(t)} className={`w-full text-right p-3 rounded-lg text-sm transition-all ${selectedTemplate?.id === t.id ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30' : 'bg-dark-700/30 text-dark-200 hover:bg-dark-700'}`}>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-dark-400 mt-1 truncate">{t.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Compose */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2"><Users size={16} className="text-primary-400" /> إنشاء رسالة</h2>

          <div className="mb-4">
            <label className="label">اختر الطلاب</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-lg bg-dark-700/20">
              <button onClick={() => setSelectedStudents(students.map(s => s.id))} className="text-xs px-2 py-1 rounded bg-dark-600 text-dark-300 hover:bg-dark-500">تحديد الكل</button>
              <button onClick={() => setSelectedStudents([])} className="text-xs px-2 py-1 rounded bg-dark-600 text-dark-300 hover:bg-dark-500">إلغاء الكل</button>
              {students.map((s) => (
                <button key={s.id} onClick={() => toggleStudent(s.id)} className={`text-xs px-2 py-1 rounded transition-all ${selectedStudents.includes(s.id) ? 'bg-primary-500/30 text-primary-300' : 'bg-dark-700/50 text-dark-400 hover:bg-dark-600'}`}>
                  {s.full_name}
                </button>
              ))}
            </div>
            <p className="text-xs text-dark-500 mt-1">{selectedStudents.length} طالب مختار</p>
          </div>

          <div className="mb-4">
            <label className="label">نص الرسالة</label>
            <textarea value={messageText} onChange={e => setMessageText(e.target.value)} className="input-field" rows={6} placeholder="اكتب رسالتك هنا..." />
          </div>

          <div className="flex gap-3">
            <button onClick={handleCopy} className="btn-secondary">
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />} {copied ? 'تم النسخ' : 'نسخ'}
            </button>
            <button onClick={handleSend} className="btn-primary"><Send size={16} /> إنشاء رسائل</button>
            {selectedStudents.length === 1 && messageText && (
              <button
                onClick={() => {
                  const s = students.find(st => st.id === selectedStudents[0]);
                  if (s?.phone) {
                    const phone = s.phone.replace(/[^0-9]/g, '');
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(messageText)}`, '_blank');
                    toast.success('تم فتح واتساب');
                  } else { toast.error('رقم الهاتف غير متوفر'); }
                }}
                className="btn-secondary"
              ><ExternalLink size={16} /> فتح في واتساب</button>
            )}
          </div>
        </div>
      </div>

      {/* Sent Messages */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-dark-200 mb-4">الرسائل المرسلة</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {messages.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-2 px-4 rounded-lg bg-dark-700/30">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-dark-200 truncate">{m.message_text}</p>
                <p className="text-xs text-dark-400">{m.student_name || '---'} • {new Date(m.created_at).toLocaleString('ar-EG')}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded shrink-0 ${m.status === 'sent' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
                {m.status === 'sent' ? 'مرسلة' : 'معلقة'}
              </span>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-dark-500 text-center py-4">لا توجد رسائل</p>}
        </div>
      </div>
    </div>
  );
}
