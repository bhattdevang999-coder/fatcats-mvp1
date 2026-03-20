"use client";

import { useState } from "react";
import { getViralHandles, getViralHashtags } from "@/lib/viral-share";

interface Official {
  role: string;       // "Council District 7" or "NYC DOT" or "RoadFixers Inc"
  name?: string;      // "Shaun Abreu" or null for agencies
  handle?: string;    // "@ShaunAbreu" or null
  type: "council" | "agency" | "contractor";
}

interface DeliveredToProps {
  officials: Official[];
  exposéUrl: string;
  exposéTitle: string;
  neighborhood?: string | null;
  costRange?: string;
  daysOpen: number;
  stampCount: number;
}

function SendIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function XLogoSmall({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function CheckCircleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function DeliveredTo({
  officials,
  exposéUrl,
  exposéTitle,
  neighborhood,
  costRange,
  daysOpen,
  stampCount,
}: DeliveredToProps) {
  const [amplified, setAmplified] = useState(false);

  if (officials.length === 0) return null;

  // Build the "amplify" tweet — algorithmic reach optimized
  // Tags officials + journalists/watchdogs, no link in body, provocative ending
  const handleAmplify = () => {
    const officialHandles = officials
      .filter((o) => o.handle)
      .map((o) => o.handle!);
    const officialNames = officials
      .filter((o) => !o.handle && o.name)
      .map((o) => o.name!);
    
    // Get high-engagement journalist/watchdog handles (category-aware)
    const category = inferCategoryFromTitle(exposéTitle);
    const viralHandles = getViralHandles(category);
    const hashtags = getViralHashtags();
    
    const costLine = costRange ? `${costRange} spent. ` : "";
    const location = neighborhood || "NYC";
    const daysLine = daysOpen > 7 ? `${daysOpen} days. No fix.` : `Open ${daysOpen} days.`;
    const affectedLine = stampCount > 0 ? ` ${stampCount} people affected.` : "";
    
    // Delivered line — the accountability chain
    const deliveredParts = [...officialHandles, ...officialNames].filter(Boolean);
    const deliveredLine = deliveredParts.length > 0
      ? `\nDelivered to: ${deliveredParts.join(", ")}`
      : "";
    
    // Journalist/watchdog tags — the amplification layer
    const ampHandles = viralHandles
      .filter(h => !officialHandles.includes(h)) // don't double-tag
      .slice(0, 2);
    
    // NO link in body (50-90% suppression). Ends with provocative question.
    const text = [
      `${costLine}${exposéTitle} — ${location}`,
      "",
      `${daysLine}${affectedLine}`,
      deliveredLine,
      "",
      `${ampHandles.join(" ")} — who signed off on this?`,
      "",
      hashtags,
    ].filter(Boolean).join("\n").trim();
    
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setAmplified(true);
  };

  // Rough category inference from title for handle selection
  function inferCategoryFromTitle(title: string): string {
    const t = title.toLowerCase();
    if (t.includes("pothole")) return "pothole";
    if (t.includes("road") || t.includes("pavement")) return "road_damage";
    if (t.includes("sidewalk")) return "sidewalk";
    if (t.includes("streetlight") || t.includes("street light") || t.includes("light")) return "street_light";
    if (t.includes("traffic") || t.includes("signal")) return "traffic_signal";
    if (t.includes("water") || t.includes("hydrant")) return "water";
    if (t.includes("sewer") || t.includes("drain")) return "sewer";
    if (t.includes("trash") || t.includes("garbage") || t.includes("sanitation")) return "trash";
    return "other";
  }

  // Icon for each official type
  const typeIcon = (type: string) => {
    switch (type) {
      case "council": return "🏛️";
      case "agency": return "📋";
      case "contractor": return "🔧";
      default: return "📌";
    }
  };

  return (
    <div className="space-y-2">
      {/* Delivered To banner */}
      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04]">
          <span className="text-[var(--fc-orange)]">
            <SendIcon size={13} />
          </span>
          <span className="text-[11px] font-semibold text-[var(--fc-muted)] uppercase tracking-wider">
            Delivered to
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-[var(--fc-muted)]">
            <CheckCircleIcon size={10} />
            <span>Auto-notified</span>
          </span>
        </div>

        {/* Officials list */}
        <div className="divide-y divide-white/[0.03]">
          {officials.map((official, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-[15px] shrink-0">{typeIcon(official.type)}</span>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] text-white font-medium block truncate">
                  {official.name || official.role}
                </span>
                {official.name && (
                  <span className="text-[10px] text-[var(--fc-muted)] block">{official.role}</span>
                )}
              </div>
              {official.handle && (
                <a
                  href={`https://twitter.com/${official.handle.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[var(--fc-info)] hover:underline shrink-0"
                >
                  {official.handle}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Amplify CTA */}
        <div className="px-4 py-3 border-t border-white/[0.04]">
          <button
            onClick={handleAmplify}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97] ${
              amplified
                ? "bg-[var(--fc-orange)]/10 text-[var(--fc-orange)] border border-[var(--fc-orange)]/20"
                : "bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.1] hover:border-[var(--fc-orange)]/30"
            }`}
          >
            <XLogoSmall size={13} />
            <span>{amplified ? "Amplified" : "Amplify — tweet at all"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
