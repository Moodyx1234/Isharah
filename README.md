# إشارة | Isharah

**One lecture, understood by every student · محاضرة واحدة، مفهومة لكل طالب**

[English](#english) · [العربية](#العربية)

> **Status: early prototype · الحالة: نموذج أولي**
> Built for Eduthon 3 at King Khalid University (2026). Some features are incomplete, and the AI features (slide descriptions, summaries and rephrasing for sign language) currently return placeholder responses.

---

## English

Isharah is a prototype of a real-time accessibility platform that helps deaf and blind students follow university lectures.

### What the prototype does

- Lecturer dashboard that starts a live session students join with a code
- Live captions from the lecturer's speech (Web Speech API)
- Deaf student view: a 3D avatar that plays sign-language gestures, with live captions
- Blind student view: text-to-speech narration and voice commands
- Sighted student view: live captions
- Screen sharing and PDF slide presentation
- Raise-hand notifications to the lecturer
- Demo mode that replays a sample lecture without a microphone
- Arabic (RTL) and English (LTR) interface
- Session archive saved in the browser

### Tech stack

React · TypeScript · Vite · Tailwind CSS · Radix UI · Framer Motion · Three.js (React Three Fiber) · Zustand · i18next · Socket.io · Express · WebRTC · pdf.js · Web Speech API

### Run locally

Requires Node.js 18+.

```bash
npm install
npm run dev
```

This starts the web app on http://localhost:5173 and the session server on port 3000. The app opens in Arabic by default.

### Roadmap

- Connect real AI for slide descriptions, lecture summaries and rephrasing Arabic for Saudi Sign Language
- Use an official Saudi Sign Language dataset for more accurate signing
- Integration with learning platforms such as Blackboard and Moodle
- Mobile app for students

---

<div dir="rtl">

## العربية

**إشارة** نموذج أولي لمنصة تساعد الطلاب الصم والمكفوفين على متابعة المحاضرات الجامعية مباشرة. بُني لهاكاثون إديوثون 3 في جامعة الملك خالد (2026).

> بعض المميزات غير مكتملة، ومميزات الذكاء الاصطناعي (وصف الشرائح والملخصات وتبسيط النص للغة الإشارة) تعطي حالياً ردوداً مؤقتة.

### ما يقدمه النموذج حالياً

- لوحة للمحاضر يبدأ منها جلسة مباشرة يدخلها الطلاب برمز
- ترجمة نصية مباشرة لكلام المحاضر (Web Speech API)
- واجهة للطالب الأصم فيها شخصية ثلاثية الأبعاد تؤدي حركات لغة الإشارة مع الترجمة النصية
- واجهة للطالب الكفيف فيها قراءة صوتية وأوامر صوتية
- واجهة للطالب المبصر فيها الترجمة النصية المباشرة
- مشاركة الشاشة وعرض الشرائح بصيغة PDF
- خاصية رفع اليد وتنبيه المحاضر
- وضع تجريبي يعيد محاضرة نموذجية بدون ميكروفون
- واجهة بالعربية والإنجليزية
- أرشيف للجلسات محفوظ في المتصفح

### التقنيات

React · TypeScript · Vite · Tailwind CSS · Three.js · Socket.io · Express · WebRTC · pdf.js · i18next · Zustand

### التشغيل على جهازك

يحتاج Node.js 18 أو أحدث. نفّذ `npm install` ثم `npm run dev`، وافتح http://localhost:5173

### الخطوات القادمة

- ربط ذكاء اصطناعي فعلي لوصف الشرائح وتلخيص المحاضرات وتبسيط النص للغة الإشارة السعودية
- الاعتماد على قاعدة بيانات رسمية للغة الإشارة السعودية
- الربط مع منصات التعلم مثل Blackboard وMoodle
- تطبيق جوال للطلاب

</div>

---

Moayad Faqih · [linkedin.com/in/moayad-faqih](https://www.linkedin.com/in/moayad-faqih)
