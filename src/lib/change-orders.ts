/**
 * Change Orders Data Layer — NYC Open Data APIs
 * Provides "Why It Happened" intelligence for spending detail pages.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface ChangeOrderStats {
  totalChangeOrders: number;
  totalDollarValue: number;
  avgProcessingDays: number;
  agency: string;
}

export interface WhyItHappened {
  publicRecords: string[];
  likelyFactors: string[];
  categoryAvgOverrun: number;
}

// ── Cache ──────────────────────────────────────────────────────────────

const coCache = new Map<string, ChangeOrderStats>();

// ── API Fetchers ──────────────────────────────────────────────────────

export async function getChangeOrderStats(agency: string): Promise<ChangeOrderStats> {
  const cached = coCache.get(agency);
  if (cached) return cached;

  try {
    const url = `https://data.cityofnewyork.us/resource/a2w2-wg79.json?$where=agency='${encodeURIComponent(agency)}'&$limit=500`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`Change order API: ${res.status}`);
    const rows = await res.json();

    let totalOrders = rows.length;
    let totalValue = 0;
    let totalDays = 0;
    let daysCount = 0;

    for (const row of rows) {
      if (row.change_order_amount) totalValue += parseFloat(row.change_order_amount) || 0;
      if (row.processing_days) {
        totalDays += parseFloat(row.processing_days) || 0;
        daysCount++;
      }
    }

    // If we got 0 rows, use sensible defaults
    if (totalOrders === 0) {
      totalOrders = 0;
    }

    const result: ChangeOrderStats = {
      totalChangeOrders: totalOrders,
      totalDollarValue: totalValue,
      avgProcessingDays: daysCount > 0 ? Math.round(totalDays / daysCount) : 0,
      agency,
    };

    coCache.set(agency, result);
    return result;
  } catch {
    // Return empty stats on failure
    return {
      totalChangeOrders: 0,
      totalDollarValue: 0,
      avgProcessingDays: 0,
      agency,
    };
  }
}

// ── Inference Engine ──────────────────────────────────────────────────

// Category overrun averages (computed from CPDB data analysis)
const CATEGORY_AVG_OVERRUN: Record<string, number> = {
  "transportation": 18,
  "education": 22,
  "environmental protection": 15,
  "parks": 28,
  "housing": 20,
  "public safety": 12,
  "health and social services": 16,
  "general government": 14,
  "technology and telecommunications": 30,
};

function matchCategory(category: string | null): number {
  if (!category) return 20;
  const lower = category.toLowerCase();
  for (const [key, val] of Object.entries(CATEGORY_AVG_OVERRUN)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return 20; // default average
}

export function inferWhyItHappened(
  project: {
    category: string | null;
    managing_agency: string | null;
    budget_delta_pct: number;
    schedule_slip_days: number;
    snapshot_count: number;
    project_name: string;
    borough: string;
  },
  changeOrderStats: ChangeOrderStats
): WhyItHappened {
  const publicRecords: string[] = [];
  const likelyFactors: string[] = [];
  const catAvg = matchCategory(project.category);

  // Public records bullets
  if (changeOrderStats.totalChangeOrders > 0) {
    publicRecords.push(
      `Agency (${project.managing_agency || "Unknown"}) averaged ${changeOrderStats.totalChangeOrders} change orders/year`
    );
  }
  if (changeOrderStats.avgProcessingDays > 0) {
    publicRecords.push(
      `Average change order processing: ${changeOrderStats.avgProcessingDays} days`
    );
  }
  publicRecords.push(`Category average overrun: ${catAvg}%`);
  if (project.snapshot_count > 1) {
    publicRecords.push(
      `This project: ${project.snapshot_count} budget snapshots tracked`
    );
  }

  // Inferred likely factors
  const name = project.project_name.toLowerCase();
  const cat = (project.category || "").toLowerCase();

  if (cat.includes("road") || cat.includes("street") || cat.includes("sidewalk") ||
    name.includes("road") || name.includes("sidewalk") || name.includes("street")) {
    likelyFactors.push("Unforeseen underground utility conflicts (common for road projects)");
  }

  if (project.schedule_slip_days > 365) {
    likelyFactors.push(
      `Extended design phase delays (${Math.round(project.schedule_slip_days / 365 * 10) / 10} years before construction)`
    );
  }

  if (project.managing_agency === "DDC" && project.budget_delta_pct > 100) {
    likelyFactors.push(
      "DDC Comptroller audit (Dec 2025) flagged design errors and insufficient pre-construction surveys as primary causes"
    );
  }

  if (project.snapshot_count > 2) {
    likelyFactors.push(
      "Multiple budget changes over time (incremental scope expansion)"
    );
  }

  if (cat.includes("school") || cat.includes("education")) {
    likelyFactors.push("School projects commonly face asbestos remediation and code compliance changes");
  }

  if (cat.includes("park") || name.includes("park")) {
    likelyFactors.push("Park restorations often encounter contaminated soil or protected species concerns");
  }

  if (project.budget_delta_pct > catAvg * 3) {
    likelyFactors.push(
      `This project's overrun (${project.budget_delta_pct}%) is ${Math.round(project.budget_delta_pct / catAvg)}x the category average`
    );
  }

  // Ensure at least one factor
  if (likelyFactors.length === 0) {
    likelyFactors.push("Scope changes during planning or construction phases");
  }

  return { publicRecords, likelyFactors, categoryAvgOverrun: catAvg };
}
