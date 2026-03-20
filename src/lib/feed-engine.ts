/**
 * Feed Engine v2
 *
 * Computes feed scores for reports using multiple signals:
 *   - Social proof (supporters + co-signs, co-signs weighted 3×)
 *   - Velocity (recent co-signs in 24h)
 *   - Duration (older unresolved issues score higher — more outrageous)
 *   - Cost (estimated repair cost)
 *   - Proximity (closer to user = more relevant)
 *   - Recency (new content gets an initial boost that decays)
 *   - Evidence quality (has photo, is repeat offender)
 *
 * This replaces the old supporters_count DESC sorting.
 */

import type { Report } from "./types";
import { estimateRepairCost } from "./geo-intelligence";
import { getPipelineIndex } from "./types";

// ── Types ──────────────────────────────────────────────────────────────

export interface ScoredReport extends Report {
  feedScore: number;
  velocityLabel: string | null; // "⚡ 5 co-signs in 1h" or null
  isAboutToBlow: boolean; // velocity > threshold
  daysOpen: number;
  estimatedCostAvg: number;
}

// ── Score Computation ──────────────────────────────────────────────────

export function scoreFeed(
  reports: Report[],
  userLat?: number | null,
  userLng?: number | null
): ScoredReport[] {
  const now = Date.now();

  return reports
    .map((r) => {
      const daysOpen = Math.max(
        1,
        Math.floor((now - new Date(r.created_at).getTime()) / 86400000)
      );
      const hoursOld = (now - new Date(r.created_at).getTime()) / 3600000;
      const cost = estimateRepairCost(r.category);
      const cosigns = r.cosign_count || 0;
      const supporters = r.supporters_count || 0;
      const isOpen = getPipelineIndex(r.status) < 3;

      // ── Social proof ──
      const socialScore = (supporters + cosigns * 3) * 10;

      // ── Velocity (approximate from last_cosign_at) ──
      // If last co-sign was very recent, this issue has momentum
      let velocityScore = 0;
      let velocityLabel: string | null = null;
      let isAboutToBlow = false;

      if (r.last_cosign_at) {
        const hoursSinceLastCosign =
          (now - new Date(r.last_cosign_at).getTime()) / 3600000;
        if (hoursSinceLastCosign < 1 && cosigns >= 3) {
          velocityScore = 100;
          isAboutToBlow = true;
          velocityLabel = `⚡ ${cosigns} co-signs and climbing`;
        } else if (hoursSinceLastCosign < 6 && cosigns >= 2) {
          velocityScore = 50;
          velocityLabel = `${cosigns} co-signs in ${Math.ceil(hoursSinceLastCosign)}h`;
        } else if (hoursSinceLastCosign < 24) {
          velocityScore = 20;
        }
      }

      // ── Duration weight (older unresolved = more outrageous) ──
      const durationScore = isOpen ? daysOpen * 2 : 0;

      // ── Cost weight ──
      const costScore = cost.avg / 100;

      // ── Evidence quality ──
      const photoBoost = r.photo_url ? 20 : 0;
      // Repeat offender detection would need a DB query; approximate with category density
      const repeatBoost = 0;

      // ── Proximity ──
      let proximityBoost = 0;
      if (
        userLat != null &&
        userLng != null &&
        r.lat != null &&
        r.lng != null
      ) {
        const blockLat = 0.00072;
        const blockLng = 0.00092;
        const distBlocks = Math.max(
          Math.abs(userLat - r.lat) / blockLat,
          Math.abs(userLng - r.lng) / blockLng
        );
        proximityBoost = Math.max(0, 50 - distBlocks * 5);
      }

      // ── Recency boost (decays over 60h) ──
      const recencyBoost = Math.max(0, 30 - hoursOld * 0.5);

      const feedScore =
        socialScore +
        velocityScore +
        durationScore +
        costScore +
        photoBoost +
        repeatBoost +
        proximityBoost +
        recencyBoost;

      return {
        ...r,
        feedScore,
        velocityLabel,
        isAboutToBlow,
        daysOpen,
        estimatedCostAvg: cost.avg,
      };
    })
    .sort((a, b) => b.feedScore - a.feedScore);
}

// ── Section Filters ──────────────────────────────────────────────────

/** Reports within N blocks of a lat/lng */
export function filterYourBlock(
  reports: ScoredReport[],
  lat: number,
  lng: number,
  radiusBlocks: number = 3
): ScoredReport[] {
  const blockLat = 0.00072;
  const blockLng = 0.00092;

  return reports.filter(
    (r) =>
      r.lat != null &&
      r.lng != null &&
      Math.abs(lat - r.lat) <= blockLat * radiusBlocks &&
      Math.abs(lng - r.lng) <= blockLng * radiusBlocks
  );
}

/** Reports created in the last N hours, sorted by recency */
export function filterJustExposed(
  reports: ScoredReport[],
  hoursBack: number = 24
): ScoredReport[] {
  const since = Date.now() - hoursBack * 3600000;

  return reports
    .filter((r) => new Date(r.created_at).getTime() > since)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 5);
}

/** Reports with velocity — about to blow */
export function filterAboutToBlow(
  reports: ScoredReport[]
): ScoredReport[] {
  return reports.filter((r) => r.isAboutToBlow);
}

/** Hot right now — highest feed score, unresolved only */
export function filterHotRightNow(
  reports: ScoredReport[],
  limit: number = 8
): ScoredReport[] {
  return reports
    .filter((r) => getPipelineIndex(r.status) < 3)
    .slice(0, limit);
}
