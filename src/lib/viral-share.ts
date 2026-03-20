/**
 * Viral Share Intelligence — Algorithmic Reach Engine
 *
 * The old share system tagged city agencies (@NYC_DOT) that never reply.
 * The algorithm doesn't care about tags that don't engage back.
 *
 * This module picks handles that WILL engage — journalists, watchdog accounts,
 * politicians with active reply habits — because:
 *   - Reply-to-reply = 75x multiplier
 *   - Retweet = 20x multiplier
 *   - "Liked by someone you follow" = strongest out-of-network signal
 *
 * It also constructs share text per-platform optimized for each algorithm:
 *   - X: No link in body (50-90% suppression), provocative question ending
 *   - WhatsApp/iMessage: Short + OG card does the work
 *   - Reddit: Rage-bait title format that r/nyc upvotes
 */

// ─── HIGH-ENGAGEMENT HANDLES ──────────────────────────────────────────
// These accounts actively reply/retweet citizen infrastructure complaints.
// Rotated per-category to stay relevant to SimClusters.

interface ViralHandle {
  handle: string;
  name: string;
  /** Which report categories this handle is relevant for */
  categories: string[];
  /** Type determines priority: journalist > watchdog > politician > agency */
  type: "journalist" | "watchdog" | "politician" | "agency";
  /** Engagement score: how likely they are to actually respond (1-10) */
  engagementScore: number;
}

const VIRAL_HANDLES: ViralHandle[] = [
  // Journalists who cover NYC infrastructure — they REPLY and QUOTE-TWEET
  { handle: "@DavidWMeyer", name: "David Meyer", categories: ["pothole", "road_damage", "sidewalk", "traffic_signal"], type: "journalist", engagementScore: 9 },
  { handle: "@StreetsblogNYC", name: "Streetsblog NYC", categories: ["pothole", "road_damage", "sidewalk", "traffic_signal", "street_light"], type: "watchdog", engagementScore: 9 },
  { handle: "@2aborider", name: "Transportation Alternatives", categories: ["pothole", "road_damage", "sidewalk", "traffic_signal", "street_light"], type: "watchdog", engagementScore: 8 },
  { handle: "@GothamGazette", name: "Gotham Gazette", categories: ["pothole", "road_damage", "sidewalk", "water", "sewer", "trash", "other"], type: "journalist", engagementScore: 7 },
  { handle: "@taborwb", name: "Ben Fried (Streetsblog)", categories: ["pothole", "road_damage", "sidewalk", "traffic_signal"], type: "journalist", engagementScore: 7 },
  { handle: "@TheCityNY", name: "THE CITY", categories: ["pothole", "road_damage", "sidewalk", "water", "sewer", "trash", "other"], type: "journalist", engagementScore: 8 },
  
  // Watchdog / civic accounts — high retweet probability
  { handle: "@FixTheSubway", name: "Riders Alliance", categories: ["pothole", "road_damage", "traffic_signal", "street_light"], type: "watchdog", engagementScore: 7 },
  { handle: "@ABORNYC", name: "ABOR NYC", categories: ["road_damage", "sidewalk", "pothole"], type: "watchdog", engagementScore: 6 },
  { handle: "@Gothamist", name: "Gothamist", categories: ["pothole", "road_damage", "sidewalk", "water", "sewer", "trash", "other"], type: "journalist", engagementScore: 8 },
  
  // Politicians who actually engage on Twitter (not all do)
  { handle: "@JumaaneWilliams", name: "Jumaane Williams", categories: ["pothole", "road_damage", "sidewalk", "water", "sewer", "trash", "other"], type: "politician", engagementScore: 7 },
  { handle: "@BradLander", name: "Brad Lander", categories: ["pothole", "road_damage", "sidewalk", "water", "sewer", "trash", "other"], type: "politician", engagementScore: 6 },
  { handle: "@NYCMayor", name: "NYC Mayor", categories: ["pothole", "road_damage", "sidewalk", "water", "sewer", "trash", "other"], type: "politician", engagementScore: 5 },
  
  // National government waste / efficiency accounts — the SimCluster bridge
  { handle: "@OpenTheBooks", name: "Open The Books", categories: ["pothole", "road_damage", "sidewalk", "water", "sewer", "trash", "other"], type: "watchdog", engagementScore: 8 },
  
  // Agency handles kept as fallback only (lowest priority)
  { handle: "@NYC_DOT", name: "NYC DOT", categories: ["pothole", "road_damage", "sidewalk", "street_light", "traffic_signal"], type: "agency", engagementScore: 2 },
  { handle: "@NYCwater", name: "NYC Water", categories: ["water", "sewer"], type: "agency", engagementScore: 2 },
  { handle: "@NYCSanitation", name: "NYC Sanitation", categories: ["trash"], type: "agency", engagementScore: 2 },
];

// ─── HIGH-VOLUME HASHTAGS (SimCluster targeting) ──────────────────────
// These map to actual algorithm clusters where influence accounts live.
// Rotated to avoid spam detection.

const HASHTAG_POOLS = {
  infrastructure: ["#NYCinfrastructure", "#Infrastructure", "#GovernmentWaste", "#TaxpayerMoney"],
  accountability: ["#Accountability", "#TransparencyNow", "#PublicRecords", "#FollowTheMoney"],
  local: ["#NYC", "#NewYorkCity"],
  viral: ["#PointExposeFix"],
} as const;

/**
 * Pick 2-3 handles most likely to engage for this category.
 * Priority: journalist > watchdog > politician > agency
 * Never more than 3 (looks spammy, algorithm penalizes).
 */
export function getViralHandles(category: string, councilHandle?: string): string[] {
  const relevant = VIRAL_HANDLES
    .filter(h => h.categories.includes(category))
    .sort((a, b) => {
      // Sort by type priority, then engagement score
      const typePriority = { journalist: 0, watchdog: 1, politician: 2, agency: 3 };
      const typeDiff = typePriority[a.type] - typePriority[b.type];
      if (typeDiff !== 0) return typeDiff;
      return b.engagementScore - a.engagementScore;
    });

  // Pick top 2 (journalist/watchdog), skip agencies
  const picks = relevant
    .filter(h => h.type !== "agency")
    .slice(0, 2)
    .map(h => h.handle);

  // Add council member handle if available (they have political incentive to respond)
  if (councilHandle && picks.length < 3) {
    picks.push(councilHandle);
  }

  return picks;
}

/**
 * Pick 2-3 hashtags that map to high-traffic SimClusters.
 * Always: 1 local + 1 infrastructure/accountability + 1 viral brand
 */
export function getViralHashtags(): string {
  const local = HASHTAG_POOLS.local[Math.floor(Math.random() * HASHTAG_POOLS.local.length)];
  const topic = [...HASHTAG_POOLS.infrastructure, ...HASHTAG_POOLS.accountability];
  const topicPick = topic[Math.floor(Math.random() * topic.length)];
  return `${local} ${topicPick} ${HASHTAG_POOLS.viral[0]}`;
}

// ─── PLATFORM-SPECIFIC SHARE TEXT ─────────────────────────────────────

interface ShareContext {
  title: string;
  neighborhood: string;
  costRange: string;
  costAvg: number;
  daysOpen: number;
  affected: number;
  category: string;
  url: string;
  councilHandle?: string;
  deliveredOfficials?: { name?: string; handle?: string; role: string }[];
}

/**
 * X/Twitter share text — optimized for algorithmic reach.
 *
 * Rules:
 * - NO link in body (50-90% suppression). Link goes in a reply.
 * - Lead with shocking cost stat (data = S-tier algorithmic content)
 * - Tag handles that will actually engage (not agencies)
 * - End with provocative question (triggers replies = 13.5x multiplier)
 * - 2-3 high-volume hashtags (SimCluster targeting)
 * - No emoji spam (looks like engagement bait, algorithm penalizes)
 */
export function buildXShareText(ctx: ShareContext): { mainTweet: string; replyTweet: string } {
  const handles = getViralHandles(ctx.category, ctx.councilHandle);
  const hashtags = getViralHashtags();
  const handleStr = handles.join(" ");

  // Delivered officials line (if available)
  const deliveredLine = ctx.deliveredOfficials && ctx.deliveredOfficials.length > 0
    ? `\nDelivered to: ${ctx.deliveredOfficials.map(o => o.handle || o.name || o.role).join(", ")}`
    : "";

  // Cost formatting for shock value
  const costLead = ctx.costAvg >= 10000
    ? `$${Math.round(ctx.costAvg / 1000)}K+`
    : ctx.costAvg >= 1000
    ? `$${Math.round(ctx.costAvg / 1000)}K`
    : `$${ctx.costAvg}`;

  // Affected line
  const affectedLine = ctx.affected > 0 ? `${ctx.affected} people affected. ` : "";
  
  // Days line — only if it's outrageous
  const daysLine = ctx.daysOpen > 7 ? `${ctx.daysOpen} days. No fix.` : "";

  const mainTweet = [
    `Est. ~${costLead} to fix. ${ctx.title} in ${ctx.neighborhood}.`,
    "",
    `${daysLine} ${affectedLine}`.trim(),
    deliveredLine,
    "",
    `${handleStr} — who signed off on this?`,
    "",
    hashtags,
  ].filter(Boolean).join("\n").trim();

  // Reply contains the link (no suppression in replies)
  const replyTweet = `Full receipt: ${ctx.url}`;

  return { mainTweet, replyTweet };
}

/**
 * WhatsApp/iMessage share text — short, OG card does the work.
 * The preview image (from /api/og/[id]) carries the visual weight.
 * Text just needs to be forwarding-friendly: one gut-punch line + link.
 */
export function buildWhatsAppShareText(ctx: ShareContext): string {
  return `Est. ${ctx.costRange} to fix and no one's moved. ${ctx.title} — ${ctx.neighborhood}.\n${ctx.url}`;
}

/**
 * Reddit title — optimized for r/nyc upvote psychology.
 * Format: cost + problem + location + time + rhetorical shock
 */
export function buildRedditTitle(ctx: ShareContext): string {
  const costLead = ctx.costRange ? `Est. ${ctx.costRange} to fix — ` : "";
  const daysStr = ctx.daysOpen > 1 ? ` — open ${ctx.daysOpen} days, no one's moved` : "";
  return `${costLead}${ctx.title.toLowerCase()} in ${ctx.neighborhood}${daysStr}. Here's the receipt.`;
}

/**
 * Native share (iOS/Android share sheet) — works for any platform.
 * Short enough that people don't edit it before forwarding.
 */
export function buildNativeShareText(ctx: ShareContext): { title: string; text: string } {
  const costLead = ctx.costRange ? `Est. ${ctx.costRange} to fix. ` : "";
  return {
    title: `${ctx.title} — ${ctx.neighborhood}`,
    text: `${costLead}${ctx.title} — ${ctx.neighborhood}. Still not fixed. Point. Expose. Fix.`,
  };
}

/**
 * For the ReportCard (feed) — lighter version of X share.
 * Feed cards use a simpler share since users haven't drilled into the exposé yet.
 */
export function buildFeedXShareText(ctx: ShareContext): string {
  const handles = getViralHandles(ctx.category, ctx.councilHandle);
  const hashtags = getViralHashtags();

  const costLead = ctx.costAvg >= 1000
    ? `$${Math.round(ctx.costAvg / 1000)}K`
    : `$${ctx.costAvg}`;

  return [
    `Est. ~${costLead} to fix. ${ctx.title.toLowerCase()} in ${ctx.neighborhood || "NYC"}.`,
    ctx.daysOpen > 7 ? `Open ${ctx.daysOpen} days. No one's moved.` : "",
    "",
    `${handles.slice(0, 2).join(" ")} — who signed off on this?`,
    "",
    hashtags,
  ].filter(Boolean).join("\n").trim();
}
