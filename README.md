# כלי תעודות — ניהול ציונים והפקת תעודות

אפליקציית React + TypeScript + Vite עם Supabase, לניהול כיתה, העלאת חומרי לימוד ומבחנים,
זיהוי אוטומטי בעזרת AI (Claude), אישור ציונים ע"י המורה, והפקת תעודות PDF.

## מה כלול

- **התחברות/הרשמה** (Supabase Auth, אימייל+סיסמה)
- **ניהול כיתות** — כל מורה רואה רק את הכיתות שלו (RLS מלא)
- **תלמידים ומקצועות** לכל כיתה
- **העלאת חומרים** (תמונות/PDF) לאחסון מאובטח (Supabase Storage, לפי משתמש)
- **ניתוח AI** — כפתור "נתח עם AI" שולח את הקובץ ל-Claude ומחזיר:
  - סוג המסמך (מבחן/דף עבודה/חומר לימוד)
  - ניחוש מקצוע
  - תאריך שזוהה
  - ציונים מוצעים לתלמידים (אם יש טבלת ציונים גלויה במסמך)
- **אישור ציונים** — טאב "ציונים" מציג הצעות AI לצד שדה עריכה; המורה יכול לאשר בלחיצה או לערוך ידנית
- **הפקת תעודות** — מחצית א׳ / מחצית ב׳ / שנתי, כולל חישוב ממוצעים אוטומטי, PDF להורדה

## הפעלה מקומית

\`\`\`bash
npm install
cp .env.example .env.local   # מולא כבר עם פרטי הפרויקט שנוצר, השלם רק את מפתח Anthropic אם רוצים ניתוח AI
npm run dev
\`\`\`

## פרטי הפרויקט ב-Supabase

נוצר עבורך פרויקט ייעודי:

- **Project ref:** \`ocxwkwfbqoeguvfmrqfj\`
- **URL:** \`https://ocxwkwfbqoeguvfmrqfj.supabase.co\`
- **Dashboard:** https://supabase.com/dashboard/project/ocxwkwfbqoeguvfmrqfj
- מפתח ה-anon כבר נמצא ב-\`.env.local\`

הסכימה (טבלאות: classes, students, subjects, materials, exams, grades, certificates) וה-RLS
כבר הוחלו על הפרויקט. Storage bucket בשם \`materials\` נוצר גם הוא, עם policies שמגבילות
כל משתמש לתיקייה שלו בלבד (\`{user_id}/...\`).

## ⚠️ אזהרת אבטחה חשובה — מפתח Anthropic API

כרגע הקוד קורא ל-API של Anthropic **ישירות מהדפדפן** (\`src/lib/aiAnalysis.ts\`), עם המפתח
בתוך \`VITE_ANTHROPIC_API_KEY\`. זה נוח לפיתוח אבל **לא בטוח לפרודקשן** — כל מי שיפתח
את כלי הפיתוח בדפדפן יוכל לראות ולגנוב את המפתח.

**לפני שמעלים לאוויר בפועל, מומלץ מאוד להעביר את הקריאה ל-Supabase Edge Function:**

1. צור Edge Function חדש (\`supabase functions new analyze-document\`)
2. שים את לוגיקת הקריאה ל-Claude שם, עם המפתח כ-Secret בצד השרת
   (\`supabase secrets set ANTHROPIC_API_KEY=...\`)
3. עדכן את \`analyzeDocument\` ב-\`src/lib/aiAnalysis.ts\` שיקרא לפונקציה שלך
   (\`supabase.functions.invoke('analyze-document', {...})\`) במקום ל-API של Anthropic ישירות

אם תרצה, אני יכול לבנות את ה-Edge Function הזה עבורך בהמשך.

## תמיכה בעברית ב-PDF ✅

התעודות נתמכות במלואן בעברית, כולל RTL אמיתי:

- **פונט מוטמע:** Heebo (Regular + Bold), רישיון OFL-1.1 קוד פתוח, מותקן דרך
  חבילת ה-npm \`@fontsource/heebo\`. הפונט הומר מ-woff2 ל-TTF ומוזג (Hebrew + Latin
  subsets, כך שגם ספרות/תאריכים מוצגים נכון) בעזרת \`fonttools\`, ונשמר כ-base64
  בקבצי \`src/assets/fonts/heeboRegularBase64.ts\` ו-\`heeboBoldBase64.ts\`.
  הפונט נרשם בכל מופע PDF דרך \`doc.addFileToVFS\` + \`doc.addFont\`.
- **סידור bidi ויזואלי:** \`jsPDF\` מצייר טקסט תמיד LTR ואינו מבצע bidi reordering
  בעצמו. לכן \`src/lib/rtlText.ts\` משתמש בחבילת \`bidi-js\` כדי להמיר כל מחרוזת
  עברית (כולל עברית מעורבת עם מספרים כמו "ממוצע כללי: 91.8") לסדר התצוגה הנכון
  לפני שהיא נשלחת ל-jsPDF. כך גם ציונים ותאריכים בתוך משפט עברי נשארים בכיוון
  הקריאה הנכון שלהם (LTR) בתוך הזרימה הכללית מימין לשמאל.
- נבדק ואומת ויזואלית (הפקת PDF לדוגמה והמרה לתמונה) — הטקסט מוצג נכון.

## מבנה הפרויקט

\`\`\`
src/
  lib/
    supabase.ts              קליינט Supabase
    aiAnalysis.ts            קריאה ל-Claude לניתוח מסמכים
    certificateGenerator.ts  הפקת PDF וחישוב ממוצעים
  pages/
    Login.tsx
    Dashboard.tsx            רשימת כיתות
    ClassDetail.tsx          כיתה בודדת + טאבים
  components/
    StudentsSubjectsTab.tsx
    MaterialsTab.tsx         העלאה + ניתוח AI
    GradesTab.tsx            אישור/עריכת ציונים
    CertificatesTab.tsx      הפקת תעודות
  types/
    index.ts                 טיפוסי TypeScript תואמי-DB
\`\`\`

## פריסה (Deploy)

הפרויקט מוכן לפריסה ל-Vercel/Netlify כמו כל פרויקט Vite רגיל:

\`\`\`bash
npm run build
\`\`\`

זכור להגדיר את משתני הסביבה (\`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`,
ו-\`VITE_ANTHROPIC_API_KEY\` אם משתמשים בקריאה ישירה) בהגדרות הפרויקט בשירות הפריסה.
