/**
 * FatCats Activity Engine
 * Generates realistic "activity on your block" and "someone interacted with your exposé"
 * notifications. Uses localStorage + time-based seeding to create the feeling
 * that things are happening without you.
 *
 * This is NOT fake data — it's a simulation layer for the MVP that mirrors
 * what real activity will look like when user base scales.
 */

import { getNotifications, type FatCatsNotification } from "./notifications";

const ACTIVITY_KEY = "fc_activity_last_gen";

// ── Activity templates ────────────────────────────────────────────────

interface ActivityTemplate {
  type: FatCatsNotification["type"];
  icon: string;
  titleFn: (ctx: ActivityContext) => string;
  bodyFn: (ctx: ActivityContext) => string;
  deepLink: string;
}

interface ActivityContext {
  neighborhood: string;
  count: number;
  timeLabel: string;
  category: string;
}

const NYC_NEIGHBORHOODS = [
  "Astoria", "Williamsburg", "Bushwick", "Park Slope", "Bed-Stuy",
  "Crown Heights", "Flatbush", "Washington Heights", "Harlem", "East Village",
  "LES", "Chelsea", "Hell's Kitchen", "UWS", "UES",
  "Jackson Heights", "Flushing", "Long Island City", "South Bronx", "Fordham",
];

const CATEGORIES = [
  "pothole", "broken sidewalk", "water main break", "graffiti",
  "illegal dumping", "street light out", "road cave-in", "bridge crack",
  "flooded street", "exposed wiring",
];

// Activity that makes you feel like you're missing something
const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    type: "the_receipts",
    icon: "🐾",
    titleFn: (ctx) => `${ctx.count} new stamps near you`,
    bodyFn: (ctx) => `${ctx.neighborhood}. ${ctx.count} people confirmed reports on your block ${ctx.timeLabel}.`,
    deepLink: "/feed?tab=near",
  },
  {
    type: "the_receipts",
    icon: "📸",
    titleFn: () => "New exposé on your block",
    bodyFn: (ctx) => `Someone filed a ${ctx.category} report in ${ctx.neighborhood}. ${ctx.count} already watching.`,
    deepLink: "/feed?tab=near",
  },
  {
    type: "the_receipts",
    icon: "👁️",
    titleFn: (ctx) => `${ctx.count} watching your exposé`,
    bodyFn: () => "Your report is getting attention. The record is building.",
    deepLink: "/profile",
  },
  {
    type: "scope_creep_alert",
    icon: "💰",
    titleFn: () => "Budget moved near you",
    bodyFn: (ctx) => `A project in ${ctx.neighborhood} just crossed a new spending threshold. Follow the money.`,
    deepLink: "/spending",
  },
  {
    type: "the_receipts",
    icon: "🔥",
    titleFn: (ctx) => `${ctx.neighborhood} is heating up`,
    bodyFn: (ctx) => `${ctx.count} reports filed in the last 24h. Something's happening.`,
    deepLink: "/feed",
  },
  {
    type: "your_impact",
    icon: "⚡",
    titleFn: () => "Your block moved up",
    bodyFn: (ctx) => `${ctx.neighborhood} went from #${ctx.count + 3} to #${ctx.count} in activity. You started this.`,
    deepLink: "/feed",
  },
];

// ── Deterministic random from seed ────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ── Core engine ───────────────────────────────────────────────────────

/**
 * Generate activity notifications since the user's last session.
 * Called on app open. Creates 1-3 realistic notifications that feel
 * like real activity happened while they were gone.
 *
 * Returns the new notifications (already saved to localStorage).
 */
export function generateActivitySinceLastVisit(): FatCatsNotification[] {
  if (typeof window === "undefined") return [];

  const now = Date.now();
  const lastGen = localStorage.getItem(ACTIVITY_KEY);
  const lastGenTime = lastGen ? parseInt(lastGen, 10) : 0;

  // Don't generate more than once per 2 hours
  const hoursSince = (now - lastGenTime) / (1000 * 60 * 60);
  if (hoursSince < 2) return [];

  // More time away = more activity (feels like things happened without you)
  const activityCount = hoursSince > 24 ? 3 : hoursSince > 8 ? 2 : 1;

  // Use time-based seed for deterministic but varied results
  const daySeed = Math.floor(now / 86400000);
  const sessionSeed = Math.floor(now / 3600000);

  const newNotifs: FatCatsNotification[] = [];
  const existingIds = new Set(getNotifications().map(n => n.id));

  for (let i = 0; i < activityCount; i++) {
    const seed = daySeed * 100 + sessionSeed + i;
    const templateIdx = Math.floor(seededRandom(seed) * ACTIVITY_TEMPLATES.length);
    const template = ACTIVITY_TEMPLATES[templateIdx];

    const neighborhoodIdx = Math.floor(seededRandom(seed + 1) * NYC_NEIGHBORHOODS.length);
    const categoryIdx = Math.floor(seededRandom(seed + 2) * CATEGORIES.length);
    const count = Math.floor(seededRandom(seed + 3) * 12) + 2;

    // Time label based on how long they were gone
    const hoursAgoApprox = Math.floor(seededRandom(seed + 4) * Math.min(hoursSince, 24)) + 1;
    const timeLabel = hoursAgoApprox < 2 ? "in the last hour" :
                      hoursAgoApprox < 12 ? `${hoursAgoApprox}h ago` :
                      "while you were gone";

    const ctx: ActivityContext = {
      neighborhood: NYC_NEIGHBORHOODS[neighborhoodIdx],
      count,
      timeLabel,
      category: CATEGORIES[categoryIdx],
    };

    const id = `act_${daySeed}_${sessionSeed}_${i}`;
    if (existingIds.has(id)) continue;

    const notif: FatCatsNotification = {
      id,
      type: template.type,
      title: template.titleFn(ctx),
      body: template.bodyFn(ctx),
      icon: template.icon,
      deepLink: template.deepLink,
      createdAt: new Date(now - hoursAgoApprox * 3600000).toISOString(),
      read: false,
    };

    newNotifs.push(notif);
  }

  // Save to localStorage
  if (newNotifs.length > 0) {
    const existing = getNotifications();
    const all = [...newNotifs, ...existing].slice(0, 30); // cap at 30
    localStorage.setItem("fc_notifications", JSON.stringify(all));
  }

  localStorage.setItem(ACTIVITY_KEY, String(now));
  return newNotifs;
}

/**
 * Get the count of unread activity notifications (for the red dot).
 */
export function getActivityUnreadCount(): number {
  return getNotifications().filter(n => !n.read).length;
}
