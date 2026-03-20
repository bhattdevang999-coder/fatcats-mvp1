"use client";

import { useState, useEffect, useCallback } from "react";
import { addCoSign, hasCosigned } from "@/lib/cosigns";
import { getDeviceHash } from "@/lib/device";

interface CoSignButtonProps {
  reportId: string;
  initialCount: number;
  compact?: boolean; // smaller version for card footers
}

export default function CoSignButton({
  reportId,
  initialCount,
  compact = false,
}: CoSignButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [justSigned, setJustSigned] = useState(false);
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);

  // Check if already co-signed
  useEffect(() => {
    const check = async () => {
      const hash = getDeviceHash();
      const already = await hasCosigned(reportId, hash);
      if (already) setSigned(true);
    };
    check();
  }, [reportId]);

  const handleCoSign = useCallback(async () => {
    if (signed || loading) return;
    setLoading(true);

    const hash = getDeviceHash();

    // Try to get user location for evidence weight
    let lat: number | null = null;
    let lng: number | null = null;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
            maximumAge: 300000,
          })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // Fine — co-sign without location
      }
    }

    const result = await addCoSign(reportId, hash, lat, lng);

    if (result.success) {
      setCount(result.totalCosigns);
      setSigned(true);
      setJustSigned(true);
      if (result.milestoneLabel) {
        setMilestoneMsg(result.milestoneLabel);
        setTimeout(() => setMilestoneMsg(null), 4000);
      }
      setTimeout(() => setJustSigned(false), 2000);
    } else if (result.alreadyCosigned) {
      setSigned(true);
      setCount(result.totalCosigns);
    }

    setLoading(false);
  }, [reportId, signed, loading]);

  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCoSign();
        }}
        disabled={signed || loading}
        className={`flex items-center gap-1.5 transition-all active:scale-90 ${
          signed
            ? "text-[var(--fc-orange)]"
            : "text-[var(--fc-muted)] hover:text-[var(--fc-orange)]"
        }`}
      >
        <span
          className={`text-[14px] transition-transform ${
            justSigned ? "scale-125" : ""
          }`}
        >
          🐾
        </span>
        <span className="text-[12px] font-semibold">
          {count > 0 ? count : "Co-sign"}
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCoSign();
        }}
        disabled={signed || loading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all active:scale-95 ${
          signed
            ? "bg-[var(--fc-orange)]/15 border border-[var(--fc-orange)]/30 text-[var(--fc-orange)]"
            : "bg-white/[0.04] border border-white/[0.08] text-[var(--fc-muted)] hover:bg-[var(--fc-orange)]/10 hover:border-[var(--fc-orange)]/20 hover:text-[var(--fc-orange)]"
        }`}
      >
        <span
          className={`text-[16px] transition-transform duration-300 ${
            justSigned ? "scale-150 rotate-12" : ""
          }`}
        >
          🐾
        </span>
        <span className="text-[13px] font-semibold">
          {loading
            ? "..."
            : signed
            ? `Co-signed · ${count}`
            : count > 0
            ? `Co-sign · ${count}`
            : "Co-sign this"}
        </span>
      </button>

      {/* Milestone toast */}
      {milestoneMsg && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-[var(--fc-orange)] text-white text-[11px] font-bold animate-bounce shadow-lg shadow-[var(--fc-orange)]/20">
          {milestoneMsg}
        </div>
      )}

      {/* Just-signed confirmation */}
      {justSigned && !milestoneMsg && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur text-white text-[11px] font-semibold animate-fade-in">
          🐾 You&apos;re co-signer #{count}
        </div>
      )}
    </div>
  );
}
