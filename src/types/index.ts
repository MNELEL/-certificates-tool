export interface ClassRow {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export interface Student {
  id: string;
  class_id: string;
  full_name: string;
  created_at: string;
}

export interface Subject {
  id: string;
  class_id: string;
  name: string;
  created_at: string;
}

export type MaterialStatus = "pending" | "processed" | "error";
export type MaterialType = "test" | "worksheet" | "material" | "other";

export interface Material {
  id: string;
  class_id: string;
  subject_id: string | null;
  file_path: string;
  file_name: string;
  file_type: string | null;
  ai_detected_type: MaterialType | null;
  ai_detected_date: string | null;
  ai_summary: string | null;
  status: MaterialStatus;
  uploaded_at: string;
}

export type ExamPeriod = "a" | "b";

export interface Exam {
  id: string;
  class_id: string;
  subject_id: string;
  material_id: string | null;
  title: string;
  exam_date: string | null;
  max_score: number;
  period: ExamPeriod;
  created_at: string;
}

export type GradeStatus = "pending" | "confirmed" | "edited";

export interface Grade {
  id: string;
  exam_id: string;
  student_id: string;
  ai_suggested_score: number | null;
  confirmed_score: number | null;
  status: GradeStatus;
  source_material_id: string | null;
  updated_at: string;
}

export interface Certificate {
  id: string;
  student_id: string;
  class_id: string;
  period: "a" | "b" | "full_year";
  generated_at: string;
  pdf_path: string | null;
}
