import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Student, Subject } from "../types";

export default function StudentsSubjectsTab({ classId }: { classId: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newStudent, setNewStudent] = useState("");
  const [newSubject, setNewSubject] = useState("");

  async function load() {
    const [{ data: st }, { data: su }] = await Promise.all([
      supabase.from("students").select("*").eq("class_id", classId).order("full_name"),
      supabase.from("subjects").select("*").eq("class_id", classId).order("name"),
    ]);
    if (st) setStudents(st as Student[]);
    if (su) setSubjects(su as Subject[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!newStudent.trim()) return;
    await supabase.from("students").insert({ class_id: classId, full_name: newStudent.trim() });
    setNewStudent("");
    load();
  }

  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject.trim()) return;
    await supabase.from("subjects").insert({ class_id: classId, name: newSubject.trim() });
    setNewSubject("");
    load();
  }

  async function removeStudent(id: string) {
    await supabase.from("students").delete().eq("id", id);
    load();
  }

  async function removeSubject(id: string) {
    await supabase.from("subjects").delete().eq("id", id);
    load();
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="bg-white border border-stone-200 rounded-xl p-4">
        <h3 className="font-semibold text-stone-800 mb-3">תלמידים</h3>
        <form onSubmit={addStudent} className="flex gap-2 mb-3">
          <input
            value={newStudent}
            onChange={(e) => setNewStudent(e.target.value)}
            placeholder="שם תלמיד"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
          <button className="bg-stone-800 text-white rounded-lg px-3 py-1.5 text-sm">הוסף</button>
        </form>
        <ul className="space-y-1">
          {students.map((s) => (
            <li key={s.id} className="flex justify-between items-center text-sm py-1 border-b border-stone-100">
              <span>{s.full_name}</span>
              <button onClick={() => removeStudent(s.id)} className="text-stone-400 hover:text-red-500 text-xs">
                הסר
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border border-stone-200 rounded-xl p-4">
        <h3 className="font-semibold text-stone-800 mb-3">מקצועות</h3>
        <form onSubmit={addSubject} className="flex gap-2 mb-3">
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="שם מקצוע (למשל: גמרא)"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          />
          <button className="bg-stone-800 text-white rounded-lg px-3 py-1.5 text-sm">הוסף</button>
        </form>
        <ul className="space-y-1">
          {subjects.map((s) => (
            <li key={s.id} className="flex justify-between items-center text-sm py-1 border-b border-stone-100">
              <span>{s.name}</span>
              <button onClick={() => removeSubject(s.id)} className="text-stone-400 hover:text-red-500 text-xs">
                הסר
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
