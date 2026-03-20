"use client";

import { useState, useCallback, useEffect } from "react";
import { getViralHandles, getViralHashtags } from "@/lib/viral-share";

interface Official {
  role: string;
  name?: string;
  handle?: string;
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

function MegaphoneIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

function ShareIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function CopyIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

// Persist amplify count in localStorage per report
function getAmplifyCount(reportId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const data = JSON.parse(localStorage.getItem("fc_amplify_counts") || "{}");
    return data[reportId] || 0;
  } catch { return 0; }
}

function incrementAmplifyCount(reportId: string): number {
  if (typeof window === "undefined") return 1;
  try {
    const data = JSON.parse(localStorage.getItem("fc_amplify_counts") || "{}");
    const newCount = (data[reportId] || 0) + 1;
    data[reportId] = newCount;
    localStorage.setItem("fc_amplify_counts", JSON.stringify(data));
    return newCount;
  } catch { return 1; }
}

function hasAmplified(reportId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const data = JSON.parse(localStorage.getItem("fc_amplified") || "{}");
    return !!data[reportId];
  } catch { return false; }
}

function markAmplified(reportId: string): void {
  if (typeof window === "undefined") return;
  try {
    const data = JSON.parse(localStorage.getItem("fc_amplified") || "{}");
    data[reportId] = Date.now();
    localStorage.setItem("fc_amplified", JSON.stringify(data));
  } catch {}
}

export default function DeliveredTo({
  officials,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  exposéUrl,
  exposéTitle,
  neighborhood,
  costRange,
  daysOpen,
  stampCount,
}: DeliveredToProps) {
  // Each official has a selected state (default: all on)
  const [selected, setSelected] = useState<boolean[]>(() => officials.map(() => true));
  const [amplified, setAmplified] = useState(false);
  const [showParty, setShowParty] = useState(false);
  const [amplifyCount, setAmplifyCount] = useState(0);
  const [justAmplified, setJustAmplified] = useState(false);
  const [copied, setCopied] = useState(false);

  // Extract report ID from URL
  const extractReportId = useCallback((): string => {
    if (typeof window === "undefined") return "unknown";
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "unknown";
  }, []);

  // Load persisted state
  useEffect(() => {
    const reportId = extractReportId();
    setAmplifyCount(getAmplifyCount(reportId));
    setAmplified(hasAmplified(reportId));
  }, [extractReportId]);

  const selectedCount = selected.filter(Boolean).length;
  const selectedOfficials = officials.filter((_, i) => selected[i]);

  // Toggle individual official
  const toggleOfficial = (index: number) => {
    setSelected((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  // In-app amplify (the primary action)
  const handleAmplify = useCallback(() => {
    if (selectedCount === 0) return;
    const reportId = extractReportId();
    
    // Record amplification in-app
    const newCount = incrementAmplifyCount(reportId);
    markAmplified(reportId);
    setAmplifyCount(newCount);
    setAmplified(true);
    setJustAmplified(true);
    setShowParty(true);
    
    setTimeout(() => setJustAmplified(false), 2500);
  }, [selectedCount, extractReportId]);

  if (officials.length === 0) return null;

  // Secondary: also tweet (opens Twitter intent)
  const handleAlsoTweet = () => {
    const officialHandles = selectedOfficials
      .filter((o) => o.handle)
      .map((o) => o.handle!);
    const officialNames = selectedOfficials
      .filter((o) => !o.handle && o.name)
      .map((o) => o.name!);

    const category = inferCategoryFromTitle(exposéTitle);
    const viralHandles = getViralHandles(category);
    const hashtags = getViralHashtags();

    const costLine = costRange ? `${costRange} spent. ` : "";
    const location = neighborhood || "NYC";
    const daysLine = daysOpen > 7 ? `${daysOpen} days. No fix.` : `Open ${daysOpen} days.`;
    const affectedLine = stampCount > 0 ? ` ${stampCount} people affected.` : "";

    const deliveredParts = [...officialHandles, ...officialNames].filter(Boolean);
    const deliveredLine = deliveredParts.length > 0
      ? `\nDelivered to: ${deliveredParts.join(", ")}`
      : "";

    const ampHandles = viralHandles
      .filter(h => !officialHandles.includes(h))
      .slice(0, 2);

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
  };

  // Generate amplify party share link
  const partyUrl = typeof window !== "undefined"
    ? `${window.location.href}${window.location.href.includes("?") ? "&" : "?"}amplify=true`
    : "";
  
  const partyShareText = `Help me hold ${selectedOfficials[0]?.name || selectedOfficials[0]?.role || "officials"} accountable for ${exposéTitle.toLowerCase()}. Tap to amplify.`;

  // Copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(partyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = partyUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Native share
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Amplify: ${exposéTitle}`,
          text: partyShareText,
          url: partyUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

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

        {/* Officials list with selectable checkboxes */}
        <div className="divide-y divide-white/[0.03]">
          {officials.map((official, i) => (
            <button
              key={i}
              onClick={() => toggleOfficial(i)}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-left transition-all hover:bg-white/[0.02] active:scale-[0.99]"
            >
              {/* Custom checkbox */}
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                  selected[i]
                    ? "bg-[var(--fc-orange)] border-[var(--fc-orange)] animate-checkbox-fill"
                    : "border-white/20 bg-transparent"
                }`}
              >
                {selected[i] && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-checkbox-draw">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              <span className="text-[15px] shrink-0">{typeIcon(official.type)}</span>
              <div className="flex-1 min-w-0">
                <span className={`text-[12px] font-medium block truncate transition-colors ${
                  selected[i] ? "text-white" : "text-white/40"
                }`}>
                  {official.name || official.role}
                </span>
                {official.name && (
                  <span className="text-[10px] text-[var(--fc-muted)] block">{official.role}</span>
                )}
              </div>
              {official.handle && (
                <span className={`text-[11px] shrink-0 transition-colors ${
                  selected[i] ? "text-[var(--fc-info)]" : "text-white/20"
                }`}>
                  {official.handle}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Amplify CTA — in-app first, Twitter second */}
        <div className="px-4 py-3 border-t border-white/[0.04] space-y-2">
          {/* Primary: In-app amplify */}
          <button
            onClick={handleAmplify}
            disabled={selectedCount === 0}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-[0.97] relative overflow-hidden ${
              amplified
                ? "bg-[var(--fc-orange)]/15 text-[var(--fc-orange)] border border-[var(--fc-orange)]/30"
                : selectedCount === 0
                ? "bg-white/[0.03] text-white/20 border border-white/[0.04] cursor-not-allowed"
                : "bg-gradient-to-r from-[var(--fc-orange)] to-[#ff8c5a] text-white border border-transparent shadow-[0_4px_16px_rgba(232,101,43,0.25)] hover:shadow-[0_4px_24px_rgba(232,101,43,0.4)]"
            }`}
          >
            {justAmplified && <span className="animate-amplify-ripple absolute inset-0 rounded-xl bg-[var(--fc-orange)]/20" />}
            <MegaphoneIcon size={14} />
            <span className="relative z-10">
              {amplified
                ? `Amplified · ${amplifyCount} voices`
                : selectedCount === 0
                ? "Select officials to amplify"
                : `Amplify to ${selectedCount} official${selectedCount > 1 ? "s" : ""}`}
            </span>
          </button>

          {/* Secondary: Also post on X */}
          <button
            onClick={handleAlsoTweet}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-medium text-[var(--fc-muted)] hover:text-white bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all active:scale-[0.97]"
          >
            <XLogoSmall size={11} />
            <span>Also post on X</span>
          </button>
        </div>

        {/* Amplify count social proof */}
        {amplifyCount > 0 && (
          <div className="px-4 py-2 border-t border-white/[0.04] text-center">
            <span className="text-[11px] text-[var(--fc-muted)]">
              <span className="text-[var(--fc-orange)] font-bold tabular-nums">{amplifyCount}</span>
              {" "}voice{amplifyCount > 1 ? "s" : ""} amplified — they can&apos;t ignore this
            </span>
          </div>
        )}
      </div>

      {/* ═══ AMPLIFY PARTY — invite friends ═══ */}
      {showParty && (
        <div className="rounded-xl bg-white/[0.03] border border-[var(--fc-orange)]/15 overflow-hidden animate-slide-up">
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">🔊</span>
              <span className="text-[12px] font-bold text-white">Invite your crew to amplify</span>
            </div>
            <p className="text-[11px] text-[var(--fc-muted)] mt-1">
              More voices = more pressure. Share and watch the count climb.
            </p>
          </div>

          <div className="px-4 py-3 space-y-2">
            {/* Share link */}
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[11px] text-[var(--fc-muted)] truncate font-mono">
                {partyUrl.replace(/^https?:\/\//, "").slice(0, 50)}...
              </div>
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ${
                  copied
                    ? "bg-green-500/15 text-green-400 border border-green-500/20"
                    : "bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.1]"
                }`}
              >
                {copied ? (
                  <>
                    <CheckCircleIcon size={11} />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon size={11} />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Native share button */}
            <button
              onClick={handleNativeShare}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[12px] font-semibold text-white hover:bg-white/[0.08] transition-all active:scale-[0.97]"
            >
              <ShareIcon size={13} />
              <span>Share with friends</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
