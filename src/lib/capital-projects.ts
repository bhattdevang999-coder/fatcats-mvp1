/**
 * Capital Projects Intelligence — Real NYC Open Data
 *
 * Pulls from NYC Capital Projects Dashboard (fb86-vt7u) via Socrata API.
 * Computes budget deltas, schedule slippage, and risk flags by comparing
 * the same project across multiple reporting periods.
 *
 * Data updates 3x/year (Jan/May/Sep) when OMB releases commitment plans.
 */

const NYC_API = "https://data.cityofnewyork.us/resource/fb86-vt7u.json";
// No auth needed for public data, but rate-limited without a token

// ── Types ──────────────────────────────────────────────────────────────

export interface ProjectSnapshot {
  reporting_period: string;
  total_budget: number;
  spend_to_date: number;
  spend_pct: number;
  current_phase: string;
  forecast_completion: string | null;
}

export interface TrackedProject {
  // Identity
  project_key: string;
  fms_id: string;
  pid: number | null;
  project_name: string;
  project_description: string | null;

  // Agency & location
  managing_agency: string | null;
  sponsor_agency: string | null;
  borough: string;
  community_board: string | null;
  category: string | null;

  // Current state (latest snapshot)
  current_phase: string;
  total_budget: number;
  spend_to_date: number;
  spend_pct: number;
  forecast_completion: string | null;
  actual_construction_start: string | null;
  actual_construction_end: string | null;

  // Budget intelligence (computed across snapshots)
  original_budget: number;
  budget_delta: number;
  budget_delta_pct: number;
  is_over_budget: boolean;

  // Schedule intelligence
  original_forecast: string | null;
  schedule_slip_days: number;
  is_overdue: boolean;
  days_overdue: number;
  is_behind_schedule: boolean;

  // History
  snapshots: ProjectSnapshot[];
  snapshot_count: number;
  latest_reporting_period: string;
}

export type ProjectFilter = "all" | "budget_blowups" | "over_budget" | "behind_schedule" | "stalled" | "construction" | "completed";

// ── Internal types for raw NYC data ────────────────────────────────────

interface RawNYCRow {
  reporting_period: string;
  managing_agency?: string;
  sponsor_agency?: string;
  pid?: string;
  fms_id?: string;
  total_budget?: string;
  spend_to_date?: string;
  spend_to_date_1?: string;
  fms_project_name?: string;
  agency_project_name?: string;
  agency_project_description?: string;
  current_phase?: string;
  current_phase_start?: string;
  forecast_current_phase_end?: string;
  forecast_completion?: string;
  actual_design_start?: string;
  actual_design_end?: string;
  actual_construction_start?: string;
  actual_construction_end?: string;
  borough?: string;
  community_board?: string;
  ten_year_plan_category?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function parseDate(d?: string): string | null {
  if (!d) return null;
  return d.split("T")[0];
}

function parseNum(s?: string): number {
  if (!s) return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function projectKey(row: RawNYCRow): string {
  return `${row.fms_id || "NOFMS"}-${row.pid || 0}`;
}

// ── Cache ──────────────────────────────────────────────────────────────

let cachedProjects: TrackedProject[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ── Fetch from NYC Open Data ───────────────────────────────────────────

async function fetchNYCData(params: string): Promise<RawNYCRow[]> {
  const url = `${NYC_API}?${params}`;
  const res = await fetch(url, { next: { revalidate: 3600 } }); // Cache 1hr in Next.js
  if (!res.ok) throw new Error(`NYC API: ${res.status}`);
  return res.json();
}

/**
 * Fetch all projects across all reporting periods and compute intelligence.
 * This is the main entry point — returns fully enriched TrackedProject[].
 */
export async function fetchTrackedProjects(options?: {
  borough?: string;
  category?: string;
  filter?: ProjectFilter;
  search?: string;
  limit?: number;
}): Promise<TrackedProject[]> {
  // Use cache if available
  if (cachedProjects && Date.now() - cacheTimestamp < CACHE_TTL) {
    return applyFilters(cachedProjects, options);
  }

  // Fetch latest reporting period first (most data, most recent)
  // Then fetch all other periods for the same projects to build history
  const latestRows = await fetchNYCData(
    `$where=reporting_period='202509'&$limit=50000&$order=total_budget DESC`
  );

  // Get all other periods for budget tracking
  const historyRows = await fetchNYCData(
    `$where=reporting_period!='202509'&$limit=50000&$order=fms_id,reporting_period`
  );

  const allRows = [...latestRows, ...historyRows];

  // Group by project key
  const projectMap = new Map<string, RawNYCRow[]>();
  const seen = new Set<string>();

  for (const row of allRows) {
    const pk = projectKey(row);
    const dedupKey = `${pk}-${row.reporting_period}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    if (!projectMap.has(pk)) projectMap.set(pk, []);
    projectMap.get(pk)!.push(row);
  }

  // Build TrackedProject for each
  const projects: TrackedProject[] = [];

  for (const [pk, rows] of Array.from(projectMap)) {
    // Sort by reporting period
    rows.sort((a, b) => (a.reporting_period || "").localeCompare(b.reporting_period || ""));

    const first = rows[0];
    const latest = rows[rows.length - 1];

    // Skip projects with no name or zero budget
    const name = latest.agency_project_name || latest.fms_project_name;
    const budget = parseNum(latest.total_budget);
    if (!name || budget === 0) continue;

    // Build snapshot history
    const snapshots: ProjectSnapshot[] = rows.map(r => ({
      reporting_period: r.reporting_period,
      total_budget: parseNum(r.total_budget),
      spend_to_date: parseNum(r.spend_to_date),
      spend_pct: parseNum(r.spend_to_date_1),
      current_phase: r.current_phase || "(Unknown)",
      forecast_completion: parseDate(r.forecast_completion),
    }));

    // Budget intelligence
    const firstBudget = parseNum(first.total_budget);
    const latestBudget = budget;
    const budgetDelta = latestBudget - firstBudget;
    const budgetDeltaPct = firstBudget > 0 ? (budgetDelta / firstBudget) * 100 : 0;
    const isOverBudget = budgetDeltaPct > 5; // >5% increase = flagged

    // Schedule intelligence
    const firstForecast = parseDate(first.forecast_completion);
    const latestForecast = parseDate(latest.forecast_completion);
    let scheduleSlipDays = 0;
    if (firstForecast && latestForecast && firstForecast !== latestForecast) {
      scheduleSlipDays = Math.round(
        (new Date(latestForecast).getTime() - new Date(firstForecast).getTime()) / 86400000
      );
    }

    const now = Date.now();
    const forecastDate = latestForecast ? new Date(latestForecast).getTime() : null;
    const phase = latest.current_phase || "";
    const isTerminal = phase === "(Completed)" || phase === "Close-out" || phase === "(Cancelled)";
    const daysOverdue = forecastDate && !isTerminal ? Math.round((now - forecastDate) / 86400000) : 0;
    const isOverdue = daysOverdue > 0;
    const isBehindSchedule = isOverdue || scheduleSlipDays > 90;

    projects.push({
      project_key: pk,
      fms_id: latest.fms_id || "",
      pid: latest.pid ? parseInt(latest.pid) : null,
      project_name: name,
      project_description: latest.agency_project_description === "<blank>" ? null : (latest.agency_project_description || null),
      managing_agency: latest.managing_agency || null,
      sponsor_agency: latest.sponsor_agency || null,
      borough: latest.borough || "Citywide",
      community_board: latest.community_board || null,
      category: latest.ten_year_plan_category || null,
      current_phase: phase || "(Unknown)",
      total_budget: latestBudget,
      spend_to_date: parseNum(latest.spend_to_date),
      spend_pct: parseNum(latest.spend_to_date_1),
      forecast_completion: latestForecast,
      actual_construction_start: parseDate(latest.actual_construction_start),
      actual_construction_end: parseDate(latest.actual_construction_end),
      original_budget: firstBudget,
      budget_delta: budgetDelta,
      budget_delta_pct: Math.round(budgetDeltaPct * 10) / 10,
      is_over_budget: isOverBudget,
      original_forecast: firstForecast,
      schedule_slip_days: scheduleSlipDays,
      is_overdue: isOverdue,
      days_overdue: Math.max(0, daysOverdue),
      is_behind_schedule: isBehindSchedule,
      snapshots,
      snapshot_count: snapshots.length,
      latest_reporting_period: latest.reporting_period,
    });
  }

  // Sort by budget descending
  projects.sort((a, b) => b.total_budget - a.total_budget);

  // Cache
  cachedProjects = projects;
  cacheTimestamp = Date.now();

  return applyFilters(projects, options);
}

function applyFilters(
  projects: TrackedProject[],
  options?: {
    borough?: string;
    category?: string;
    filter?: ProjectFilter;
    search?: string;
    limit?: number;
  }
): TrackedProject[] {
  let result = [...projects];

  if (options?.borough && options.borough !== "All") {
    result = result.filter(p => p.borough === options.borough);
  }

  if (options?.category) {
    result = result.filter(p => p.category === options.category);
  }

  if (options?.filter && options.filter !== "all") {
    switch (options.filter) {
      case "budget_blowups":
        result = result.filter(p => p.is_over_budget && p.budget_delta_pct > 50);
        result.sort((a, b) => b.budget_delta_pct - a.budget_delta_pct);
        break;
      case "over_budget":
        result = result.filter(p => p.is_over_budget);
        result.sort((a, b) => b.budget_delta_pct - a.budget_delta_pct);
        break;
      case "behind_schedule":
        result = result.filter(p => p.is_behind_schedule);
        result.sort((a, b) => b.days_overdue - a.days_overdue);
        break;
      case "stalled":
        result = result.filter(p =>
          p.current_phase === "(On-Hold)" ||
          p.current_phase === "(Inactive)" ||
          (p.is_overdue && p.days_overdue > 365)
        );
        break;
      case "construction":
        result = result.filter(p => p.current_phase === "Construction");
        break;
      case "completed":
        result = result.filter(p =>
          p.current_phase === "(Completed)" || p.current_phase === "Close-out"
        );
        break;
    }
  }

  if (options?.search) {
    const q = options.search.toLowerCase();
    result = result.filter(p =>
      p.project_name.toLowerCase().includes(q) ||
      (p.project_description || "").toLowerCase().includes(q) ||
      (p.sponsor_agency || "").toLowerCase().includes(q) ||
      (p.managing_agency || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      p.borough.toLowerCase().includes(q)
    );
  }

  if (options?.limit) {
    result = result.slice(0, options.limit);
  }

  return result;
}

/**
 * Get a single project by fms_id (for detail page).
 */
export async function getProjectByFmsId(fmsId: string): Promise<TrackedProject | null> {
  const all = await fetchTrackedProjects();
  return all.find(p => p.fms_id === fmsId) || null;
}

/**
 * Get aggregate stats for the dashboard header.
 */
export async function getContractStats(): Promise<{
  totalProjects: number;
  totalBudget: number;
  totalSpent: number;
  overBudgetCount: number;
  behindScheduleCount: number;
  overBudgetTotal: number;
  totalOverrunAmount: number;
}> {
  const all = await fetchTrackedProjects();
  const overBudget = all.filter(p => p.is_over_budget);
  const behindSchedule = all.filter(p => p.is_behind_schedule);

  const totalOverrunAmount = overBudget.reduce((s, p) => s + Math.max(0, p.budget_delta), 0);

  return {
    totalProjects: all.length,
    totalBudget: all.reduce((s, p) => s + p.total_budget, 0),
    totalSpent: all.reduce((s, p) => s + p.spend_to_date, 0),
    overBudgetCount: overBudget.length,
    behindScheduleCount: behindSchedule.length,
    overBudgetTotal: totalOverrunAmount,
    totalOverrunAmount,
  };
}

// ── Expose Summary Generator ──────────────────────────────────────────

export function generateExposeSummary(project: TrackedProject): string {
  const spendPct = project.total_budget > 0
    ? Math.round((project.spend_to_date / project.total_budget) * 100)
    : 0;
  let text = `This ${project.category || "capital"} project in ${project.borough} was originally budgeted at ${formatMoney(project.original_budget)}. It has since ballooned to ${formatMoney(project.total_budget)} — a ${project.budget_delta_pct}% increase. ${spendPct}% of the inflated budget has been spent so far.`;
  if (project.is_overdue && project.days_overdue > 0) {
    text += ` The project is ${formatDays(project.days_overdue)} overdue.`;
  }
  if (project.schedule_slip_days > 0) {
    text += ` The timeline has slipped by ${formatDays(project.schedule_slip_days)}.`;
  }
  return text;
}

// ── Formatting helpers ────────────────────────────────────────────────

export function formatMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

export function formatDays(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return months > 0 ? `${years}y ${months}mo` : `${years}y`;
  }
  if (days >= 30) return `${Math.floor(days / 30)} months`;
  return `${days} days`;
}

export function phaseLabel(phase: string): string {
  return phase.replace(/^\(|\)$/g, ""); // "(Pending)" → "Pending"
}

export function phaseColor(phase: string): string {
  switch (phase) {
    case "Construction": return "text-amber-400 bg-amber-400/10 border-amber-400/20";
    case "Design": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "(Completed)": return "text-green-400 bg-green-400/10 border-green-400/20";
    case "Close-out": return "text-green-400 bg-green-400/10 border-green-400/20";
    case "Construction Procurement": return "text-purple-400 bg-purple-400/10 border-purple-400/20";
    case "(On-Hold)": return "text-red-400 bg-red-400/10 border-red-400/20";
    case "(Inactive)": return "text-red-400 bg-red-400/10 border-red-400/20";
    case "(Cancelled)": return "text-[var(--fc-muted)] bg-white/5 border-white/10";
    default: return "text-[var(--fc-muted)] bg-white/5 border-white/10";
  }
}

/** Agency acronym → full name */
export function agencyName(code: string | null): string {
  const map: Record<string, string> = {
    DDC: "Dept. of Design & Construction",
    DOT: "Dept. of Transportation",
    DEP: "Dept. of Environmental Protection",
    DPR: "Dept. of Parks & Recreation",
    DCAS: "Dept. of Citywide Admin. Services",
    DSNY: "Dept. of Sanitation",
    FDNY: "Fire Dept.",
    NYPD: "Police Dept.",
    DOC: "Dept. of Correction",
    EDC: "Economic Development Corp.",
    DHS: "Dept. of Homeless Services",
    DCLA: "Dept. of Cultural Affairs",
    SCA: "School Construction Authority",
  };
  return code ? (map[code] || code) : "Unknown Agency";
}
