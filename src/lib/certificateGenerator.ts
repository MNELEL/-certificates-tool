import jsPDF from "jspdf";
import { HeeboRegularBase64 } from "../assets/fonts/heeboRegularBase64";
import { HeeboBoldBase64 } from "../assets/fonts/heeboBoldBase64";
import { rtlText } from "./rtlText";

export interface SubjectAverage {
  subject_name: string;
  average: number | null;
  exam_count: number;
}

export interface CertificateData {
  student_name: string;
  class_name: string;
  period_label: string; // 'תעודת מחצית א׳' וכו'
  subjects: SubjectAverage[];
  overall_average: number | null;
  generated_date: string;
}

/** רושם את פונט Heebo (Regular + Bold) בתוך מופע jsPDF נתון. */
function registerHeeboFont(doc: jsPDF) {
  doc.addFileToVFS("Heebo-Regular.ttf", HeeboRegularBase64);
  doc.addFont("Heebo-Regular.ttf", "Heebo", "normal");
  doc.addFileToVFS("Heebo-Bold.ttf", HeeboBoldBase64);
  doc.addFont("Heebo-Bold.ttf", "Heebo", "bold");
}

/**
 * הפקת תעודת PDF עם תמיכה מלאה בעברית: פונט Unicode מוטמע (Heebo) + היפוך
 * bidi ויזואלי של הטקסט, כך שהתעודה תוצג נכון בכל קורא PDF, כולל RTL אמיתי
 * וסדר קריאה נכון עבור מספרים (ציונים, תאריכים) בתוך משפט עברי.
 */
export function generateCertificatePdf(data: CertificateData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  registerHeeboFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const rightMargin = 20;
  const leftMargin = 20;

  // מסגרת דקורטיבית
  doc.setDrawColor(180, 160, 120);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, pageWidth - 20, doc.internal.pageSize.getHeight() - 20);

  // כותרת
  doc.setFont("Heebo", "bold");
  doc.setFontSize(24);
  doc.setTextColor(40, 40, 40);
  doc.text(rtlText(data.period_label), pageWidth / 2, 32, { align: "center" });

  // שם תלמיד + כיתה
  doc.setFont("Heebo", "normal");
  doc.setFontSize(15);
  doc.text(rtlText(`${data.student_name}  |  ${data.class_name}`), pageWidth / 2, 45, {
    align: "center",
  });

  // קו הפרדה
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(leftMargin, 52, pageWidth - rightMargin, 52);

  // כותרות טבלה - מכיוון שהטקסט RTL, "מקצוע" מוצג בצד ימין ו"ממוצע" בצד שמאל
  let y = 64;
  doc.setFont("Heebo", "bold");
  doc.setFontSize(12);
  doc.text(rtlText("מקצוע"), pageWidth - rightMargin, y, { align: "right" });
  doc.text(rtlText("ממוצע"), leftMargin + 20, y, { align: "left" });
  y += 4;
  doc.setDrawColor(150, 150, 150);
  doc.line(leftMargin, y, pageWidth - rightMargin, y);
  y += 9;

  // שורות מקצועות
  doc.setFont("Heebo", "normal");
  doc.setFontSize(12);
  if (data.subjects.length === 0) {
    doc.setTextColor(150, 150, 150);
    doc.text(rtlText("אין ציונים רשומים לתקופה זו"), pageWidth / 2, y, { align: "center" });
    y += 9;
    doc.setTextColor(40, 40, 40);
  } else {
    data.subjects.forEach((s) => {
      doc.text(rtlText(s.subject_name), pageWidth - rightMargin, y, { align: "right" });
      doc.text(s.average !== null ? s.average.toFixed(1) : "-", leftMargin + 20, y, {
        align: "left",
      });
      y += 9;
    });
  }

  y += 6;
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, pageWidth - rightMargin, y);
  y += 12;

  // ממוצע כללי
  doc.setFont("Heebo", "bold");
  doc.setFontSize(16);
  const overallText =
    data.overall_average !== null
      ? `ממוצע כללי: ${data.overall_average.toFixed(1)}`
      : "ממוצע כללי: -";
  doc.text(rtlText(overallText), pageWidth / 2, y, { align: "center" });

  // תאריך בתחתית
  doc.setFont("Heebo", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(rtlText(`הופק בתאריך: ${data.generated_date}`), pageWidth / 2, 280, {
    align: "center",
  });

  return doc;
}

export function calculateAverages(
  grades: { subject_name: string; score: number | null }[]
): { subjects: SubjectAverage[]; overall_average: number | null } {
  const bySubject = new Map<string, number[]>();
  grades.forEach((g) => {
    if (g.score === null) return;
    const arr = bySubject.get(g.subject_name) ?? [];
    arr.push(g.score);
    bySubject.set(g.subject_name, arr);
  });

  const subjects: SubjectAverage[] = Array.from(bySubject.entries()).map(([name, scores]) => ({
    subject_name: name,
    average: scores.reduce((a, b) => a + b, 0) / scores.length,
    exam_count: scores.length,
  }));

  const allScores = subjects.filter((s) => s.average !== null).map((s) => s.average as number);
  const overall_average = allScores.length
    ? allScores.reduce((a, b) => a + b, 0) / allScores.length
    : null;

  return { subjects, overall_average };
}
