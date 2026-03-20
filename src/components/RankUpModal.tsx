"use client";

import { RANK_CONFIG, type CivicRank } from "@/lib/gamification";

interface RankUpModalProps {
  rank: CivicRank;
  onClose: () => void;
  onShare?: () => void;
}

export default function RankUpModal({ rank, onClose, onShare }: RankUpModalProps) {
  const config = RANK_CONFIG[rank];
  if (!config) return null;

  const handleShare = () => {
    const text = `${config.icon} ${config.label}\n\n"${config.description}"\n\nfatcatsapp.com via @FatCatsApp #FatCatsNYC #PointExposeFix`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: `FatCats — ${config.label}`, text }).catch(() => {});
    } else if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    onShare?.();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div
          className="glass-card-elevated p-6 max-w-sm w-full border border-[var(--fc-orange)]/20 text-center animate-scale-in"
          style={{
            background: "linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(30,41,59,0.95) 50%, rgba(255,107,53,0.04) 100%)",
          }}
        >
          {/* Cold header */}
          <p className="text-[13px] font-bold text-[var(--fc-orange)] uppercase tracking-widest mb-4">
            New clearance.
          </p>

          {/* Rank icon */}
          <div className="w-20 h-20 rounded-2xl bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-[40px]">{config.icon}</span>
          </div>

          {/* Rank name */}
          <h2 className="text-xl font-black text-white mb-1">{config.label}</h2>
          <p className="text-[13px] text-[var(--fc-muted)] mb-1">
            &ldquo;{config.description}&rdquo;
          </p>
          <p className="text-[12px] text-[var(--fc-muted)] mb-6">
            Keep going. The record is watching.
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 h-11 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[13px] transition-colors active:scale-95"
            >
              Spread this
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-white/[0.06] text-white/70 font-semibold text-[13px] border border-white/[0.08] hover:bg-white/[0.1] transition-colors active:scale-95"
            >
              Noted
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
