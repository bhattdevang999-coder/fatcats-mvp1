/**
 * Social Proof Engine
 *
 * Generates believable social engagement metrics for the MVP demo.
 * These make people feel safe to post ("others are doing it too")
 * and compel sharing ("47 others shared this").
 *
 * In production, these would come from real analytics.
 */

// ── Deterministic pseudo-random from string seed ────────────────────

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) & 0x7fffffff;
  }
  return h;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ── Share Counts ────────────────────────────────────────────────────

export interface ShareCounts {
  x: number;
  reddit: number;
  whatsapp: number;
  total: number;
}

/**
 * Generate simulated share counts for a report.
 * Deterministic based on reportId so they stay consistent.
 * Weighted by supporters_count to feel proportional.
 */
export function getShareCounts(reportId: string, supportersCount: number): ShareCounts {
  const h = hashSeed(reportId);
  const base = Math.max(1, Math.floor(supportersCount * 0.6));

  const x = Math.floor(seededRandom(h + 1) * base * 0.8) + (supportersCount > 10 ? 3 : 0);
  const reddit = Math.floor(seededRandom(h + 2) * base * 0.3) + (supportersCount > 15 ? 2 : 0);
  const whatsapp = Math.floor(seededRandom(h + 3) * base * 0.5) + (supportersCount > 5 ? 1 : 0);
  const total = x + reddit + whatsapp;

  return { x, reddit, whatsapp, total };
}

// ── Community Safety Proof ──────────────────────────────────────────

export interface CommunityProof {
  /** "247 exposés filed this week" */
  weeklyExposés: number;
  /** "36 others confirmed this" — nearby this report */
  othersConfirmed: number;
  /** "12 issues fixed this month" */
  fixedThisMonth: number;
}

export function getCommunityProof(reportId: string, supportersCount: number): CommunityProof {
  const h = hashSeed(reportId + "_proof");

  // Weekly exposés: 180-380 range (city-wide)
  const weeklyExposés = 180 + Math.floor(seededRandom(h + 10) * 200);

  // Others confirmed: proportional to supporters
  const othersConfirmed = Math.max(
    Math.floor(supportersCount * 0.4),
    Math.floor(seededRandom(h + 11) * 8) + 3
  );

  // Fixed this month: 8-24 range
  const fixedThisMonth = 8 + Math.floor(seededRandom(h + 12) * 16);

  return { weeklyExposés, othersConfirmed, fixedThisMonth };
}
