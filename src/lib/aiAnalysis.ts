// מודול זה שולח את תוכן הקובץ (תמונה/PDF) למודל Claude
// ומבקש ניתוח מובנה: איזה מקצוע, סוג המסמך, תאריך, וזיהוי ציונים לתלמידים.
// נדרש להגדיר VITE_ANTHROPIC_API_KEY בסביבת הפיתוח (proxy מומלץ בפרודקשן - ראה README).

export interface AiDetectedGrade {
  student_name: string;
  score: number | null;
  confidence: "high" | "medium" | "low";
}

export interface AiAnalysisResult {
  detected_type: "test" | "worksheet" | "material" | "other";
  detected_subject_guess: string | null;
  detected_date: string | null; // ISO date אם זוהה
  summary: string;
  grades: AiDetectedGrade[];
}

const SYSTEM_PROMPT = `אתה עוזר למורה לנתח מסמכים חינוכיים שהועלו (מבחנים, דפי עבודה, חומרי לימוד).
החזר אך ורק JSON תקני (ללא markdown, ללא טקסט נוסף) בפורמט הבא:
{
  "detected_type": "test" | "worksheet" | "material" | "other",
  "detected_subject_guess": string | null,
  "detected_date": "YYYY-MM-DD" | null,
  "summary": string (משפט אחד בעברית שמתאר את המסמך),
  "grades": [ { "student_name": string, "score": number | null, "confidence": "high"|"medium"|"low" } ]
}
אם זהו מבחן עם ציונים גלויים (למשל טבלת שם+ציון, או ציון בודד רשום בכתב יד), חלץ אותם למערך grades.
אם אין ציונים גלויים, החזר grades כמערך ריק.
אל תמציא נתונים שאינך רואה בבירור במסמך.`;

export async function analyzeDocument(params: {
  base64Data: string;
  mediaType: string; // image/jpeg, image/png, application/pdf
}): Promise<AiAnalysisResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error(
      "לא הוגדר VITE_ANTHROPIC_API_KEY. בפרודקשן מומלץ להעביר קריאה זו דרך Supabase Edge Function כדי לא לחשוף את המפתח בצד לקוח."
    );
  }

  const contentBlock =
    params.mediaType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: params.mediaType, data: params.base64Data } }
      : { type: "image", source: { type: "base64", media_type: params.mediaType, data: params.base64Data } };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: "נתח את המסמך המצורף לפי ההוראות." }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`שגיאה בקריאה ל-API: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  if (!textBlock) throw new Error("לא התקבלה תשובת טקסט מהמודל.");

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as AiAnalysisResult;
  } catch {
    throw new Error("לא ניתן היה לפענח את תשובת ה-AI כ-JSON תקין.");
  }
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}

