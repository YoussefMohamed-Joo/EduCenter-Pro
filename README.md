# 🎓 EduCenter Pro

نظام إدارة متكامل للمراكز التعليمية — تطبيق سطح مكتب (ويندوز) بواجهة عربية.

## المميزات

- ✅ إدارة الطلاب (إضافة، تعديل، حذف، بحث، باركود، بطاقات تعريفية)
- ✅ تسجيل الحضور (باركود، بحث سريع، إنشاء امتحانات تلقائي)
- ✅ الامتحانات والدرجات
- ✅ المدفوعات والأقساط والإيصالات
- ✅ إدارة المدرسين والموظفين
- ✅ التقارير (Excel, PDF, CSV)
- ✅ قوالب رسائل واتساب
- ✅ تخصيص الألوان والشعار
- ✅ نسخ احتياطي واستعادة
- ✅ 100% دون إنترنت

## التثبيت

1. حمل المثبت من [educenter-pro.vercel.app](https://educenter-pro.vercel.app)
2. شغّل `EduCenter Pro Setup 1.0.0.exe`
3. سجل الدخول: `admin` / `admin123`

## التقنيات المستخدمة

- **Electron** + **React** + **TypeScript**
- **Vite** + **Tailwind CSS**
- **SQLite** (sql.js) — قاعدة بيانات محلية
- **Framer Motion** — أنيميشن
- **Recharts** — رسوم بيانية
- **electron-builder** — تعبئة وتوزيع

## التطوير

```bash
npm install
npm run electron:dev     # وضع التطوير
npm run build            # بناء الإصدار النهائي
```

## النشر

```bash
git add .
git commit -m "EduCenter Pro v1.0"
git remote add origin https://github.com/YoussefMohamed-Joo/EduCenter-Pro.git
git push -u origin main
```

## الموقع الرسمي

[https://educenter-pro.vercel.app](https://educenter-pro.vercel.app)
