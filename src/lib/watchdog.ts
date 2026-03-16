// ============================================================
// BLOCK WATCHDOG SYSTEM
// localStorage-based, no auth required
// "Be the first Block Watchdog for your neighborhood"
// ============================================================

export const FOUNDING_LIMIT = 15; // First N per neighborhood get founding badge

export type WatchdogLevel = "watchdog" | "captain" | "lead";

export interface WatchdogProfile {
  neighborhood: string;
  claimedAt: number;
  level: WatchdogLevel;
  inviteCount: number;
  exposeCount: number;
}

const KEYS = {
  neighborhood: "fc_watchdog_neighborhood",
  claimedAt: "fc_watchdog_claimed_at",
  level: "fc_watchdog_level",
  invites: "fc_watchdog_invites",
  exposeCount: "fc_watchdog_exposes",
} as const;

// ── Read ──────────────────────────────────────────────────────

export function getWatchdogProfile(): WatchdogProfile | null {
  if (typeof window === "undefined") return null;
  const neighborhood = localStorage.getItem(KEYS.neighborhood);
  if (!neighborhood) return null;

  return {
    neighborhood,
    claimedAt: parseInt(localStorage.getItem(KEYS.claimedAt) || "0", 10),
    level: (localStorage.getItem(KEYS.level) as WatchdogLevel) || "watchdog",
    inviteCount: JSON.parse(localStorage.getItem(KEYS.invites) || "[]").length,
    exposeCount: parseInt(localStorage.getItem(KEYS.exposeCount) || "0", 10),
  };
}

export function isWatchdog(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(KEYS.neighborhood);
}

export function getWatchdogNeighborhood(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.neighborhood);
}

// ── Write ─────────────────────────────────────────────────────

export function claimBlockWatchdog(neighborhood: string): WatchdogProfile {
  localStorage.setItem(KEYS.neighborhood, neighborhood);
  localStorage.setItem(KEYS.claimedAt, Date.now().toString());
  localStorage.setItem(KEYS.level, "watchdog");
  if (!localStorage.getItem(KEYS.invites)) {
    localStorage.setItem(KEYS.invites, "[]");
  }

  return {
    neighborhood,
    claimedAt: Date.now(),
    level: "watchdog",
    inviteCount: 0,
    exposeCount: parseInt(localStorage.getItem(KEYS.exposeCount) || "0", 10),
  };
}

export function addWatchdogInvite(email: string): void {
  const invites = JSON.parse(localStorage.getItem(KEYS.invites) || "[]");
  if (!invites.includes(email)) {
    invites.push(email);
    localStorage.setItem(KEYS.invites, JSON.stringify(invites));
    recalcLevel();
  }
}

export function incrementWatchdogExposes(): void {
  const current = parseInt(localStorage.getItem(KEYS.exposeCount) || "0", 10);
  localStorage.setItem(KEYS.exposeCount, (current + 1).toString());
  recalcLevel();
}

function recalcLevel(): void {
  const invites = JSON.parse(localStorage.getItem(KEYS.invites) || "[]").length;
  const exposes = parseInt(localStorage.getItem(KEYS.exposeCount) || "0", 10);

  let level: WatchdogLevel = "watchdog";
  if (invites >= 3) level = "captain";
  if (exposes >= 10 && invites >= 5) level = "lead";

  localStorage.setItem(KEYS.level, level);
}

// ── Display helpers ───────────────────────────────────────────

export function getWatchdogTitle(level: WatchdogLevel): string {
  switch (level) {
    case "lead":
      return "Neighborhood Lead";
    case "captain":
      return "Block Captain";
    default:
      return "Block Watchdog";
  }
}

export function getWatchdogEmoji(level: WatchdogLevel): string {
  switch (level) {
    case "lead":
      return "🏆";
    case "captain":
      return "⭐";
    default:
      return "🔍";
  }
}

export function getLevelProgress(profile: WatchdogProfile): {
  nextLevel: WatchdogLevel | null;
  requirement: string;
  progress: number; // 0-100
} {
  if (profile.level === "lead") {
    return { nextLevel: null, requirement: "Max level reached", progress: 100 };
  }
  if (profile.level === "captain") {
    const exposePct = Math.min(100, (profile.exposeCount / 10) * 50);
    const invitePct = Math.min(100, (profile.inviteCount / 5) * 50);
    return {
      nextLevel: "lead",
      requirement: `${10 - profile.exposeCount > 0 ? `${10 - profile.exposeCount} more exposés` : "✓ exposés"} + ${5 - profile.inviteCount > 0 ? `${5 - profile.inviteCount} more invites` : "✓ invites"}`,
      progress: Math.round((exposePct + invitePct) / 2),
    };
  }
  // watchdog → captain: need 3 invites
  return {
    nextLevel: "captain",
    requirement: `Invite ${Math.max(0, 3 - profile.inviteCount)} more people to become Block Captain`,
    progress: Math.round(Math.min(100, (profile.inviteCount / 3) * 100)),
  };
}

// ── Share text generators ─────────────────────────────────────

export function getClaimShareText(neighborhood: string): string {
  return `I just claimed ${neighborhood} as a Block Watchdog on FatCats.\n\nZero accountability record for my block. Time to change that.\n\nClaim your neighborhood before someone else does → fatcatsapp.com\n\nPoint. Expose. Fix.`;
}

export function getRecruitShareText(neighborhood: string): string {
  return `${neighborhood} needs more eyes on the ground.\n\nI'm building the accountability record for my block on FatCats. Join me.\n\nfatcatsapp.com\n#FatCatsNYC #PointExposeFix`;
}

// ── NYC Neighborhoods (for "unclaimed" display) ───────────────

export const NYC_NEIGHBORHOODS = [
  "Astoria", "Bay Ridge", "Bedford-Stuyvesant", "Bensonhurst", "Borough Park",
  "Bronx Park", "Brooklyn Heights", "Brownsville", "Bushwick", "Carroll Gardens",
  "Chelsea", "Chinatown", "Clinton Hill", "Cobble Hill", "Corona",
  "Crown Heights", "DUMBO", "East Flatbush", "East Harlem", "East Village",
  "East Williamsburg", "Elmhurst", "Financial District", "Flatbush", "Flushing",
  "Forest Hills", "Fort Greene", "Greenpoint", "Greenwich Village", "Harlem",
  "Hell's Kitchen", "Inwood", "Jackson Heights", "Jamaica", "Kensington",
  "Long Island City", "Lower East Side", "Midtown", "Morningside Heights",
  "Murray Hill", "Park Slope", "Prospect Heights", "Red Hook", "Ridgewood",
  "Riverdale", "SoHo", "South Bronx", "Sunset Park", "TriBeCa",
  "Upper East Side", "Upper West Side", "Washington Heights", "West Village",
  "Williamsburg", "Windsor Terrace", "Woodside", "Yorkville",
] as const;
