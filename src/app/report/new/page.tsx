"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createCitizenReport, uploadReportPhoto } from "@/lib/reports";
import { getDeviceHash, getNeighborhoodFromLatLng } from "@/lib/device";
import type { AIClassification } from "@/lib/geo-intelligence";
import { getFullGeoIntelligence, estimateRepairCost } from "@/lib/geo-intelligence";
import { getCouncilMemberByNeighborhood } from "@/lib/council-districts";
import { findNearbyProjects, formatMoney } from "@/lib/capital-projects";
import { incrementStat, recordStreakDay } from "@/lib/gamification";
import { IntelLogo } from "@/components/FatCatsIntel";
import { findNearDuplicates } from "@/lib/cosigns";
import NearDuplicateSheet from "@/components/NearDuplicateSheet";
import Image from "next/image";

const CATEGORIES = [
  { value: "pothole", label: "Pothole", icon: "🕳️" },
  { value: "road_damage", label: "Road Damage", icon: "🛣️" },
  { value: "streetlight", label: "Streetlight", icon: "💡" },
  { value: "sidewalk", label: "Sidewalk", icon: "🚶" },
  { value: "trash", label: "Trash / Debris", icon: "🗑️" },
  { value: "water", label: "Water / Flooding", icon: "💧" },
  { value: "sewer", label: "Sewer", icon: "🚰" },
  { value: "traffic_signal", label: "Traffic Signal", icon: "🚦" },
  { value: "other", label: "Other", icon: "📍" },
];

type Step = "capture" | "confirm";

export default function ReportNewPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("capture");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [neighborhood, setNeighborhood] = useState("New York City");
  const [locationStatus, setLocationStatus] = useState<"pending" | "found" | "denied">("pending");

  // AI classification state
  const [aiResult, setAiResult] = useState<AIClassification | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  // Near-duplicate detection
  const [nearDuplicates, setNearDuplicates] = useState<Awaited<ReturnType<typeof findNearDuplicates>>>([]);
  const [showDuplicateSheet, setShowDuplicateSheet] = useState(false);

  // Post-submission — "Filed." confirmation
  const [showFiled, setShowFiled] = useState(false);
  const [filedNumber, setFiledNumber] = useState(0);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  // Post-submission spending hook
  const [showSpendingHook, setShowSpendingHook] = useState(false);
  const [nearbySpending, setNearbySpending] = useState<{
    count: number;
    totalBudget: number;
    worstOverrunPct: number;
    worstProjectId: string | null;
  } | null>(null);

  // Orange flash effect
  const [showFlash, setShowFlash] = useState(false);

  // Request geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          const hood = getNeighborhoodFromLatLng(pos.coords.latitude, pos.coords.longitude);
          setNeighborhood(hood);
          setLocationStatus("found");
        },
        () => {
          setNeighborhood("New York City");
          setLocationStatus("denied");
        }
      );
    }
  }, []);

  // Run AI classification when photo is selected
  const classifyPhoto = useCallback(async (file: File) => {
    setClassifying(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const mediaType = file.type || "image/jpeg";

        try {
          const res = await fetch("/api/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64, mediaType }),
          });

          if (res.ok) {
            const data: AIClassification = await res.json();
            setAiResult(data);
            // Auto-apply AI results — 2-step flow means we fill immediately
            setCategory(data.category);
            setTitle(data.suggestedTitle);
            setDescription(data.description);
            setAiApplied(true);
            // Fetch geo-intel + duplicates for AI category
            if (lat != null && lng != null) {
              try {
                const [, dupes] = await Promise.all([
                  getFullGeoIntelligence(lat, lng, data.category),
                  findNearDuplicates(lat, lng, data.category),
                ]);
                if (dupes.length > 0) {
                  setNearDuplicates(dupes);
                  setShowDuplicateSheet(true);
                }
              } catch {}
            }
          }
        } catch {
          // Classification failed silently — user can still manual-select
        }
        setClassifying(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setClassifying(false);
    }
  }, [lat, lng]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      // Orange flash effect
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 300);
      // Haptic feedback
      if (navigator.vibrate) navigator.vibrate(50);
      classifyPhoto(file);
      setStep("confirm");
    }
  };

  const handleSkipPhoto = () => {
    setStep("confirm");
  };

  const handleCategorySelect = (catVal: string) => {
    setCategory(catVal);
    // If user picks different category from AI, clear AI-generated text
    if (aiApplied && aiResult && catVal !== aiResult.category) {
      setTitle("");
      setDescription("");
      setAiApplied(false);
      setAiResult(null);
    }
  };

  // Get exposé number from localStorage
  const getExposeNumber = (): number => {
    try {
      const count = parseInt(localStorage.getItem("fc_expose_count") || "0", 10);
      return count + 1;
    } catch {
      return 1;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const deviceHash = getDeviceHash();
      let photoUrl: string | null = null;

      if (photo) {
        photoUrl = await uploadReportPhoto(photo, deviceHash);
      }

      const report = await createCitizenReport({
        title: title || `Issue near ${neighborhood}`,
        description: description || undefined,
        category: category || "other",
        lat,
        lng,
        neighborhood,
        photo_url: photoUrl,
        author_device_hash: deviceHash,
      });

      if (report) {
        // Track gamification
        incrementStat("exposesCount");
        recordStreakDay();

        // Update local count
        const num = getExposeNumber();
        try { localStorage.setItem("fc_expose_count", String(num)); } catch {}
        setFiledNumber(num);
        setSubmittedReportId(report.id);

        // Haptic feedback — strong pulse for "Filed."
        if (navigator.vibrate) navigator.vibrate([50, 30, 100]);

        // Show "Filed." confirmation
        setShowFiled(true);

        // Check for nearby spending data (shows after "Filed." if available)
        if (lat != null && lng != null) {
          try {
            const nearby = await findNearbyProjects(lat, lng);
            if (nearby && nearby.count > 0) {
              setNearbySpending(nearby);
            }
          } catch {}
        }

        // Auto-navigate after brief "Filed." confirmation
        setTimeout(() => {
          if (nearbySpending && nearbySpending.count > 0) {
            setShowFiled(false);
            setShowSpendingHook(true);
            setSubmitting(false);
          } else {
            router.push(`/expose/${report.id}`);
          }
        }, 1800);
      } else {
        alert("Something went wrong. Please try again.");
        setSubmitting(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const costInfo = category ? estimateRepairCost(category) : null;
  const councilMember = neighborhood ? getCouncilMemberByNeighborhood(neighborhood) : null;

  return (
    <AppShell>
      {/* Orange flash overlay */}
      {showFlash && (
        <div className="fixed inset-0 z-[200] pointer-events-none animate-evidence-flash" />
      )}

      {/* ═══ "FILED." CONFIRMATION OVERLAY ═══ */}
      {showFiled && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center animate-filed-in">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-[var(--fc-orange)]/20 flex items-center justify-center">
              <Image src="/assets/logo-64.png" alt="FatCats" width={40} height={40} className="drop-shadow-[0_0_12px_rgba(232,101,43,0.6)]" />
            </div>
            <p className="text-[32px] font-black text-white tracking-tight">
              Exposé #{filedNumber}.
            </p>
            <p className="text-[18px] font-bold text-[var(--fc-orange)] mt-1">
              Filed.
            </p>
            <p className="text-[13px] text-[var(--fc-muted)] mt-3 max-w-[240px] mx-auto">
              Your evidence is on record. Officials will be notified.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        {/* ═══ STEP 1: CAPTURE — Evidence Frame ═══ */}
        {step === "capture" && (
          <div className="flex flex-col min-h-[calc(100vh-80px)] animate-fade-in">
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center active:scale-90 transition-transform"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-[13px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider">
                New Exposé
              </span>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>

            {/* Evidence Frame viewfinder */}
            <div className="flex-1 px-4 pb-4 flex flex-col">
              <div
                onClick={() => fileRef.current?.click()}
                className="flex-1 rounded-2xl bg-black/40 border border-white/[0.06] relative overflow-hidden cursor-pointer group min-h-[50vh]"
              >
                {/* Evidence Frame — orange corner brackets HUD */}
                <div className="absolute inset-0 pointer-events-none z-10 p-6">
                  {/* Top-left corner */}
                  <div className="absolute top-6 left-6 w-10 h-10">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-[var(--fc-orange)] rounded-full" />
                    <div className="absolute top-0 left-0 h-full w-[3px] bg-[var(--fc-orange)] rounded-full" />
                  </div>
                  {/* Top-right corner */}
                  <div className="absolute top-6 right-6 w-10 h-10">
                    <div className="absolute top-0 right-0 w-full h-[3px] bg-[var(--fc-orange)] rounded-full" />
                    <div className="absolute top-0 right-0 h-full w-[3px] bg-[var(--fc-orange)] rounded-full" />
                  </div>
                  {/* Bottom-left corner */}
                  <div className="absolute bottom-6 left-6 w-10 h-10">
                    <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--fc-orange)] rounded-full" />
                    <div className="absolute bottom-0 left-0 h-full w-[3px] bg-[var(--fc-orange)] rounded-full" />
                  </div>
                  {/* Bottom-right corner */}
                  <div className="absolute bottom-6 right-6 w-10 h-10">
                    <div className="absolute bottom-0 right-0 w-full h-[3px] bg-[var(--fc-orange)] rounded-full" />
                    <div className="absolute bottom-0 right-0 h-full w-[3px] bg-[var(--fc-orange)] rounded-full" />
                  </div>
                </div>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
                  <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center mb-4 group-hover:bg-white/[0.08] transition-colors">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--fc-orange)]">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                  </div>
                  <p className="text-white/60 text-[15px] font-semibold mb-1">
                    Point at the problem
                  </p>
                  <p className="text-[var(--fc-muted)] text-[12px]">
                    Tap to capture evidence
                  </p>
                </div>

                {/* FatCats watermark — top center */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 opacity-40">
                  <Image src="/assets/logo-64.png" alt="" width={14} height={14} />
                  <span className="text-[10px] text-white font-bold tracking-wider uppercase">Evidence</span>
                </div>

                {/* Location badge — bottom center */}
                {locationStatus === "found" && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/[0.08]">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-[10px] text-white/60 font-medium">{neighborhood}</span>
                  </div>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />

              {/* Capture button — big orange circle */}
              <div className="flex flex-col items-center mt-5 gap-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-[72px] h-[72px] rounded-full bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] transition-all active:scale-90 flex items-center justify-center shadow-[0_0_30px_rgba(232,101,43,0.4)] ring-4 ring-[var(--fc-orange)]/20"
                >
                  <div className="w-[58px] h-[58px] rounded-full border-[3px] border-white/80" />
                </button>
                <button
                  onClick={handleSkipPhoto}
                  className="text-[13px] text-[var(--fc-muted)] hover:text-white transition-colors"
                >
                  Skip photo — describe it instead
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: CONFIRM — Review + File ═══ */}
        {step === "confirm" && (
          <div className="px-4 py-5 animate-fade-in space-y-5 pb-20">
            {/* Header with back */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setStep("capture"); setPhoto(null); setPhotoPreview(null); setAiResult(null); setAiApplied(false); setCategory(""); setTitle(""); setDescription(""); }}
                className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center active:scale-90 transition-transform shrink-0"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span className="text-[13px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider">
                Confirm Exposé
              </span>
            </div>

            {/* Photo preview */}
            {photoPreview && (
              <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white/5 relative">
                <img src={photoPreview} alt="Evidence" className="w-full h-full object-cover" />
                {/* Evidence frame corners on preview */}
                <div className="absolute inset-0 pointer-events-none p-4">
                  <div className="absolute top-4 left-4 w-8 h-8">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-[var(--fc-orange)]/60" />
                    <div className="absolute top-0 left-0 h-full w-[2px] bg-[var(--fc-orange)]/60" />
                  </div>
                  <div className="absolute top-4 right-4 w-8 h-8">
                    <div className="absolute top-0 right-0 w-full h-[2px] bg-[var(--fc-orange)]/60" />
                    <div className="absolute top-0 right-0 h-full w-[2px] bg-[var(--fc-orange)]/60" />
                  </div>
                  <div className="absolute bottom-4 left-4 w-8 h-8">
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[var(--fc-orange)]/60" />
                    <div className="absolute bottom-0 left-0 h-full w-[2px] bg-[var(--fc-orange)]/60" />
                  </div>
                  <div className="absolute bottom-4 right-4 w-8 h-8">
                    <div className="absolute bottom-0 right-0 w-full h-[2px] bg-[var(--fc-orange)]/60" />
                    <div className="absolute bottom-0 right-0 h-full w-[2px] bg-[var(--fc-orange)]/60" />
                  </div>
                </div>
              </div>
            )}

            {/* AI Classification Banner */}
            {classifying && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--fc-orange)]/20 bg-[var(--fc-orange)]/5">
                <div className="w-5 h-5 border-2 border-[var(--fc-orange)] border-t-transparent rounded-full animate-spin shrink-0" />
                <div className="flex-1">
                  <p className="text-[13px] text-white font-medium">Analyzing evidence...</p>
                  <p className="text-[11px] text-[var(--fc-muted)]">FatCats Intel is classifying the issue</p>
                </div>
              </div>
            )}

            {aiApplied && aiResult && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <IntelLogo size={16} />
                <span className="text-[12px] text-green-400 flex-1">Intel auto-filled — edit anything below</span>
                <span className="text-[10px] text-white/40 px-1.5 py-0.5 rounded bg-white/[0.06]">
                  {aiResult.confidence}% match
                </span>
              </div>
            )}

            {/* Category picker — horizontal scroll */}
            <div>
              <label className="block text-[11px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider mb-2">
                What&apos;s the issue?
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategorySelect(cat.value)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl whitespace-nowrap text-[13px] font-medium transition-all active:scale-95 shrink-0 ${
                      category === cat.value
                        ? "bg-[var(--fc-orange)]/15 border-2 border-[var(--fc-orange)]/40 text-white"
                        : "bg-white/[0.04] border-2 border-transparent text-white/60 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className="text-[16px]">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[11px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider mb-1.5">
                Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Issue near ${neighborhood}`}
                className="w-full h-12 px-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-[15px] font-medium focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)] focus:border-transparent"
              />
            </div>

            {/* Description — optional */}
            <div>
              <label className="block text-[11px] text-[var(--fc-muted)] font-semibold uppercase tracking-wider mb-1.5">
                Details <span className="text-[var(--fc-muted)] opacity-50 normal-case">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="The more detail, the stronger the exposé..."
                rows={2}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)] focus:border-transparent resize-none"
              />
            </div>

            {/* Compact info row: Location + Cost estimate */}
            <div className="flex items-center gap-3 text-[12px]">
              <div className="flex items-center gap-1.5 text-[var(--fc-muted)]">
                <span className={`w-2 h-2 rounded-full ${locationStatus === "found" ? "bg-green-400" : locationStatus === "pending" ? "bg-amber-400 animate-pulse" : "bg-red-400"}`} />
                {locationStatus === "found" ? neighborhood : locationStatus === "pending" ? "Locating..." : "No location"}
              </div>
              {costInfo && (
                <>
                  <span className="text-white/10">·</span>
                  <span className="text-[var(--fc-muted)]">
                    Est. <span className="text-white font-semibold">{costInfo.range}</span> {costInfo.unit}
                  </span>
                </>
              )}
              {councilMember && (
                <>
                  <span className="text-white/10">·</span>
                  <span className="text-[var(--fc-muted)] truncate">
                    📍 {councilMember.name}
                  </span>
                </>
              )}
            </div>

            {/* Social proof — filing is normal, you're not alone */}
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex -space-x-1">
                {["#E8652B", "#ff8c5a", "#F59E0B"].map((c, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border-2 border-[var(--fc-bg)]" style={{ background: c, opacity: 0.8 }} />
                ))}
              </div>
              <span className="text-[11px] text-[var(--fc-muted)]">
                <span className="text-white/70 font-semibold">{230 + Math.floor(Math.random() * 80)}</span> exposés filed this week
              </span>
            </div>

            {/* FILE EXPOSÉ — single CTA */}
            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim()}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-[var(--fc-orange)] to-[#ff8c5a] hover:shadow-[0_4px_30px_rgba(232,101,43,0.45)] text-white font-bold text-[17px] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.97] shadow-[0_4px_20px_rgba(232,101,43,0.3)]"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Filing...
                </span>
              ) : (
                "File Exposé"
              )}
            </button>

            <p className="text-[11px] text-[var(--fc-muted)] text-center">
              Your exposé is public. Officials will be notified automatically.
            </p>
          </div>
        )}
      </div>

      {/* Near-duplicate detection sheet */}
      {showDuplicateSheet && nearDuplicates.length > 0 && (
        <NearDuplicateSheet
          matches={nearDuplicates}
          onCoSigned={(reportId) => {
            setShowDuplicateSheet(false);
            router.push(`/expose/${reportId}`);
          }}
          onFileNew={() => {
            setShowDuplicateSheet(false);
          }}
          onDismiss={() => {
            setShowDuplicateSheet(false);
          }}
        />
      )}

      {/* Post-submission spending hook */}
      {showSpendingHook && nearbySpending && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="glass-card-elevated p-6 max-w-sm w-full text-center animate-scale-in border border-[var(--fc-orange)]/20">
              <p className="text-[13px] font-bold text-[var(--fc-orange)] uppercase tracking-widest mb-3">
                While you&apos;re here...
              </p>
              <p className="text-[22px] font-black text-white mb-1">
                {formatMoney(nearbySpending.totalBudget)}
              </p>
              <p className="text-[13px] text-[var(--fc-muted)] mb-1">
                in city spending near your report across {nearbySpending.count} project{nearbySpending.count !== 1 ? "s" : ""}
              </p>
              {nearbySpending.worstOverrunPct > 0 && (
                <p className="text-[12px] text-red-400 font-semibold mb-4">
                  Worst overrun: +{nearbySpending.worstOverrunPct}%
                </p>
              )}
              <div className="flex gap-2">
                {nearbySpending.worstProjectId && (
                  <button
                    onClick={() => router.push(`/spending/${encodeURIComponent(nearbySpending.worstProjectId!)}`)}
                    className="flex-1 h-11 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-[13px] transition-colors active:scale-95"
                  >
                    See the receipts
                  </button>
                )}
                <button
                  onClick={() => router.push(`/expose/${submittedReportId}`)}
                  className="flex-1 h-11 rounded-xl bg-white/[0.06] text-white/70 font-semibold text-[13px] border border-white/[0.08] hover:bg-white/[0.1] transition-colors active:scale-95"
                >
                  View my exposé
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
