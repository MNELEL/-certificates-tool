import bidiFactory from "bidi-js";

const bidi = bidiFactory();

/**
 * jsPDF מצייר טקסט תמיד בכיוון LTR ויזואלי, ואינו מבצע bidi reordering בעצמו.
 * הפונקציה הזו ממירה טקסט בסדר לוגי (כפי שהוא נכתב/נשמר, כולל עברית מעורבת
 * עם מספרים/לטינית) לסדר ויזואלי, כדי שכאשר jsPDF "יצייר משמאל לימין" הפלט
 * ייראה נכון לעין (RTL אמיתי, עם מספרים שנשארים בכיוון הקריאה שלהם).
 */
export function toVisualRTL(text: string): string {
  if (!text) return text;
  const embeddingLevels = bidi.getEmbeddingLevels(text);
  return bidi.getReorderedString(text, embeddingLevels);
}

/**
 * עוזר לציור טקסט עברי/מעורב במיקום נכון, כאשר ה-align המבוקש הוא
 * מנקודת המבט ה"טבעית" (ימין/מרכז/שמאל) ולא ה-align הפנימי של jsPDF.
 * מכיוון שהטקסט כבר הפוך ויזואלית, "align: right" הרגיל של jsPDF אכן ממקם
 * את קצה הטקסט הוויזואלי בצד הנכון.
 */
export function rtlText(text: string): string {
  return toVisualRTL(text);
}
