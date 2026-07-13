import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import type { ClassRow } from "../types";

export default function Dashboard() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadClasses() {
    setLoading(true);
    const { data, error } = await supabase
      .from("classes")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setClasses(data as ClassRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadClasses();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase
      .from("classes")
      .insert({ name: newName.trim(), owner_id: userData.user.id });
    if (!error) {
      setNewName("");
      loadClasses();
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-stone-800">הכיתות שלי</h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-stone-500 hover:underline"
        >
          התנתקות
        </button>
      </div>

      <form onSubmit={handleCreate} className="flex gap-2 mb-8">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="שם כיתה חדשה (למשל: כיתה ה׳1)"
          className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-400"
        />
        <button className="bg-stone-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-stone-700">
          הוסף כיתה
        </button>
      </form>

      {loading ? (
        <p className="text-stone-400 text-sm">טוען...</p>
      ) : classes.length === 0 ? (
        <p className="text-stone-400 text-sm">עדיין אין כיתות. הוסף כיתה כדי להתחיל.</p>
      ) : (
        <div className="grid gap-3">
          {classes.map((c) => (
            <Link
              key={c.id}
              to={`/class/${c.id}`}
              className="block bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-400 transition-colors"
            >
              <span className="font-medium text-stone-800">{c.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
