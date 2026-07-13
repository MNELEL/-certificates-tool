import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { calculateAverages, generateCertificatePdf } from "../lib/certificateGenerator";
import type { Student, Subject, Exam, Grade } from "../types";

type PeriodFilter = "a" | "b" | "full_year";

export default function CertificatesTab({ classId, className }: { classId: string; className: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>("full_year");
  const [generating, setGenerating] = useState<string | null>(null);

  async function load() {
    const [{ data: st }, { data: su }, { data: ex }] = await Promise.all([
      supabase.from("students").select("*").eq("class_id", classId).order("full_name"),
      supabase.from("subjects").select("*").eq("class_id", classId),
      supabase.from("exams").select("*").eq("class_id", classId),
    ]);
    if (st) setStudents(st as Student[]);
    if (su) setSubjects(su as Subject[]);
    if (ex) setExams(ex as Exam[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const periodLabels: Record<PeriodFilter, string> = {
    a: "תעודת מחצית א׳",
    b: "תעודת מחצית ב׳",
    full_year: "תעודת סוף שנה",
  };

  async function generateForStudent(student: Student) {
    setGenerating(student.id);
    try {
      const relevantExams = exams.filter((e) => period === "full_year" || e.period === period);
      const examIds = relevantExams.map((e) => e.id);

      const { data: gradesData } = await supabase
        .from("grades")
        .select("*")
        .eq("student_id", student.id)
        .in("exam_id", examIds.length ? examIds : ["00000000-0000-0000-0000-000000000000"]);

      const grades = (gradesData ?? []) as Grade[];

      const gradeRows = grades
        .map((g) => {
          const exam = relevantExams.find((e) => e.id === g.exam_id);
          const subject = subjects.find((s) => s.id === exam?.subject_id);
          const score = g.confirmed_score ?? null;
          return subject ? { subject_name: subject.name, score } : null;
        })
        .filter((r): r is { subject_name: string; score: number | null } => r !== null);

      const { subjects: subjectAverages, overall_average } = calculateAverages(gradeRows);

      const pdf = generateCertificatePdf({
        student_name: student.full_name,
        class_name: className,
        period_label: periodLabels[period],
        subjects: subjectAverages,
        overall_average,
        generated_date: new Date().toLocaleDateString("he-IL"),
      });

      pdf.save(`תעודה_${student.full_name}_${periodLabels[period]}.pdf`);

      await supabase.from("certificates").insert({
        student_id: student.id,
        class_id: classId,
        period,
      });
    } finally {
      setGenerating(null);
    }
  }

  async function generateForAll() {
    for (const student of students) {
      // eslint-disable-next-line no-await-in-loop
      await generateForStudent(student);
    }
  }

  return (
    <div>
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
        <label className="text-sm text-stone-600">סוג תעודה:</label>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
        >
          <option value="a">מחצית א׳</option>
          <option value="b">מחצית ב׳</option>
          <option value="full_year">סוף שנה (שנתי)</option>
        </select>
        <button
          onClick={generateForAll}
          className="bg-stone-800 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-stone-700 mr-auto"
        >
          הפק תעודות לכל הכיתה
        </button>
      </div>

      <div className="space-y-2">
        {students.map((s) => (
          <div
            key={s.id}
            className="bg-white border border-stone-200 rounded-xl p-3 flex justify-between items-center"
          >
            <span className="text-sm text-stone-800">{s.full_name}</span>
            <button
              onClick={() => generateForStudent(s)}
              disabled={generating === s.id}
              className="text-sm bg-stone-100 text-stone-700 rounded-lg px-3 py-1.5 hover:bg-stone-200 disabled:opacity-50"
            >
              {generating === s.id ? "מפיק..." : "הפק תעודה"}
            </button>
          </div>
        ))}
        {students.length === 0 && <p className="text-stone-400 text-sm">אין תלמידים בכיתה זו עדיין.</p>}
      </div>
    </div>
  );
}
