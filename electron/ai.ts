let apiKey = '';
let lastFetch = 0;

export function setApiKey(key: string): void {
  apiKey = key;
}

export async function askGemini(message: string, appContext?: string): Promise<string> {
  if (!apiKey) return '❌ لم يتم تعيين مفتاح API. اذهب إلى الإعدادات → الذكاء الاصطناعي وأدخل المفتاح.';

  const now = Date.now();
  if (now - lastFetch < 1000) {
    await new Promise(r => setTimeout(r, 1000 - (now - lastFetch)));
  }
  lastFetch = Date.now();

  const systemPrompt = `أنت مساعد ذكي لنظام EduCenter Pro — نظام إدارة المراكز التعليمية.
أنت تجيب باللغة العربية الفصحى.
مهمتك: مساعدة المدير في إدارة الطلاب، الحضور، الامتحانات، المدفوعات، التقارير.

${appContext ? `معلومات إضافية:\n${appContext}` : ''}

يمكنك:
- الإجابة عن أسئلة إدارة المركز
- تحليل بيانات الطلاب والمدفوعات
- اقتراح طرق لتحسين الأداء
- مساعدة في فهم التقارير`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nسؤال المستخدم: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 403 || res.status === 401) return '❌ مفتاح API غير صالح. تأكد من المفتاح في الإعدادات.';
      if (res.status === 429) return '⚠️ تم تجاوز حد الاستخدام. انتظر قليلاً وحاول مرة أخرى.';
      return `❌ خطأ في الاتصال: ${res.status}`;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || '❌ لم يتم الحصول على رد من الذكاء الاصطناعي.';
  } catch (err: any) {
    if (err.message?.includes('fetch') || err.message?.includes('ENOTFOUND')) {
      return '⚠️ لا يوجد اتصال بالإنترنت. برجاء الاتصال بالإنترنت لاستخدام المساعد الذكي.';
    }
    return `❌ حدث خطأ: ${err.message || 'غير معروف'}`;
  }
}
