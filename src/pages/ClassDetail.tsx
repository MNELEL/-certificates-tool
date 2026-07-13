import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { ClassRow } from "../types";
import StudentsSubjectsTab from "../components/StudentsSubjectsTab";
import MaterialsTab from "../components/MaterialsTab";
import GradesTab from "../components/GradesTab";
import CertificatesTab from "../components/CertificatesTab";

type Tab = "students" | "materials" | "grades" | "certificates";

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const [classRow, setClassRow] = useState<ClassRow | null>(null);
  const [tab, setTab] = useState<Tab>("students");

  useEffect(() => {
    if (!id) return;
    supabase
      .from("classes")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => setClassRow(data as ClassRow));
  }, [id]);

  if (!id) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "students", label: "תלמידים ומקצועות" },
    { key: "materials", label: "חומרים ומבחנים" },
    { key: "grades", label: "ציונים" },
    { key: "certificates", label: "תעודות" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link to="/" className="text-sm text-stone-500 hover:underline">
        ← חזרה לכיתות
      </Link>
      <h1 className="text-2xl font-bold text-stone-800 mt-2 mb-6">{classRow?.name ?? "טוען..."}</h1>

      <div className="flex gap-1 mb-6 border-b border-stone-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? "border-stone-800 text-stone-800"
                : "border-transparent text-stone-400 hover:text-stone-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "students" && <StudentsSubjectsTab classId={id} />}
      {tab === "materials" && <MaterialsTab classId={id} />}
      {tab === "grades" && <GradesTab classId={id} />}
      {tab === "certificates" && <CertificatesTab classId={id} className={classRow?.name ?? ""} />}
    </div>
  );
}
