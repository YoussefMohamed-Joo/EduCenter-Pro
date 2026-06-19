import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SpeechRecognitionConstructor =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

interface VoiceResult {
  text: string;
  success: boolean;
  result?: string;
  error?: string;
  action?: string;
}

export default function VoiceButton() {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VoiceResult | null>(null);
  const [supported] = useState(!!SpeechRecognitionConstructor);
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => {
    return () => { stopListening(); };
  }, [stopListening]);

  const handleVoiceResult = async (transcript: string) => {
    setProcessing(true);
    setResult(null);
    try {
      const res = await window.electronAPI.agentParseAndExecute(transcript);
      setResult({ text: transcript, ...res });
    } catch {
      setResult({ text: transcript, success: false, error: 'حدث خطأ في الاتصال' });
    }
    setProcessing(false);
    setTimeout(() => setResult(null), 6000);
  };

  const startListening = () => {
    if (!supported) {
      setResult({ text: '', success: false, error: 'المتصفح لا يدعم التعرف على الصوت', action: '' });
      return;
    }
    setResult(null);
    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      stopListening();
      handleVoiceResult(transcript);
    };

    recognition.onerror = () => {
      stopListening();
      setResult({ text: '', success: false, error: 'لم أستطع سماعك. حاول مرة أخرى.', action: '' });
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);

    timeoutRef.current = setTimeout(() => {
      stopListening();
      if (!result) {
        setResult({ text: '', success: false, error: 'انتهى الوقت. حاول مرة أخرى.', action: '' });
      }
    }, 8000);
  };

  if (!supported) return null;

  return (
    <>
      <button
        onClick={listening ? stopListening : startListening}
        disabled={processing}
        className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          listening
            ? 'bg-red-500 scale-110 shadow-red-500/40'
            : processing
              ? 'bg-primary-600'
              : 'bg-primary-600 hover:bg-primary-500 shadow-primary-500/30 hover:scale-105'
        }`}
        title="المساعد الصوتي"
      >
        {processing ? (
          <Loader2 size={22} className="text-white animate-spin" />
        ) : listening ? (
          <MicOff size={22} className="text-white" />
        ) : (
          <Mic size={22} className="text-white" />
        )}
      </button>

      {listening && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="fixed bottom-24 left-8 z-50"
        >
          <div className="bg-dark-800 border border-primary-500/30 rounded-2xl px-6 py-4 shadow-2xl shadow-primary-500/10">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <motion.span animate={{ height: [8, 24, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 bg-primary-400 rounded-full" />
                <motion.span animate={{ height: [8, 32, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.15 }} className="w-1.5 bg-primary-400 rounded-full" />
                <motion.span animate={{ height: [8, 20, 8] }} transition={{ repeat: Infinity, duration: 1, delay: 0.3 }} className="w-1.5 bg-primary-400 rounded-full" />
              </div>
              <span className="text-sm text-dark-200">أنا أستمع... تحدث الآن</span>
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-8 z-50 max-w-sm"
          >
            <div className={`rounded-2xl px-5 py-4 shadow-2xl border ${
              result.success
                ? 'bg-dark-800 border-emerald-500/30'
                : 'bg-dark-800 border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-lg mt-0.5">{result.success ? '✅' : '❌'}</span>
                <div>
                  {result.text && (
                    <p className="text-xs text-dark-400 mb-1">"{result.text}"</p>
                  )}
                  <p className={`text-sm ${result.success ? 'text-emerald-300' : 'text-red-300'}`}>
                    {result.success ? result.result : result.error}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
