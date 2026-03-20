"use client";

import { useState, useCallback } from "react";
import { addCoSign } from "@/lib/cosigns";
import { getDeviceHash } from "@/lib/device";

interface DuplicateMatch {
  id: string;
  title: string;
  cosign_count: number;
  supporters_count: number;
  created_at: string;
  neighborhood: string | null;
  photo_url: string | null;
  days_open: number;
}

interface NearDuplicateSheetProps {
  matches: DuplicateMatch[];
  onCoSigned: (reportId: string) => void;
  onFileNew: () => void;
  onDismiss: () => void;
}

/**
 * Bottom sheet shown during camera flow when a near-duplicate is detected.
 * "Someone already exposed this. Add your voice."
 */
export default function NearDuplicateSheet({
  matches,
  onCoSigned,
  onFileNew,
  onDismiss,
}: NearDuplicateSheetProps) {
  const [cosigning, setCosigning] = useState<string | null>(null);
  const [cosigned, setCosigned] = useState<string | null>(null);

  const handleCoSign = useCallback(
    async (reportId: string) => {
      setCosigning(reportId);
      const hash = getDeviceHash();

      // Get location
      let lat: number | null = null;
      let lng: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 3000,
            maximumAge: 300000,
          })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const result = await addCoSign(reportId, hash, lat, lng);
      setCosigning(null);

      if (result.success || result.alreadyCosigned) {
        setCosigned(reportId);
        setTimeout(() => onCoSigned(reportId), 1500);
      }
    },
    [onCoSigned]
  );

  const best = matches[0];
  const totalVoices = best.cosign_count + best.supporters_count + 1; // +1 for original reporter

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-[var(--fc-surface)] border-t border-white/10 rounded-t-2xl p-5 pb-8 animate-slide-up">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[20px]">👀</span>
          <div>
            <h3 className="text-[16px] font-bold text-white">
              Someone already exposed this
            </h3>
            <p className="text-[12px] text-[var(--fc-muted)]">
              Add your voice — more co-signs = more pressure
            </p>
          </div>
        </div>

        {/* Best match card */}
        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[var(--fc-muted)]">
              {best.neighborhood || "Nearby"} · {best.days_open}d ago
            </span>
            <span className="text-[11px] font-bold text-[var(--fc-orange)]">
              🐾 {best.cosign_count} co-sign
              {best.cosign_count !== 1 ? "s" : ""}
            </span>
          </div>
          <p className="text-[14px] text-white font-semibold leading-snug mb-3">
            {best.title}
          </p>

          {/* Co-sign CTA */}
          {cosigned === best.id ? (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[var(--fc-orange)]/15 border border-[var(--fc-orange)]/30">
              <span className="text-[16px]">🐾</span>
              <span className="text-[14px] font-bold text-[var(--fc-orange)]">
                You&apos;re co-signer #{best.cosign_count + 1}
              </span>
            </div>
          ) : (
            <button
              onClick={() => handleCoSign(best.id)}
              disabled={cosigning !== null}
              className="w-full py-3 rounded-xl bg-[var(--fc-orange)] text-white font-bold text-[14px] hover:bg-[var(--fc-orange)]/90 transition-all active:scale-[0.97]"
            >
              {cosigning === best.id ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Adding your voice...
                </span>
              ) : (
                <>
                  🐾 Co-sign this exposé — be #{best.cosign_count + 1}
                </>
              )}
            </button>
          )}

          {totalVoices > 1 && (
            <p className="text-[11px] text-[var(--fc-muted)] text-center mt-2">
              {totalVoices} citizens have flagged this issue
            </p>
          )}
        </div>

        {/* Other matches */}
        {matches.length > 1 && (
          <div className="mb-4">
            <p className="text-[11px] text-[var(--fc-muted)] uppercase tracking-wider mb-2">
              Other nearby exposés
            </p>
            <div className="flex flex-col gap-2">
              {matches.slice(1, 3).map((m) => (
                <a
                  key={m.id}
                  href={`/expose/${m.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white font-medium truncate">
                      {m.title}
                    </p>
                    <p className="text-[10px] text-[var(--fc-muted)]">
                      {m.days_open}d open · 🐾 {m.cosign_count}
                    </p>
                  </div>
                  <span className="text-[11px] text-[var(--fc-orange)] font-semibold ml-2">
                    View →
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* File new option */}
        <button
          onClick={onFileNew}
          className="w-full py-2.5 text-center text-[13px] text-[var(--fc-muted)] hover:text-white transition-colors"
        >
          This is a different issue → File new exposé
        </button>
      </div>
    </div>
  );
}
