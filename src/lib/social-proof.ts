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
 * Every report shows SOME shares — social proof that others are amplifying.
 */
export function getShareCounts(reportId: string, supportersCount: number): ShareCounts {
  const h = hashSeed(reportId);

  // Base shares: every report gets a minimum floor + scale with supporters
  const x = 3 + Math.floor(seededRandom(h + 1) * 12) + Math.floor(supportersCount * 0.3);
  const reddit = 1 + Math.floor(seededRandom(h + 2) * 6) + Math.floor(supportersCount * 0.1);
  const whatsapp = 2 + Math.floor(seededRandom(h + 3) * 8) + Math.floor(supportersCount * 0.2);
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

  // Others confirmed: always meaningful, scales with supporters
  const othersConfirmed = 5 + Math.floor(seededRandom(h + 11) * 15) + Math.floor(supportersCount * 0.5);

  // Fixed this month: 8-24 range
  const fixedThisMonth = 8 + Math.floor(seededRandom(h + 12) * 16);

  return { weeklyExposés, othersConfirmed, fixedThisMonth };
}
