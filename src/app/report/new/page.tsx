"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createCitizenReport, uploadReportPhoto } from "@/lib/reports";
import { getDeviceHash, getNeighborhoodFromLatLng } from "@/lib/device";

const CATEGORIES = [
  { value: "pothole", label: "Pothole", icon: "🕳️" },
  { value: "streetlight", label: "Streetlight", icon: "💡" },
  { value: "sidewalk", label: "Sidewalk", icon: "🚶" },
  { value: "trash", label: "Trash", icon: "🗑️" },
  { value: "other", label: "Other", icon: "📍" },
];

export default function ReportNewPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"camera" | "form">("camera");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [neighborhood, setNeighborhood] = useState("New York City");

  // Request geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          const hood = getNeighborhoodFromLatLng(
            pos.coords.latitude,
            pos.coords.longitude
          );
          setNeighborhood(hood);
          setTitle(`Something broken near ${hood}`);
        },
        () => {
          setNeighborhood("New York City (location not shared)");
          setTitle("Something broken in NYC");
        }
      );
    }
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
      setStep("form");
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
        title: title || "Untitled exposé",
        description: description || undefined,
        category,
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

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">
        {step === "camera" && (
          <div className="flex flex-col items-center">
            {/* Camera area */}
            <div
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[3/4] max-h-[60vh] rounded-2xl bg-white/[0.03] border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-[var(--fc-orange)]/30 transition-colors relative overflow-hidden"
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
                  Point at the problem.
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

            {/* POINT button */}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full h-14 mt-6 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-lg transition-colors active:scale-95"
            >
              POINT
            </button>
          </div>
        )}

        {step === "form" && (
          <div className="animate-fade-in-up space-y-5">
            {/* Photo preview */}
            {photoPreview && (
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-white/5">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs text-[var(--fc-muted)] font-medium mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)] focus:border-transparent"
              />
            </div>

            {/* Category chips */}
            <div>
              <label className="block text-xs text-[var(--fc-muted)] font-medium mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      category === cat.value
                        ? "bg-[var(--fc-orange)] text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-[var(--fc-muted)] font-medium mb-1.5">
                What&apos;s going on here?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--fc-orange)] focus:border-transparent resize-none"
              />
            </div>

            {/* Location indicator */}
            <div className="flex items-center gap-2 text-xs text-[var(--fc-muted)]">
              <span className={`w-2 h-2 rounded-full ${lat ? "bg-green-400" : "bg-amber-400"}`} />
              {lat ? `Location: ${neighborhood}` : neighborhood}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-14 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {submitting ? "Posting..." : "Post exposé"}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
