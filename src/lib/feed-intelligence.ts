/**
 * Feed Intelligence Engine v2
 *
 * Two-layer system:
 *
 * LAYER 1 — DEDUPLICATION (applies to everyone)
 *   Same issue, same spot → merge into a single card with confirmations.
 *   "12 people confirmed this pothole at Broadway & 72nd"
 *   The user never sees the same issue listed multiple times.
 *   Tighter radius (~50m / half a block) + same category + similar titles.
 *
 * LAYER 2 — BLOCK INTELLIGENCE (only for YOUR block)
 *   Different issues on the same block → "Your Block" summary.
 *   "Your block has 6 active issues across 3 categories"
 *   Only shown when user has location + is on "Your Block" tab.
 *   Wider radius (~250m / ~3 blocks from user).
 *
 * Feed rules:
 *   - The same physical issue NEVER appears more than once
 *   - Confirmations boost the card's sort weight (social proof)
 *   - Block intel only appears for the user's own neighborhood
 *   - Everything else is a standard individual report card
 */

import type { Report } from "./types";

// ── Constants ─────────────────────────────────────────────────────────

// Dedup radius: ~50m (half a city block — same exact spot)
const DEDUP_RADIUS_LAT = 0.00045;
const DEDUP_RADIUS_LNG = 0.00058;

// Block intel radius from user: ~250m (~3 blocks)
const BLOCK_RADIUS_LAT = 0.00225;
const BLOCK_RADIUS_LNG = 0.00290;

// ── Types ──────────────────────────────────────────────────────────────

export interface DeduplicatedReport {
  /** The "lead" report (most supported or most recent) */
  lead: Report;
  /** All duplicate reports merged into this one */
  duplicates: Report[];
  /** Total number of people who reported this same issue (including lead) */
  confirmations: number;
  /** Combined supporter count across all duplicates */
  totalSupporters: number;
  /** Whether this issue has multiple independent reporters */
  communityVerified: boolean;
}

export interface BlockIntel {
  /** Number of distinct issues on the user's block */
  issueCount: number;
  /** Categories present */
  categories: string[];
  /** Total unique reporters */
  totalReporters: number;
  /** The individual issues (deduplicated) */
  issues: DeduplicatedReport[];
  /** Centroid of the block area */
  centroidLat: number;
  centroidLng: number;
  /** Neighborhood name */
  neighborhood: string | null;
}

export interface FeedItem {
  type: "report" | "block_intel";
  /** Present when type === "report" */
  report?: DeduplicatedReport;
  /** Present when type === "block_intel" */
  blockIntel?: BlockIntel;
  /** Sort key for feed ordering */
  sortKey: number;
}

// Re-export severity helpers from old module (still used by NearbyAlert)
export type SeverityLevel = "normal" | "hotspot" | "critical" | "emergency";

export function getSeverity(count: number): SeverityLevel {
  if (count >= 10) return "emergency";
  if (count >= 6) return "critical";
  if (count >= 3) return "hotspot";
  return "normal";
}

export function getSeverityConfig(severity: SeverityLevel) {
  switch (severity) {
    case "emergency":
      return {
        label: "Emergency Zone",
        color: "text-red-400",
        bg: "bg-red-500/15",
        border: "border-red-500/25",
        icon: "🚨",
        pulse: true,
      };
    case "critical":
      return {
        label: "Critical",
        color: "text-[var(--fc-orange)]",
        bg: "bg-[var(--fc-orange)]/15",
        border: "border-[var(--fc-orange)]/25",
        icon: "🔥",
        pulse: false,
      };
    case "hotspot":
      return {
        label: "Hotspot",
        color: "text-amber-400",
        bg: "bg-amber-500/15",
        border: "border-amber-500/25",
        icon: "⚠️",
        pulse: false,
      };
    default:
      return {
        label: "",
        color: "text-[var(--fc-muted)]",
        bg: "bg-white/5",
        border: "border-white/10",
        icon: "",
        pulse: false,
      };
  }
}

// ── Category display ───────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  pothole: "Pothole",
  road_damage: "Road Damage",
  streetlight: "Streetlight",
  street_light: "Streetlight",
  sidewalk: "Sidewalk",
  trash: "Trash & Debris",
  water: "Water Main",
  sewer: "Sewer",
  traffic_signal: "Traffic Signal",
  other: "Infrastructure",
};

export function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || "Infrastructure";
}

// ── Proximity check ───────────────────────────────────────────────────

function isSameSpot(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): boolean {
  return (
    Math.abs(lat1 - lat2) <= DEDUP_RADIUS_LAT &&
    Math.abs(lng1 - lng2) <= DEDUP_RADIUS_LNG
  );
}

function isOnBlock(
  userLat: number, userLng: number,
  reportLat: number, reportLng: number
): boolean {
  return (
    Math.abs(userLat - reportLat) <= BLOCK_RADIUS_LAT &&
    Math.abs(userLng - reportLng) <= BLOCK_RADIUS_LNG
  );
}

// ── Title similarity (crude but effective) ─────────────────────────────

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilar(a: string, b: string): boolean {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return true;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return true;

  // Check word overlap — if 60%+ words match, it's the same issue
  const arrA = na.split(" ").filter((w) => w.length > 2);
  const arrB = nb.split(" ").filter((w) => w.length > 2);
  const wordsB = new Set(arrB);
  if (arrA.length === 0 || arrB.length === 0) return false;

  let overlap = 0;
  for (let i = 0; i < arrA.length; i++) {
    if (wordsB.has(arrA[i])) overlap++;
  }
  const overlapPct = overlap / Math.min(arrA.length, arrB.length);
  return overlapPct >= 0.6;
}

// ── LAYER 1: Deduplication ────────────────────────────────────────────

/**
 * Deduplicate reports: merge reports that describe the same physical issue.
 * Same issue = same category + same spot (~50m) + similar title.
 * Returns deduplicated report objects, each carrying confirmation count.
 */
export function deduplicateReports(reports: Report[]): DeduplicatedReport[] {
  const used = new Set<string>();
  const results: DeduplicatedReport[] = [];

  // Sort by supporters desc so the "lead" is always the most-supported
  const sorted = [...reports].sort((a, b) => {
    if (b.supporters_count !== a.supporters_count) {
      return b.supporters_count - a.supporters_count;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  for (const report of sorted) {
    if (used.has(report.id)) continue;
    used.add(report.id);

    const duplicates: Report[] = [];

    // Find duplicates
    for (const candidate of sorted) {
      if (used.has(candidate.id)) continue;
      if (candidate.category !== report.category) continue;

      // Must be at the same spot
      if (
        report.lat != null && report.lng != null &&
        candidate.lat != null && candidate.lng != null &&
        isSameSpot(report.lat, report.lng, candidate.lat, candidate.lng)
      ) {
        // Title similarity check (or same category at same spot is enough for 311 data)
        if (
          report.source === "311" && candidate.source === "311" ||
          titleSimilar(report.title, candidate.title)
        ) {
          duplicates.push(candidate);
          used.add(candidate.id);
        }
      }
    }

    const allReports = [report, ...duplicates];
    const totalSupporters = allReports.reduce(
      (sum, r) => sum + r.supporters_count,
      0
    );

    results.push({
      lead: report,
      duplicates,
      confirmations: allReports.length,
      totalSupporters,
      communityVerified: allReports.length >= 3,
    });
  }

  return results;
}

// ── LAYER 2: Block Intelligence ───────────────────────────────────────

/**
 * Given deduplicated reports and the user's location, build a "Your Block"
 * intelligence summary. Only returns intel if there are 2+ issues nearby.
 */
export function buildBlockIntel(
  deduped: DeduplicatedReport[],
  userLat: number,
  userLng: number
): BlockIntel | null {
  const nearbyIssues = deduped.filter(
    (d) =>
      d.lead.lat != null &&
      d.lead.lng != null &&
      isOnBlock(userLat, userLng, d.lead.lat, d.lead.lng)
  );

  if (nearbyIssues.length < 2) return null;

  const categories = Array.from(new Set(nearbyIssues.map((d) => d.lead.category)));
  const totalReporters = nearbyIssues.reduce(
    (sum, d) => sum + d.confirmations,
    0
  );

  // Centroid
  let sumLat = 0, sumLng = 0, count = 0;
  for (const d of nearbyIssues) {
    if (d.lead.lat && d.lead.lng) {
      sumLat += d.lead.lat;
      sumLng += d.lead.lng;
      count++;
    }
  }

  // Neighborhood — most common
  const hoods = new Map<string, number>();
  for (const d of nearbyIssues) {
    const h = d.lead.neighborhood;
    if (h) hoods.set(h, (hoods.get(h) || 0) + 1);
  }
  let bestHood: string | null = null;
  let bestCount = 0;
  hoods.forEach((c, h) => {
    if (c > bestCount) { bestHood = h; bestCount = c; }
  });

  return {
    issueCount: nearbyIssues.length,
    categories,
    totalReporters,
    issues: nearbyIssues.sort(
      (a, b) => b.totalSupporters - a.totalSupporters
    ),
    centroidLat: count > 0 ? sumLat / count : userLat,
    centroidLng: count > 0 ? sumLng / count : userLng,
    neighborhood: bestHood,
  };
}

// ── Feed Builder ──────────────────────────────────────────────────────

/**
 * Build the final feed. Options:
 * - userLat/userLng: if provided, enables block intel for "Your Block" tab
 * - showBlockIntel: if true, inserts block summary at top (only for Your Block tab)
 */
export function buildFeed(
  reports: Report[],
  options: {
    userLat?: number | null;
    userLng?: number | null;
    showBlockIntel?: boolean;
  } = {}
): FeedItem[] {
  // Layer 1: Deduplicate
  const deduped = deduplicateReports(reports);

  const feedItems: FeedItem[] = [];

  // Layer 2: Block intel (only when requested + location available)
  if (
    options.showBlockIntel &&
    options.userLat != null &&
    options.userLng != null
  ) {
    const blockIntel = buildBlockIntel(
      deduped,
      options.userLat,
      options.userLng
    );
    if (blockIntel) {
      feedItems.push({
        type: "block_intel",
        blockIntel,
        sortKey: Infinity, // Always at top
      });
    }
  }

  // Add all deduplicated reports as individual cards
  for (const d of deduped) {
    feedItems.push({
      type: "report",
      report: d,
      sortKey: dedupSortKey(d),
    });
  }

  // Sort (block intel stays at top due to Infinity)
  feedItems.sort((a, b) => b.sortKey - a.sortKey);

  return feedItems;
}

// ── Sort Key ──────────────────────────────────────────────────────────

function dedupSortKey(d: DeduplicatedReport): number {
  const recency = new Date(d.lead.created_at).getTime() / 1000000;

  // Confirmation boost — more people reporting = more important
  const confirmBoost = d.confirmations >= 10
    ? 50000
    : d.confirmations >= 5
    ? 20000
    : d.confirmations >= 3
    ? 10000
    : 0;

  // Community verified badge boosts visibility
  const verifiedBoost = d.communityVerified ? 5000 : 0;

  return confirmBoost + verifiedBoost + d.totalSupporters * 10 + recency;
}

// ── Nearby Alert (kept for compatibility) ─────────────────────────────

export interface NearbyAlert {
  issue: DeduplicatedReport;
  distanceBlocks: number;
  message: string;
}

export function checkNearbyAlerts(
  deduped: DeduplicatedReport[],
  userLat: number,
  userLng: number,
  maxBlockRadius: number = 5
): NearbyAlert[] {
  const alerts: NearbyAlert[] = [];
  const blockLat = 0.00072;
  const blockLng = 0.00092;

  for (const d of deduped) {
    if (d.confirmations < 3) continue; // Only alert on confirmed issues
    if (d.lead.lat == null || d.lead.lng == null) continue;

    const dLat = Math.abs(userLat - d.lead.lat);
    const dLng = Math.abs(userLng - d.lead.lng);
    const blocksAway = Math.max(dLat / blockLat, dLng / blockLng);

    if (blocksAway <= maxBlockRadius) {
      const sev = getSeverity(d.confirmations);
      const sevCfg = getSeverityConfig(sev);
      const blocksLabel =
        blocksAway < 1 ? "on your block" : `~${Math.ceil(blocksAway)} blocks away`;

      alerts.push({
        issue: d,
        distanceBlocks: blocksAway,
        message: `${sevCfg.icon} ${d.confirmations} people confirmed ${categoryLabel(d.lead.category).toLowerCase()} issue ${blocksLabel}`,
      });
    }
  }

  alerts.sort((a, b) => a.distanceBlocks - b.distanceBlocks);
  return alerts.slice(0, 3); // Max 3 alerts
}
