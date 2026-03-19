/**
 * Dharmaraj Voice Filter
 *
 * Transforms raw 311 bureaucratic titles into punchy, human headlines.
 * Every card should read like a tabloid headline a 13-year-old gets in 3 seconds.
 *
 * Rule: shock number + one-line context + tap hook, 3 lines max.
 * Never: jargon, agency codes, passive voice, "condition" language.
 */

// ── Category → human-readable descriptions ───────────────────────────

const CATEGORY_VOICE: Record<string, string> = {
  pothole: "Pothole",
  road_damage: "Busted road",
  streetlight: "Broken streetlight",
  street_light: "Broken streetlight",
  sidewalk: "Wrecked sidewalk",
  trash: "Trash dump",
  water: "Water main break",
  sewer: "Sewer blowout",
  traffic_signal: "Dead traffic signal",
  other: "Infrastructure failure",
};

// ── Pattern rewrites: raw 311 → Dharmaraj voice ─────────────────────

const REWRITE_RULES: [RegExp, string][] = [
  // Traffic signals
  [/^Traffic Signal Condition[:\s]*(.*)/i, "Dead traffic signal — $1"],
  [/^Traffic Signal.*$/i, "Traffic signal down"],
  
  // Streetlights
  [/^Street Light Condition[:\s]*(.*)/i, "Streetlight out — $1"],
  [/^Street Light.*Out$/i, "Streetlight out"],
  [/^Street Light.*$/i, "Broken streetlight"],
  [/^Streetlight.*$/i, "Broken streetlight"],
  
  // Potholes
  [/^Pothole$/i, "Pothole eating the road"],
  [/^Pothole[:\s]*(.*)/i, "Pothole — $1"],
  
  // Sidewalks
  [/^Broken Sidewalk$/i, "Sidewalk cracked open"],
  [/^Sidewalk Condition[:\s]*(.*)/i, "Sidewalk damage — $1"],
  [/^Damaged Sidewalk$/i, "Sidewalk cracked open"],
  
  // Water & Sewer
  [/^Water Main Break$/i, "Water main eruption"],
  [/^Water System[:\s]*(.*)/i, "Water system failure — $1"],
  [/^Sewer[:\s]*(.*)/i, "Sewer problem — $1"],
  [/^Catch Basin.*$/i, "Flooded catch basin"],
  
  // Sanitation
  [/^Dirty Condition.*$/i, "Filthy conditions"],
  [/^Sanitation Condition[:\s]*(.*)/i, "Sanitation failure — $1"],
  [/^Missed Collection.*$/i, "Trash pickup skipped"],
  [/^Overflowing.*(?:Litter|Trash|Recycling).*$/i, "Overflowing trash"],
  [/^Derelict Vehicle.*$/i, "Abandoned vehicle rotting on the street"],
  
  // Road / Construction
  [/^Road.*Condition[:\s]*(.*)/i, "Road damage — $1"],
  [/^Construction.*Lead.*$/i, "Construction hazard"],
  [/^Highway Condition.*$/i, "Highway damage"],
  
  // General condition patterns (catch-all for "X Condition: Y")
  [/^(.+)\s+Condition[:\s]+(.+)$/i, "$1 — $2"],
  [/^(.+)\s+Condition$/i, "$1 issue"],
  
  // Noise / Quality of life
  [/^Noise.*$/i, "Noise complaint"],
  [/^Blocked Driveway.*$/i, "Driveway blocked"],
  
  // Generic cleanup
  [/^General Construction.*$/i, "Construction hazard"],
];

// Words that scream "government form" — kill on sight
const JARGON_WORDS = [
  "condition",
  "complaint type",
  "descriptor",
  "incident",
  "request",
  "service request",
  "sr#",
];

/**
 * Transform a raw 311 title through the Dharmaraj voice filter.
 *
 * If the title is already clean (citizen-reported), returns it as-is.
 * If it's raw 311 bureaucratic language, rewrites it.
 */
export function filterTitle(title: string, category?: string): string {
  if (!title) return CATEGORY_VOICE[category || "other"] || "Infrastructure issue";
  
  const trimmed = title.trim();
  
  // If it's short and doesn't match jargon patterns, it's probably already clean
  const lowerTitle = trimmed.toLowerCase();
  const hasJargon = JARGON_WORDS.some(j => lowerTitle.includes(j));
  const looksRaw311 = /^[A-Z][a-z]+ [A-Z][a-z]+[\s:]+/.test(trimmed) || hasJargon;
  
  if (!looksRaw311 && trimmed.length < 80) {
    return trimmed;
  }
  
  // Try pattern rewrites
  for (const [pattern, replacement] of REWRITE_RULES) {
    if (pattern.test(trimmed)) {
      let result = trimmed.replace(pattern, replacement);
      // Clean up artifacts
      result = result.replace(/\s*—\s*$/g, ""); // trailing dash
      result = result.replace(/\s{2,}/g, " ").trim();
      // Capitalize first letter
      result = result.charAt(0).toUpperCase() + result.slice(1);
      return result;
    }
  }
  
  // If nothing matched but it has jargon, use category voice + neighborhood
  if (hasJargon && category) {
    return CATEGORY_VOICE[category] || "Infrastructure issue";
  }
  
  // Truncate overly long titles
  if (trimmed.length > 60) {
    return trimmed.slice(0, 57) + "...";
  }
  
  return trimmed;
}

/**
 * Transform a raw 311 status into human language.
 * 
 * Before: "Assigned", "In Progress"  
 * After:  "City responded", "Being fixed"
 */
export function filterStatus(status: string): string {
  switch (status.toLowerCase()) {
    case "open":
    case "unresolved":
    case "pending":
      return "Reported";
    case "assigned":
      return "City responded";
    case "in_progress":
      return "Being fixed";
    case "resolved":
    case "closed":
    case "fixed":
      return "Marked fixed";
    case "verified":
      return "Fix confirmed";
    default:
      return "Reported";
  }
}

/**
 * Generate a human-readable cost context from raw dollar amounts.
 *
 * Before: "+448,600% over budget"
 * After:  "$4M for a playground that's still broken"
 *
 * Before: "$30-$150 per pothole | Beta"  
 * After:  "~$75 to fix"
 */
export function filterCost(range: string, avg: number): string {
  if (avg >= 10000) return `~${formatShortMoney(avg)} to fix`;
  if (avg >= 1000) return `~${formatShortMoney(avg)} to fix`;
  return `~${formatShortMoney(avg)} fix`;
}

function formatShortMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

/**
 * Rewrite a spending delta into human-readable context.
 *
 * Before: "+448,600% over"
 * After:  "Budget jumped $2.3M → $12.1M"
 */
export function filterSpendingDelta(
  original: number,
  current: number,
  deltaPct: number,
  projectName: string
): string {
  const delta = current - original;
  if (delta <= 0) return `Under budget by ${formatShortMoney(Math.abs(delta))}`;
  
  // The Aatma rule: never "+46,000% over budget" — always real dollars
  return `${formatShortMoney(delta)} over budget`;
}
