import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, Sparkles, BarChart3, Users, GraduationCap, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import type { AIMessage } from '@/types';

const quickActions = [
  { icon: BarChart3, label: 'تحليل عام', prompt: 'حلل الوضع العام للمركز بناء على بيانات الطلاب والمدفوعات وقدم توصيات' },
  { icon: Users, label: 'اقتراحات طلاب', prompt: 'اقترح طرق لتحسين أداء الطلاب ومتابعة الغائبين والضعاف' },
  { icon: DollarSign, label: 'تحليل مدفوعات', prompt: 'حلل حالة المدفوعات واقترح طرق لتحصيل المتأخرات' },
  { icon: GraduationCap, label: 'تطوير المركز', prompt: 'اقترح أفكار لتطوير أداء المركز التعليمي وزيادة الإيرادات' },
];

export default function AISidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'assistant', content: 'مرحباً! أنا المساعد الذكي. كيف يمكنني مساعدتك في إدارة المركز اليوم؟', timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: AIMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const reply = await window.electronAPI.askAI(text);
      const aiMsg: AIMessage = { role: 'assistant', content: reply, timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      toast.error('فشل الاتصال بالمساعد الذكي');
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 360 }}
          animate={{ x: 0 }}
          exit={{ x: 360 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="fixed top-12 left-0 bottom-0 w-[360px] bg-dark-800 border-l border-dark-700 z-40 flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-dark-700">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-primary-400" />
              <span className="font-semibold text-white">المساعد الذكي</span>
              <Sparkles size={14} className="text-primary-400/60" />
            </div>
            <button onClick={onClose} className="btn-ghost p-1"><X size={16} /></button>
          </div>

          <div className="flex gap-2 p-3 overflow-x-auto border-b border-dark-700/50">
            {quickActions.map(({ icon: Icon, label, prompt }) => (
              <button
                key={label}
                onClick={() => sendMessage(prompt)}
                disabled={loading}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors text-xs text-dark-300"
              >
                <Icon size={12} className="text-primary-400" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'assistant'
                      ? 'bg-dark-700 text-dark-100 rounded-br-sm'
                      : 'bg-primary-600 text-white rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-dark-700 text-dark-100 rounded-2xl rounded-br-sm px-4 py-3">
                  <Loader2 size={16} className="animate-spin text-primary-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t border-dark-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اسأل المساعد الذكي..."
                className="input-field flex-1"
                disabled={loading}
              />
              <button type="submit" disabled={loading || !input.trim()} className="btn-primary p-2.5">
                <Send size={16} />
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
