export interface Report {
  id: string;
  created_at: string;
  source: "citizen" | "311";
  status: string;
  category: string;
  title: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  neighborhood: string | null;
  photo_url: string | null;
  supporters_count: number;
  author_device_hash: string | null;
  external_id: string | null;
  project_id: string | null;
  contract_id: string | null;
  contractor_name: string | null;
}

export interface ReportSupport {
  id: string;
  report_id: string;
  device_hash: string;
  created_at: string;
}

export type ReportCategory =
  | "pothole"
  | "streetlight"
  | "sidewalk"
  | "trash"
  | "other";

export type ReportStatus =
  | "unresolved"
  | "open"
  | "closed"
  | "pending"
  | "fixed";
