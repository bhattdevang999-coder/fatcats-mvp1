/**
 * Feed Clustering Engine
 *
 * Groups nearby reports of the same category so the feed doesn't flood
 * with 20 "pothole on 5th Ave" cards. Instead, users see a single
 * cluster card like "🔥 12 Pothole Reports near 5th Ave & 23rd St"
 * with severity escalation and a "View All" drill-down.
 *
 * Clustering logic:
 *   1. Spatial proximity: reports within ~2 city blocks (~160m)
 *   2. Category matching: same issue type (pothole, sidewalk, etc.)
 *   3. Temporal relevance: most recent report sets the cluster timestamp
 *
 * Severity levels (based on cluster size):
 *   - Normal (1-2 reports): show as individual cards
 *   - Hotspot (3-5): amber badge, grouped card
 *   - Critical (6-9): orange badge, escalated
 *   - Emergency (10+): red pulsing badge, top of feed
 */

import type { Report } from "./types";

// ── Constants ─────────────────────────────────────────────────────────

// ~2 NYC blocks in degrees
const CLUSTER_RADIUS_LAT = 0.00144; // ~160m
const CLUSTER_RADIUS_LNG = 0.00184; // ~160m at NYC latitude

// Minimum reports to form a cluster (below this, show individual cards)
const MIN_CLUSTER_SIZE = 3;

// ── Types ──────────────────────────────────────────────────────────────

export type SeverityLevel = "normal" | "hotspot" | "critical" | "emergency";

export interface ReportCluster {
  id: string; // e.g. "cluster-pothole-40.748-73.985"
  type: "cluster";
  category: string;
  severity: SeverityLevel;
  reports: Report[];
  reportCount: number;
  totalSupporters: number;

  // Representative data
  title: string; // e.g. "12 Pothole Reports"
  neighborhood: string | null;
  centroidLat: number;
  centroidLng: number;

  // Timing
  oldestReport: string; // ISO date
  newestReport: string; // ISO date
  daysActive: number;

  // Lead report (most supported / most recent)
  leadReport: Report;
}

export interface FeedItem {
  type: "report" | "cluster";
  report?: Report;
  cluster?: ReportCluster;
  sortKey: number; // for feed ordering
}

// ── Severity ───────────────────────────────────────────────────────────

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

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || "Infrastructure";
}

// ── Haversine shortcut for small distances ────────────────────────────

function isNearby(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): boolean {
  return (
    Math.abs(lat1 - lat2) <= CLUSTER_RADIUS_LAT &&
    Math.abs(lng1 - lng2) <= CLUSTER_RADIUS_LNG
  );
}

// ── Core Clustering ────────────────────────────────────────────────────

/**
 * Groups reports into clusters using single-linkage spatial clustering
 * constrained by category. Reports without location stay unclustered.
 */
export function clusterReports(reports: Report[]): FeedItem[] {
  // Separate geolocated vs non-geolocated
  const geoReports: Report[] = [];
  const noGeoReports: Report[] = [];

  for (const r of reports) {
    if (r.lat != null && r.lng != null) {
      geoReports.push(r);
    } else {
      noGeoReports.push(r);
    }
  }

  // Cluster geolocated reports by category + proximity
  const assigned = new Set<string>();
  const clusters: ReportCluster[] = [];

  for (let i = 0; i < geoReports.length; i++) {
    const seed = geoReports[i];
    if (assigned.has(seed.id)) continue;

    const clusterReports: Report[] = [seed];
    assigned.add(seed.id);

    // Find all nearby reports of the same category
    for (let j = i + 1; j < geoReports.length; j++) {
      const candidate = geoReports[j];
      if (assigned.has(candidate.id)) continue;
      if (candidate.category !== seed.category) continue;

      // Check if candidate is near ANY report in the current cluster
      const nearCluster = clusterReports.some(
        (r) =>
          r.lat != null &&
          r.lng != null &&
          candidate.lat != null &&
          candidate.lng != null &&
          isNearby(r.lat, r.lng, candidate.lat, candidate.lng)
      );

      if (nearCluster) {
        clusterReports.push(candidate);
        assigned.add(candidate.id);
      }
    }

    // Only form a cluster if we have enough reports
    if (clusterReports.length >= MIN_CLUSTER_SIZE) {
      const cluster = buildCluster(clusterReports);
      clusters.push(cluster);
    }
  }

  // Build the unified feed
  const feedItems: FeedItem[] = [];

  // Add clusters
  for (const cluster of clusters) {
    feedItems.push({
      type: "cluster",
      cluster,
      sortKey: clusterSortKey(cluster),
    });
  }

  // Add unclustered geo reports
  for (const r of geoReports) {
    if (!assigned.has(r.id)) {
      feedItems.push({
        type: "report",
        report: r,
        sortKey: reportSortKey(r),
      });
    }
  }

  // Add non-geo reports
  for (const r of noGeoReports) {
    feedItems.push({
      type: "report",
      report: r,
      sortKey: reportSortKey(r),
    });
  }

  // Sort: emergency clusters first, then by sort key descending
  feedItems.sort((a, b) => b.sortKey - a.sortKey);

  return feedItems;
}

// ── Cluster Builder ────────────────────────────────────────────────────

function buildCluster(reports: Report[]): ReportCluster {
  // Centroid
  let sumLat = 0;
  let sumLng = 0;
  let geoCount = 0;
  for (const r of reports) {
    if (r.lat != null && r.lng != null) {
      sumLat += r.lat;
      sumLng += r.lng;
      geoCount++;
    }
  }
  const centroidLat = geoCount > 0 ? sumLat / geoCount : 0;
  const centroidLng = geoCount > 0 ? sumLng / geoCount : 0;

  // Time range
  const dates = reports.map((r) => new Date(r.created_at).getTime());
  const oldest = Math.min(...dates);
  const newest = Math.max(...dates);
  const daysActive = Math.max(
    1,
    Math.floor((Date.now() - oldest) / 86400000)
  );

  // Total supporters
  const totalSupporters = reports.reduce(
    (sum, r) => sum + r.supporters_count,
    0
  );

  // Lead report: highest supporters, tie-break by most recent
  const sorted = [...reports].sort((a, b) => {
    if (b.supporters_count !== a.supporters_count) {
      return b.supporters_count - a.supporters_count;
    }
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
  const leadReport = sorted[0];

  // Neighborhood — use most common
  const hoodCounts = new Map<string, number>();
  for (const r of reports) {
    if (r.neighborhood) {
      hoodCounts.set(
        r.neighborhood,
        (hoodCounts.get(r.neighborhood) || 0) + 1
      );
    }
  }
  let bestHood: string | null = null;
  let bestCount = 0;
  hoodCounts.forEach((count, hood) => {
    if (count > bestCount) {
      bestHood = hood;
      bestCount = count;
    }
  });

  const severity = getSeverity(reports.length);
  const catName = categoryLabel(reports[0].category);
  const title = `${reports.length} ${catName} Reports`;

  const id = `cluster-${reports[0].category}-${centroidLat.toFixed(3)}-${Math.abs(centroidLng).toFixed(3)}`;

  return {
    id,
    type: "cluster",
    category: reports[0].category,
    severity,
    reports,
    reportCount: reports.length,
    totalSupporters,
    title,
    neighborhood: bestHood,
    centroidLat,
    centroidLng,
    oldestReport: new Date(oldest).toISOString(),
    newestReport: new Date(newest).toISOString(),
    daysActive,
    leadReport,
  };
}

// ── Sort Keys ──────────────────────────────────────────────────────────

function clusterSortKey(cluster: ReportCluster): number {
  // Emergency clusters get massive boost
  const severityBoost =
    cluster.severity === "emergency"
      ? 100000
      : cluster.severity === "critical"
      ? 50000
      : cluster.severity === "hotspot"
      ? 25000
      : 0;

  // Combine supporters + recency + cluster size
  const recency = new Date(cluster.newestReport).getTime() / 1000000;
  return severityBoost + cluster.totalSupporters * 10 + cluster.reportCount * 5 + recency;
}

function reportSortKey(report: Report): number {
  const recency = new Date(report.created_at).getTime() / 1000000;
  return report.supporters_count * 10 + recency;
}

// ── Nearby Alert ───────────────────────────────────────────────────────

/**
 * For the "Near You" tab: check if the user's location falls within
 * any active cluster, and return an alert if so.
 */
export interface NearbyAlert {
  cluster: ReportCluster;
  distanceBlocks: number;
  message: string;
}

export function checkNearbyAlerts(
  clusters: ReportCluster[],
  userLat: number,
  userLng: number,
  maxBlockRadius: number = 5
): NearbyAlert[] {
  const alerts: NearbyAlert[] = [];
  const blockLat = 0.00072;
  const blockLng = 0.00092;

  for (const cluster of clusters) {
    if (cluster.severity === "normal") continue;

    const dLat = Math.abs(userLat - cluster.centroidLat);
    const dLng = Math.abs(userLng - cluster.centroidLng);
    const blocksAway = Math.max(dLat / blockLat, dLng / blockLng);

    if (blocksAway <= maxBlockRadius) {
      const sevCfg = getSeverityConfig(cluster.severity);
      const blocksLabel =
        blocksAway < 1
          ? "on your block"
          : `~${Math.ceil(blocksAway)} blocks away`;

      alerts.push({
        cluster,
        distanceBlocks: blocksAway,
        message: `${sevCfg.icon} ${cluster.reportCount} ${categoryLabel(cluster.category)} reports ${blocksLabel}`,
      });
    }
  }

  // Sort by proximity
  alerts.sort((a, b) => a.distanceBlocks - b.distanceBlocks);
  return alerts;
}
