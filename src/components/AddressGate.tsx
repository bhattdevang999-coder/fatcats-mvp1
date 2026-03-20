"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceHash } from "@/lib/device";

/**
 * AddressGate — The subliminal top-of-funnel.
 *
 * Design philosophy:
 * - ONE field. Address or zip. That's the entire ask.
 * - Never says "sign up" or "download" — it's about THEIR block.
 * - Appears only after the user has consumed content (rabbit hole).
 * - Framing: "Want to know what's broken near you?" — service, not ask.
 * - Saves instantly to localStorage (zero-friction), then Supabase in background.
 * - Once captured: unlocks personalized "your block" content throughout the app.
 *
 * Conversion funnel:
 * 1. Shared link → web exposé → rabbit hole (3-5 exposés)
 * 2. AddressGate: "Drop your address. We'll tell you what's broken."
 * 3. Re-engagement: "4 new issues on your block" → email/push → app download
 */

const STORAGE_KEY = "fc_block_address";
const DISMISSED_KEY = "fc_gate_dismissed";
const EMAIL_KEY = "fc_block_email";

// ─── PERSISTENCE ──────────────────────────────────────────────────────

function getSavedAddress(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function saveAddressLocal(address: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, address);
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(DISMISSED_KEY) === "1";
}

function dismiss() {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DISMISSED_KEY, "1");
}

async function saveToSupabase(address: string, email?: string) {
  try {
    const deviceHash = await getDeviceHash();
    // Upsert — if they already submitted, update their address
    await supabase.from("block_watchers").upsert(
      {
        device_hash: deviceHash,
        address,
        email: email || null,
        source: "web_gate",
        created_at: new Date().toISOString(),
      },
      { onConflict: "device_hash" }
    );
  } catch {
    // Silent fail — localStorage is the primary store
  }
}


// ─── MAIN COMPONENT: INLINE ADDRESS CAPTURE ───────────────────────────
// Appears in the page flow after rabbit hole content.
// Non-intrusive. One field. Service framing.

export function AddressCapture({
  context,
}: {
  /** The neighborhood of the current exposé — used for personalized copy */
  context?: string | null;
}) {
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyCaptured, setAlreadyCaptured] = useState(false);
  const [showEmailStep, setShowEmailStep] = useState(false);
  const [visible, setVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Check if already captured
  useEffect(() => {
    const saved = getSavedAddress();
    if (saved) setAlreadyCaptured(true);
    if (isDismissed()) setAlreadyCaptured(true); // treat dismissed same as captured for this session
  }, []);

  // Intersection observer — fade in when scrolled into view
  useEffect(() => {
    if (!sentinelRef.current || alreadyCaptured) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [alreadyCaptured]);

  const handleSubmitAddress = () => {
    if (!address.trim()) return;
    saveAddressLocal(address.trim());
    saveToSupabase(address.trim());
    setShowEmailStep(true);
  };

  const handleSubmitEmail = () => {
    if (email.trim()) {
      if (typeof window !== "undefined") localStorage.setItem(EMAIL_KEY, email.trim());
      saveToSupabase(address.trim(), email.trim());
    }
    setSubmitted(true);
  };

  const handleSkipEmail = () => {
    setSubmitted(true);
  };

  const handleDismiss = () => {
    dismiss();
    setAlreadyCaptured(true);
  };

  // Don't render if already captured
  if (alreadyCaptured) return null;

  // Submitted — thank you state
  if (submitted) {
    return (
      <div className="py-4 animate-fade-in">
        <div className="bg-[var(--fc-orange)]/[0.06] border border-[var(--fc-orange)]/15 rounded-2xl p-5 text-center">
          <div className="text-[20px] mb-2">🐱</div>
          <p className="text-white/90 text-[14px] font-semibold">We see your block now.</p>
          <p className="text-white/40 text-[12px] mt-1">
            You&apos;ll be the first to know when something shows up near you.
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Optional email (after address)
  if (showEmailStep) {
    return (
      <div className="py-4 animate-fade-in">
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <p className="text-white/80 text-[13px] font-medium mb-1">
            Got it. Want a heads up when something pops up near you?
          </p>
          <p className="text-white/35 text-[11px] mb-3">
            Optional. We don&apos;t spam. Just your block.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional)"
              className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-[var(--fc-orange)]/40 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleSubmitEmail()}
            />
            <button
              onClick={handleSubmitEmail}
              className="bg-[var(--fc-orange)] text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl hover:bg-[var(--fc-orange)]/90 transition-colors shrink-0"
            >
              {email.trim() ? "Notify me" : "Skip"}
            </button>
          </div>
          <button
            onClick={handleSkipEmail}
            className="text-white/25 text-[11px] mt-2 hover:text-white/40 transition-colors block w-full text-center"
          >
            no thanks, just browsing
          </button>
        </div>
      </div>
    );
  }

  // Step 1: The address capture
  const headline = context
    ? `You saw what's happening near ${context}.`
    : "You've been digging.";

  return (
    <div ref={sentinelRef} className="py-4">
      <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 relative">
          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-white/15 hover:text-white/40 transition-colors text-[11px]"
          >
            ✕
          </button>

          <p className="text-white/80 text-[14px] font-semibold mb-1">
            {headline}
          </p>
          <p className="text-white/40 text-[12px] mb-3">
            Drop your address or zip. We&apos;ll show you what&apos;s broken on your block.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address, zip, or neighborhood"
              className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2.5 text-white text-[13px] placeholder:text-white/25 focus:outline-none focus:border-[var(--fc-orange)]/40 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleSubmitAddress()}
            />
            <button
              onClick={handleSubmitAddress}
              disabled={!address.trim()}
              className="bg-[var(--fc-orange)] text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl hover:bg-[var(--fc-orange)]/90 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Show me
            </button>
          </div>

          <p className="text-white/20 text-[10px] mt-2.5">
            No account needed. We just want to show you your block.
          </p>
        </div>
      </div>
    </div>
  );
}


// ─── FLOATING MICRO-CTA ──────────────────────────────────────────────
// Ultra-minimal version that appears as a floating pill near the bottom.
// For users who scroll past the inline version.

export function FloatingAddressNudge() {
  const [show, setShow] = useState(false);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    // Don't show if already captured or dismissed
    if (getSavedAddress() || isDismissed()) {
      setCaptured(true);
      return;
    }

    // Show after 20 seconds of browsing
    const timer = setTimeout(() => setShow(true), 20000);
    return () => clearTimeout(timer);
  }, []);

  if (captured || !show) return null;

  return (
    <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-30 animate-slide-up">
      <a
        href="#address-gate"
        onClick={() => {
          // Smooth scroll to the inline AddressCapture
          const el = document.getElementById("address-gate");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            setShow(false);
          }
        }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--fc-surface)]/90 backdrop-blur-xl border border-[var(--fc-orange)]/20 shadow-xl hover:border-[var(--fc-orange)]/40 transition-colors"
      >
        <span className="text-[14px]">📍</span>
        <span className="text-white/70 text-[12px] font-medium">What&apos;s broken on your block?</span>
      </a>
    </div>
  );
}
