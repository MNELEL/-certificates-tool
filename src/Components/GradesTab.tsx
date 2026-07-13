import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Exam, Grade, Student, Subject } from "../types";

export default function GradesTab({ classId }: { classId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");

  // טופס יצירת מבחן ידני
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamSubject, setNewExamSubject] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamPeriod, setNewExamPeriod] = useState<"a" | "b">("a");

  async function load() {
    const [{ data: e }, { data: s }, { data: st }] = await Promise.all([
      supabase.from("exams").select("*").eq("class_id", classId).order("exam_date", { ascending: false }),
      supabase.from("subjects").select("*").eq("class_id", classId),
      supabase.from("students").select("*").eq("class_id", classId).order("full_name"),
    ]);
    if (e) setExams(e as Exam[]);
    if (s) setSubjects(s as Subject[]);
    if (st) setStudents(st as Student[]);
  }

  async function loadGrades(examId: string) {
    const { data } = await supabase.from("grades").select("*").eq("exam_id", examId);
    if (data) setGrades(data as Grade[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  useEffect(() => {
    if (selectedExam) loadGrades(selectedExam);
  }, [selectedExam]);

  async function createExam(e: React.FormEvent) {
    e.preventDefault();
    if (!newExamTitle.trim() || !newExamSubject) return;
    const { data, error } = await supabase
      .from("exams")
      .insert({
        class_id: classId,
        subject_id: newExamSubject,
        title: newExamTitle.trim(),
        exam_date: newExamDate || null,
        period: newExamPeriod,
      })
      .select()
      .single();
    if (!error && data) {
      setNewExamTitle("");
      setNewExamDate("");
      await load();
      setSelectedExam(data.id);
    }
  }

  async function upsertGrade(studentId: string, score: number | null, existing?: Grade) {
    if (existing) {
      await supabase
        .from("grades")
        .update({ confirmed_score: score, status: "edited", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("grades").insert({
        exam_id: selectedExam,
        student_id: studentId,
        confirmed_score: score,
        status: "edited",
      });
    }
    loadGrades(selectedExam);
  }

  async function confirmAiSuggestion(grade: Grade) {
    await supabase
      .from("grades")
      .update({ confirmed_score: grade.ai_suggested_score, status: "confirmed" })
      .eq("id", grade.id);
    loadGrades(selectedExam);
  }

  const currentExam = exams.find((e) => e.id === selectedExam);

  return (
    <div>
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-stone-800 mb-3">מבחן חדש (ידני)</h3>
        <form onSubmit={createExam} className="grid sm:grid-cols-4 gap-2">
          <input
            value={newExamTitle}
            onChange={(e) => setNewExamTitle(e.target.value)}
            placeholder="שם המבחן"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm sm:col-span-2"
          />
          <select
            value={newExamSubject}
            onChange={(e) => setNewExamSubject(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">בחר מקצוע</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={newExamPeriod}
            onChange={(e) => setNewExamPeriod(e.target.value as "a" | "b")}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="a">מחצית א׳</option>
            <option value="b">מחצית ב׳</option>
          </select>
          <input
            type="date"
            value={newExamDate}
            onChange={(e) => setNewExamDate(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
          <button className="bg-stone-800 text-white rounded-lg px-3 py-1.5 text-sm">צור מבחן</button>
        </form>
      </div>

      <div className="mb-4">
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm w-full sm:w-auto"
        >
          <option value="">בחר מבחן להצגת ציונים</option>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({subjects.find((s) => s.id === e.subject_id)?.name ?? "?"})
            </option>
          ))}
        </select>
      </div>

      {currentExam && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="text-right px-4 py-2 font-medium">תלמיד</th>
                <th className="text-right px-4 py-2 font-medium">הצעת AI</th>
                <th className="text-right px-4 py-2 font-medium">ציון מאושר</th>
                <th className="text-right px-4 py-2 font-medium">סטטוס</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const grade = grades.find((g) => g.student_id === student.id);
                return (
                  <tr key={student.id} className="border-t border-stone-100">
                    <td className="px-4 py-2">{student.full_name}</td>
                    <td className="px-4 py-2 text-stone-500">
                      {grade?.ai_suggested_score ?? "-"}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={currentExam.max_score}
                        defaultValue={grade?.confirmed_score ?? ""}
                        onBlur={(e) =>
                          upsertGrade(
                            student.id,
                            e.target.value === "" ? null : Number(e.target.value),
                            grade
                          )
                        }
                        className="w-20 rounded border border-stone-300 px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          grade?.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : grade?.status === "edited"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {grade?.status === "confirmed" ? "מאושר" : grade?.status === "edited" ? "נערך" : "ממתין"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {grade?.ai_suggested_score != null && grade.status === "pending" && (
                        <button
                          onClick={() => confirmAiSuggestion(grade)}
                          className="text-xs text-stone-600 hover:underline"
                        >
                          אשר הצעת AI
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
