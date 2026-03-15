"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createCitizenReport, uploadReportPhoto } from "@/lib/reports";
import { getDeviceHash, getNeighborhoodFromLatLng } from "@/lib/device";

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

type Step = "photo" | "category" | "details" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "photo", label: "Photo" },
  { key: "category", label: "Category" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
];

export default function ReportNewPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("photo");
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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setStep("category");
    }
  };

  const handleSkipPhoto = () => {
    setStep("category");
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
        router.push(`/expose/${report.id}`);
      } else {
        alert("Something went wrong. Please try again.");
        setSubmitting(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canGoNext = (() => {
    switch (step) {
      case "photo": return true; // can skip
      case "category": return !!category;
      case "details": return !!title.trim();
      case "review": return true;
      default: return false;
    }
  })();

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Progress bar */}
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex-1">
              <div className={`h-1 rounded-full transition-all duration-300 ${
                i <= stepIndex ? "bg-[var(--fc-orange)]" : "bg-white/[0.08]"
              }`} />
            </div>
          ))}
        </div>

        {/* Step label */}
        <div className="flex items-center gap-2 mb-5">
          {stepIndex > 0 && (
            <button
              onClick={() => setStep(STEPS[stepIndex - 1].key)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <span className="text-[11px] text-[var(--fc-muted)] uppercase tracking-wider font-semibold">
            Step {stepIndex + 1} of {STEPS.length} — {STEPS[stepIndex].label}
          </span>
        </div>

        {/* STEP 1: Photo */}
        {step === "photo" && (
          <div className="flex flex-col items-center animate-fade-in">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[3/4] max-h-[55vh] rounded-2xl bg-white/[0.03] border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--fc-orange)]/30 transition-colors relative overflow-hidden"
            >
              {/* Concentric circles */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border border-white/5" />
                <div className="absolute w-32 h-32 rounded-full border border-white/[0.08]" />
                <div className="absolute w-16 h-16 rounded-full border border-white/10" />
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--fc-orange)]">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <p className="text-white/60 text-sm font-medium mb-1">
                  Point at the problem
                </p>
                <p className="text-[var(--fc-muted)] text-xs">
                  Tap to take or choose a photo
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-14 mt-5 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-lg transition-colors active:scale-95"
            >
              Take Photo
            </button>

            <button
              onClick={handleSkipPhoto}
              className="mt-3 text-[13px] text-[var(--fc-muted)] hover:text-white transition-colors"
            >
              Skip photo for now
            </button>
          </div>
        )}

        {/* STEP 2: Category */}
        {step === "category" && (
          <div className="animate-fade-in space-y-5">
            {photoPreview && (
              <div className="w-full h-32 rounded-xl overflow-hidden bg-white/5">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-white mb-1">What type of issue?</h2>
              <p className="text-[13px] text-[var(--fc-muted)] mb-4">Select the category that best describes the problem.</p>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all active:scale-95 ${
                      category === cat.value
                        ? "bg-[var(--fc-orange)]/15 border-2 border-[var(--fc-orange)]/40 text-white"
                        : "bg-white/[0.04] border-2 border-transparent text-white/60 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className="text-[22px]">{cat.icon}</span>
                    <span className="text-[11px] font-medium leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep("details")}
              disabled={!category}
              className="w-full h-14 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              Next
            </button>
          </div>
        )}

        {/* STEP 3: Details */}
        {step === "details" && (
          <div className="animate-fade-in space-y-5">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Describe the issue</h2>
              <p className="text-[13px] text-[var(--fc-muted)] mb-4">A clear title helps others find and stamp your exposé.</p>
            </div>

            <div>
              <label className="block text-xs text-[var(--fc-muted)] font-medium mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`Issue near ${neighborhood}`}
                className="w-full h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs text-[var(--fc-muted)] font-medium mb-1.5">
                What&apos;s going on here? (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="The more detail, the stronger the exposé..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)] focus:border-transparent resize-none"
              />
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-xs text-[var(--fc-muted)]">
              <span className={`w-2 h-2 rounded-full ${locationStatus === "found" ? "bg-green-400" : locationStatus === "pending" ? "bg-amber-400 animate-pulse" : "bg-red-400"}`} />
              {locationStatus === "found" ? `Location: ${neighborhood}` : locationStatus === "pending" ? "Detecting location..." : "Location not shared"}
            </div>

            <button
              onClick={() => setStep("review")}
              disabled={!title.trim()}
              className="w-full h-14 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            >
              Review
            </button>
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {step === "review" && (
          <div className="animate-fade-in space-y-5">
            <h2 className="text-lg font-bold text-white mb-1">Review your exposé</h2>

            {photoPreview && (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-white/5">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="glass-card p-4 space-y-3">
              <div>
                <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Title</span>
                <p className="text-[14px] text-white font-medium">{title || `Issue near ${neighborhood}`}</p>
              </div>
              <div>
                <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Category</span>
                <p className="text-[14px] text-white font-medium">
                  {CATEGORIES.find((c) => c.value === category)?.icon} {CATEGORIES.find((c) => c.value === category)?.label || "Other"}
                </p>
              </div>
              {description && (
                <div>
                  <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Description</span>
                  <p className="text-[13px] text-white/70">{description}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Location</span>
                <p className="text-[13px] text-white/70">{neighborhood}</p>
              </div>
            </div>

            <p className="text-[11px] text-[var(--fc-muted)] text-center">
              Your exposé will be visible to everyone. You&apos;ll earn XP toward your first badge.
            </p>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-14 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {submitting ? "Posting..." : "Post Exposé"}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
