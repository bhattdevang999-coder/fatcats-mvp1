/**
 * Ingest NYC Capital Projects Dashboard data into Supabase.
 *
 * Source: https://data.cityofnewyork.us/resource/fb86-vt7u.json
 * Updated 3x/year by OMB (Jan/May/Sep).
 *
 * We pull ALL reporting periods so we can track budget changes over time.
 * Each row = one project in one reporting period = one "snapshot".
 *
 * Run: npx tsx scripts/ingest-capital-projects.ts
 */

const SUPABASE_URL = "https://pzbebhqnomtkzbaofyfh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YmViaHFub210a3piYW9meWZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDY0OTcsImV4cCI6MjA4OTA4MjQ5N30.5LifFYKnKriPSvPOWqB72zoDU_XYCgdSARN5eYODt_c";
const NYC_API = "https://data.cityofnewyork.us/resource/fb86-vt7u.json";

interface NYCProject {
  reporting_period: string;
  managing_agency?: string;
  sponsor_agency?: string;
  pid?: number;
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
  actual_construction?: string;
  actual_construction_1?: string;
  actual_construction_start?: string;
  actual_construction_end?: string;
  borough?: string;
  community_board?: string;
  budget_line?: string;
  ten_year_plan_category?: string;
  agency_data_date?: string;
  fms_data_date?: string;
}

async function fetchPage(offset: number, limit: number): Promise<NYCProject[]> {
  const url = `${NYC_API}?$limit=${limit}&$offset=${offset}&$order=fms_id,reporting_period`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NYC API error: ${res.status}`);
  return res.json();
}

async function supabaseUpsert(table: string, rows: Record<string, unknown>[]) {
  // Batch upsert in chunks of 500
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Supabase upsert error: ${res.status} - ${err}`);
    }
    console.log(`  Upserted ${i + chunk.length} rows...`);
  }
}

function parseDate(d?: string): string | null {
  if (!d) return null;
  return d.split("T")[0]; // "2023-05-11T00:00:00.000" → "2023-05-11"
}

function parseNum(s?: string): number | null {
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Derive a stable project key from fms_id + pid (some projects share fms_id but differ by pid)
function projectKey(row: NYCProject): string {
  return `${row.fms_id || "NOFMS"}-${row.pid || 0}`;
}

async function main() {
  console.log("Fetching NYC Capital Projects data...");

  const allRows: NYCProject[] = [];
  const PAGE_SIZE = 5000;
  let offset = 0;

  while (true) {
    console.log(`  Fetching page at offset ${offset}...`);
    const page = await fetchPage(offset, PAGE_SIZE);
    allRows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`Total rows fetched: ${allRows.length}`);

  // Group by project key to deduplicate (same project can appear twice in same period with different PIDs)
  // We want unique (project_key, reporting_period) pairs
  const seen = new Set<string>();
  const snapshots: Record<string, unknown>[] = [];

  for (const row of allRows) {
    const key = `${projectKey(row)}-${row.reporting_period}`;
    if (seen.has(key)) continue;
    seen.add(key);

    snapshots.push({
      project_key: projectKey(row),
      fms_id: row.fms_id || null,
      pid: row.pid || null,
      reporting_period: row.reporting_period,
      managing_agency: row.managing_agency || null,
      sponsor_agency: row.sponsor_agency || null,
      project_name: row.agency_project_name || row.fms_project_name || null,
      project_description: row.agency_project_description === "<blank>" ? null : (row.agency_project_description || null),
      total_budget: parseNum(row.total_budget),
      spend_to_date: parseNum(row.spend_to_date),
      spend_pct: parseNum(row.spend_to_date_1),
      current_phase: row.current_phase || null,
      current_phase_start: parseDate(row.current_phase_start),
      forecast_phase_end: parseDate(row.forecast_current_phase_end),
      forecast_completion: parseDate(row.forecast_completion),
      actual_design_start: parseDate(row.actual_design_start),
      actual_design_end: parseDate(row.actual_design_end),
      actual_construction_start: parseDate(row.actual_construction_start),
      actual_construction_end: parseDate(row.actual_construction_end),
      borough: row.borough || null,
      community_board: row.community_board || null,
      category: row.ten_year_plan_category || null,
      budget_line: row.budget_line || null,
    });
  }

  console.log(`Unique snapshots: ${snapshots.length}`);
  console.log("Upserting to Supabase...");

  // We'll create the table via SQL first, then upsert
  await supabaseUpsert("project_snapshots", snapshots);

  console.log("Done! Building computed project summaries...");

  // Now compute the "projects" view — latest snapshot per project + budget delta
  const projectMap = new Map<string, typeof snapshots>();
  for (const snap of snapshots) {
    const pk = snap.project_key as string;
    if (!projectMap.has(pk)) projectMap.set(pk, []);
    projectMap.get(pk)!.push(snap);
  }

  const projectSummaries: Record<string, unknown>[] = [];

  for (const [pk, snaps] of projectMap) {
    // Sort by reporting period
    snaps.sort((a, b) => (a.reporting_period as string).localeCompare(b.reporting_period as string));
    const first = snaps[0];
    const latest = snaps[snaps.length - 1];

    const firstBudget = first.total_budget as number | null;
    const latestBudget = latest.total_budget as number | null;
    const budgetDelta = (firstBudget && latestBudget) ? latestBudget - firstBudget : null;
    const budgetDeltaPct = (firstBudget && budgetDelta) ? (budgetDelta / firstBudget) * 100 : null;

    // Check if forecast completion has slipped
    const firstForecast = first.forecast_completion as string | null;
    const latestForecast = latest.forecast_completion as string | null;
    let scheduleSlipDays: number | null = null;
    if (firstForecast && latestForecast && firstForecast !== latestForecast) {
      const d1 = new Date(firstForecast).getTime();
      const d2 = new Date(latestForecast).getTime();
      scheduleSlipDays = Math.round((d2 - d1) / 86400000);
    }

    // Check if project is past its forecast completion
    const now = Date.now();
    const forecastDate = latestForecast ? new Date(latestForecast).getTime() : null;
    const daysOverdue = forecastDate ? Math.round((now - forecastDate) / 86400000) : null;
    const isOverdue = daysOverdue !== null && daysOverdue > 0 && (latest.current_phase as string) !== "(Completed)" && (latest.current_phase as string) !== "Close-out";

    projectSummaries.push({
      project_key: pk,
      fms_id: latest.fms_id,
      pid: latest.pid,
      project_name: latest.project_name,
      project_description: latest.project_description,
      managing_agency: latest.managing_agency,
      sponsor_agency: latest.sponsor_agency,
      current_phase: latest.current_phase,
      borough: latest.borough,
      community_board: latest.community_board,
      category: latest.category,
      // Latest financials
      total_budget: latestBudget,
      spend_to_date: latest.spend_to_date,
      spend_pct: latest.spend_pct,
      // Budget change tracking
      original_budget: firstBudget,
      budget_delta: budgetDelta,
      budget_delta_pct: budgetDeltaPct ? Math.round(budgetDeltaPct * 10) / 10 : null,
      // Schedule tracking
      forecast_completion: latestForecast,
      original_forecast: firstForecast,
      schedule_slip_days: scheduleSlipDays,
      is_overdue: isOverdue,
      days_overdue: isOverdue ? daysOverdue : null,
      // Metadata
      actual_construction_start: latest.actual_construction_start,
      actual_construction_end: latest.actual_construction_end,
      snapshot_count: snaps.length,
      latest_reporting_period: latest.reporting_period,
    });
  }

  console.log(`Computed ${projectSummaries.length} project summaries`);
  await supabaseUpsert("tracked_projects", projectSummaries);

  console.log("\n✅ Ingestion complete!");
  console.log(`  Snapshots: ${snapshots.length}`);
  console.log(`  Projects: ${projectSummaries.length}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
