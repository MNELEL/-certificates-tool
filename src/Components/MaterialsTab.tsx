import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { analyzeDocument, fileToBase64 } from "../lib/aiAnalysis";
import type { Material, Subject, Student } from "../types";

export default function MaterialsTab({ classId }: { classId: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const [{ data: m }, { data: s }, { data: st }] = await Promise.all([
      supabase.from("materials").select("*").eq("class_id", classId).order("uploaded_at", { ascending: false }),
      supabase.from("subjects").select("*").eq("class_id", classId),
      supabase.from("students").select("*").eq("class_id", classId),
    ]);
    if (m) setMaterials(m as Material[]);
    if (s) setSubjects(s as Subject[]);
    if (st) setStudents(st as Student[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("לא מחובר");

      for (const file of Array.from(files)) {
        const path = `${userData.user.id}/${classId}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("materials").upload(path, file);
        if (uploadErr) throw uploadErr;

        await supabase.from("materials").insert({
          class_id: classId,
          file_path: path,
          file_name: file.name,
          file_type: file.type,
          status: "pending",
        });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאה");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function runAiAnalysis(material: Material) {
    setAnalyzingId(material.id);
    setError(null);
    try {
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("materials")
        .download(material.file_path);
      if (dlErr || !fileData) throw dlErr ?? new Error("שגיאה בהורדת הקובץ");

      const file = new File([fileData], material.file_name, { type: material.file_type ?? undefined });
      const base64 = await fileToBase64(file);
      const mediaType = material.file_type || "image/jpeg";

      const result = await analyzeDocument({ base64Data: base64, mediaType });

      // ניסיון להתאים מקצוע קיים לפי ניחוש ה-AI (התאמה טקסטואלית פשוטה)
      const matchedSubject = subjects.find((s) =>
        result.detected_subject_guess
          ? s.name.includes(result.detected_subject_guess) || result.detected_subject_guess.includes(s.name)
          : false
      );

      await supabase
        .from("materials")
        .update({
          ai_detected_type: result.detected_type,
          ai_detected_date: result.detected_date,
          ai_summary: result.summary,
          subject_id: matchedSubject?.id ?? material.subject_id,
          status: "processed",
        })
        .eq("id", material.id);

      // אם זוהה מבחן עם ציונים - ניצור מבחן טיוטה ונשייך ציונים מוצעים (רק אם יש מקצוע משויך)
      if (result.grades.length > 0 && matchedSubject) {
        const { data: examData, error: examErr } = await supabase
          .from("exams")
          .insert({
            class_id: classId,
            subject_id: matchedSubject.id,
            material_id: material.id,
            title: result.summary.slice(0, 80),
            exam_date: result.detected_date,
            period: "a",
          })
          .select()
          .single();

        if (!examErr && examData) {
          for (const g of result.grades) {
            const matchedStudent = students.find(
              (s) => s.full_name.includes(g.student_name) || g.student_name.includes(s.full_name)
            );
            if (matchedStudent && g.score !== null) {
              await supabase.from("grades").insert({
                exam_id: examData.id,
                student_id: matchedStudent.id,
                ai_suggested_score: g.score,
                status: "pending",
                source_material_id: material.id,
              });
            }
          }
        }
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בניתוח ה-AI");
    } finally {
      setAnalyzingId(null);
    }
  }

  async function updateMaterialSubject(materialId: string, subjectId: string) {
    await supabase.from("materials").update({ subject_id: subjectId || null }).eq("id", materialId);
    load();
  }

  const typeLabels: Record<string, string> = {
    test: "מבחן",
    worksheet: "דף עבודה",
    material: "חומר לימוד",
    other: "אחר",
  };

  return (
    <div>
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
        <h3 className="font-semibold text-stone-800 mb-3">העלאת חומרים / מבחנים</h3>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => handleUpload(e.target.files)}
          className="text-sm"
        />
        {uploading && <p className="text-sm text-stone-500 mt-2">מעלה קבצים...</p>}
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <div className="space-y-3">
        {materials.map((m) => (
          <div key={m.id} className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex justify-between items-start gap-3 flex-wrap">
              <div>
                <p className="font-medium text-stone-800">{m.file_name}</p>
                <p className="text-xs text-stone-400">
                  הועלה: {new Date(m.uploaded_at).toLocaleDateString("he-IL")}
                </p>
                {m.ai_summary && <p className="text-sm text-stone-600 mt-1">{m.ai_summary}</p>}
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  {m.ai_detected_type && (
                    <span className="text-xs bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">
                      {typeLabels[m.ai_detected_type] ?? m.ai_detected_type}
                    </span>
                  )}
                  {m.ai_detected_date && (
                    <span className="text-xs bg-stone-100 text-stone-600 rounded-full px-2 py-0.5">
                      {m.ai_detected_date}
                    </span>
                  )}
                  <select
                    value={m.subject_id ?? ""}
                    onChange={(e) => updateMaterialSubject(m.id, e.target.value)}
                    className="text-xs border border-stone-300 rounded-full px-2 py-0.5"
                  >
                    <option value="">ללא מקצוע</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => runAiAnalysis(m)}
                disabled={analyzingId === m.id}
                className="text-sm bg-stone-800 text-white rounded-lg px-3 py-1.5 hover:bg-stone-700 disabled:opacity-50 whitespace-nowrap"
              >
                {analyzingId === m.id ? "מנתח..." : m.status === "processed" ? "נתח שוב" : "נתח עם AI"}
              </button>
            </div>
          </div>
        ))}
        {materials.length === 0 && <p className="text-stone-400 text-sm">עדיין לא הועלו חומרים.</p>}
      </div>
    </div>
  );
}
