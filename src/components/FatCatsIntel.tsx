"use client";

import Image from "next/image";

/**
 * FatCats Intel — branded AI intelligence badge.
 * Used wherever the platform's AI layer surfaces insights:
 * classification, cost estimates, geo-intelligence, etc.
 *
 * The glowing logo is the merch-worthy icon — not a generic robot.
 */

// Glowing logo icon — the angular orange cat, with ambient glow
export function IntelLogo({ size = 24 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        filter: "drop-shadow(0 0 6px rgba(232, 101, 43, 0.5))",
      }}
    >
      <Image
        src="/assets/logo-64.png"
        alt="FatCats Intel"
        width={size}
        height={size}
        className="object-contain"
      />
    </span>
  );
}

// Inline badge: [glowing logo] FatCats Intel [Beta]
export function FatCatsIntelBadge({
  showBeta = false,
  size = "sm",
}: {
  showBeta?: boolean;
  size?: "sm" | "md";
}) {
  const logoSize = size === "md" ? 20 : 16;
  const textClass = size === "md" ? "text-[13px]" : "text-[11px]";

  return (
    <span className="inline-flex items-center gap-1.5">
      <IntelLogo size={logoSize} />
      <span className={`${textClass} font-bold text-[var(--fc-orange)] tracking-wide`}>
        FatCats Intel
      </span>
      {showBeta && <span className="beta-badge">Beta</span>}
    </span>
  );
}

// Header row: used as a section header in cards
export function IntelHeader({
  title,
  showBeta = false,
}: {
  title?: string;
  showBeta?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <IntelLogo size={20} />
        {title || "FatCats Intel"}
      </h3>
      {showBeta && <span className="beta-badge">Beta</span>}
    </div>
  );
}
