"use client";

import { useState } from "react";
import FollowButton from "@/components/FollowButton";

// X (Twitter) icon
function XLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// Reddit icon
function RedditLogo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  );
}

// Share icon (generic)
function ShareUpIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

interface ShareSheetProps {
  title: string;
  neighborhood?: string | null;
  url: string;
  category?: string;
  stampCount: number;
  createdAt: string;
  agencyHandle: string;
  councilMemberHandle?: string;
  costRange?: string;
  totalAreaSpend?: string;
  nearbyCount?: number;
  variant?: "sticky" | "inline";
  /** When provided in sticky mode, renders a Follow bell as the first button */
  reportId?: string;
  projectId?: string;
}

function addUtm(baseUrl: string, source: string): string {
  const sep = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${sep}ref=${source}&utm_source=${source}&utm_medium=share&utm_campaign=expose`;
}

export default function ShareSheet({
  title,
  neighborhood,
  url,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  category,
  stampCount,
  createdAt,
  agencyHandle,
  councilMemberHandle,
  costRange,
  totalAreaSpend,
  nearbyCount,
  variant = "inline",
  reportId,
  projectId,
}: ShareSheetProps) {
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);

  const daysOpen = Math.max(1, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000));
  const affected = stampCount > 0 ? `${stampCount} people affected. ` : "";

  const handleX = () => {
    const shareUrl = addUtm(url, "twitter");
    const councilTag = councilMemberHandle ? ` ${councilMemberHandle}` : "";
    const costLead = costRange ? `${costRange} spent. ` : "";
    const areaLine = totalAreaSpend && nearbyCount ? `${nearbyCount} issues within ~3 blocks = ${totalAreaSpend} in taxpayer money. ` : "";
    const text = `${costLead}${title} — ${neighborhood || "NYC"}\n\nOpen ${daysOpen} days. ${affected}${areaLine}\n\n${agencyHandle}${councilTag} what's the plan?\n\nPoint. Expose. Fix. → ${shareUrl}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const handleReddit = () => {
    const shareUrl = addUtm(url, "reddit");
    const subreddit = "nyc";
    const costLead = costRange ? `${costRange} spent on ` : "";
    const redditTitle = `${costLead}${title.toLowerCase()} in ${neighborhood || "NYC"} — open ${daysOpen} days, ${stampCount} affected. Here's the receipt.`;
    window.open(
      `https://www.reddit.com/r/${subreddit}/submit?type=link&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(redditTitle)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleNativeShare = async () => {
    const shareUrl = addUtm(url, "native");
    if (navigator.share) {
      try {
        const costLead = costRange ? `${costRange} spent. ` : "";
        await navigator.share({
          title: `${costLead}${title} — ${neighborhood || "NYC"}`,
          text: `${costLead}${title} — ${neighborhood || "NYC"}. ${affected}Point. Expose. Fix.`,
          url: shareUrl,
        });
      } catch {}
    } else {
      setShowMore(true);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = addUtm(url, "copy");
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const shareUrl = addUtm(url, "whatsapp");
    const costLead = costRange ? `${costRange} spent. ` : "";
    const text = `${costLead}${title} — ${neighborhood || "NYC"}. ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const isSticky = variant === "sticky";

  return (
    <>
      <div
        className={
          isSticky
            ? "fixed bottom-[var(--bottom-bar-height)] left-0 right-0 z-40 px-4 pb-3 pt-2 bg-gradient-to-t from-[var(--fc-bg)] via-[var(--fc-bg)]/95 to-transparent"
            : "flex items-center gap-2"
        }
      >
        <div className={isSticky ? "max-w-lg mx-auto flex items-center gap-2" : "flex items-center gap-2"}>
          {/* Follow button — first in sticky bar for max visibility */}
          {isSticky && reportId && (
            <FollowButton kind="report" id={reportId} variant="prominent" />
          )}
          {isSticky && projectId && (
            <FollowButton kind="project" id={projectId} variant="prominent" />
          )}

          {/* X button */}
          <button
            onClick={handleX}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.12] transition-all active:scale-90"
            title="Post on X"
          >
            <XLogo size={18} />
          </button>

          {/* Reddit button */}
          <button
            onClick={handleReddit}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/[0.06] text-[#FF4500] border border-white/[0.08] hover:bg-white/[0.12] transition-all active:scale-90"
            title="Post on Reddit"
          >
            <RedditLogo size={18} />
          </button>

          {/* Share button — grows to fill in sticky mode */}
          <button
            onClick={handleNativeShare}
            className={`flex items-center justify-center gap-2 h-11 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[14px] transition-all active:scale-[0.97] ${
              isSticky ? "flex-1" : "w-11"
            }`}
          >
            <ShareUpIcon size={18} />
            {isSticky && <span>Share</span>}
          </button>
        </div>
      </div>

      {/* Fallback share modal (if native share not available) */}
      {showMore && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--fc-surface)] rounded-t-2xl p-6 animate-slide-up border-t border-white/10">
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
            <h3 className="text-[15px] font-bold text-white mb-4">Share this exposé</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <button onClick={handleWhatsApp} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[#25D366]/15 flex items-center justify-center text-[22px]">💬</div>
                <span className="text-[10px] text-[var(--fc-muted)]">WhatsApp</span>
              </button>
              <button onClick={handleX} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-white"><XLogo size={20} /></div>
                <span className="text-[10px] text-[var(--fc-muted)]">X</span>
              </button>
              <button onClick={handleReddit} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-[#FF4500]/15 flex items-center justify-center text-[#FF4500]"><RedditLogo size={20} /></div>
                <span className="text-[10px] text-[var(--fc-muted)]">Reddit</span>
              </button>
              <button onClick={handleCopyLink} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-[22px]">{copied ? "✅" : "🔗"}</div>
                <span className="text-[10px] text-[var(--fc-muted)]">{copied ? "Copied" : "Copy link"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
