export interface Report {
  id: string;
  created_at: string;
  source: "citizen" | "311";
  status: ReportStatus;
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
  cosign_count: number;
  last_cosign_at: string | null;
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
  | "road_damage"
  | "street_light"
  | "traffic_signal"
  | "water"
  | "sewer"
  | "other";

export type ReportStatus =
  | "unresolved"
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "verified"
  | "closed"
  | "pending"
  | "fixed";

// Pipeline stages in order
export const PIPELINE_STAGES: { key: ReportStatus; label: string }[] = [
  { key: "unresolved", label: "Open" },
  { key: "assigned", label: "Assigned" },
  { key: "in_progress", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
  { key: "verified", label: "Verified" },
];

// Map any status to its pipeline index (0-4)
export function getPipelineIndex(status: string): number {
  switch (status) {
    case "open":
    case "unresolved":
    case "pending":
      return 0;
    case "assigned":
      return 1;
    case "in_progress":
      return 2;
    case "resolved":
    case "closed":
    case "fixed":
      return 3;
    case "verified":
      return 4;
    default:
      return 0;
  }
}

// Get display label for any status
export function getStatusLabel(status: string): string {
  switch (status) {
    case "open":
    case "unresolved":
    case "pending":
      return "Open";
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In Progress";
    case "resolved":
    case "closed":
    case "fixed":
      return "Resolved";
    case "verified":
      return "Verified";
    default:
      return "Open";
  }
}

// Category to responsible agency
export function getCategoryAgency(category: string): string {
  switch (category) {
    case "pothole":
    case "road_damage":
    case "sidewalk":
    case "street_light":
    case "traffic_signal":
      return "Dept of Transportation (DOT)";
    case "water":
    case "sewer":
      return "Dept of Environmental Protection (DEP)";
    case "trash":
      return "Dept of Sanitation (DSNY)";
    default:
      return "311";
  }
}

// Agency Twitter handles for pre-filled tweets
export function getAgencyHandle(category: string): string {
  switch (category) {
    case "pothole":
    case "road_damage":
    case "sidewalk":
    case "street_light":
    case "traffic_signal":
      return "@NYC_DOT";
    case "water":
    case "sewer":
      return "@NYCwater";
    case "trash":
      return "@NYCSanitation";
    default:
      return "@NYC311";
  }
}

// Flavor reactions for long-press
export const FLAVOR_REACTIONS = [
  { emoji: "🔥", label: "Outrageous" },
  { emoji: "💀", label: "Dangerous" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "👀", label: "Watching" },
] as const;
