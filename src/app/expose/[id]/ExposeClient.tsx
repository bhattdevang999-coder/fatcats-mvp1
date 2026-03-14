"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { getReportById, addSupport, hasSupported, markAsFixed } from "@/lib/reports";
import { getDeviceHash } from "@/lib/device";
import type { Report } from "@/lib/types";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} days ago`;
}

function categoryIcon(cat: string): string {
  switch (cat) {
    case "pothole": return "🕳️";
    case "streetlight": return "💡";
    case "sidewalk": return "🚶";
    case "trash": return "🗑️";
    default: return "📍";
  }
}

export default function ExposeClient() {
  const params = useParams();
  const id = params.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [watching, setWatching] = useState(false);
  const [alreadyWatching, setAlreadyWatching] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getReportById(id);
      if (data) {
        setReport(data);
        const dh = getDeviceHash();
        setIsAuthor(data.author_device_hash === dh);
        const supported = await hasSupported(id, dh);
        setAlreadyWatching(supported);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  const handleWatch = async () => {
    if (alreadyWatching || !report) return;
    setWatching(true);
    const dh = getDeviceHash();
    const ok = await addSupport(report.id, dh);
    if (ok) {
      setAlreadyWatching(true);
      setReport({ ...report, supporters_count: report.supporters_count + 1 });
    }
    setWatching(false);
  };

  const handleMarkFixed = async () => {
    if (!report) return;
    const ok = await markAsFixed(report.id);
    if (ok) {
      setReport({ ...report, status: "fixed" });
      showToast("Marked as fixed.");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `This spot has an issue. I just filed an exposé with FatCats. #FatCatsNYC`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Exposé on FatCats", text, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      showToast("Link copied — share it with your neighbors and leaders.");
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[var(--fc-orange)] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!report) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <h1 className="text-2xl font-bold text-white mb-2">Not found</h1>
          <p className="text-[var(--fc-muted)]">This exposé doesn&apos;t exist.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Hero image or icon */}
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center">
          {report.photo_url ? (
            <img
              src={report.photo_url}
              alt={report.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">{categoryIcon(report.category)}</span>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <StatusPill status={report.status} source={report.source} />
          <span className="text-xs text-[var(--fc-muted)]">
            {report.source === "citizen" ? "Citizen exposé" : "City data"}
          </span>
        </div>

        {/* Title & meta */}
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{report.title}</h1>
          <div className="flex items-center gap-2 text-sm text-[var(--fc-muted)]">
            {report.neighborhood && <span>{report.neighborhood}</span>}
            <span>·</span>
            <span>Reported {timeAgo(report.created_at)}</span>
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <p className="text-sm text-white/70 leading-relaxed">
            {report.description}
          </p>
        )}

        {/* Facts */}
        <div className="space-y-2 text-sm text-[var(--fc-muted)]">
          <p>First seen: {new Date(report.created_at).toLocaleDateString()}</p>
          {report.source === "311" && <p>Status from city data.</p>}
        </div>

        {/* Watching */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
          <p className="text-sm text-white/70 mb-3">
            <strong className="text-white">{report.supporters_count}</strong>{" "}
            {report.supporters_count === 1 ? "person is" : "people are"} watching this.
          </p>
          <button
            onClick={handleWatch}
            disabled={alreadyWatching || watching}
            className={`w-full h-11 rounded-lg font-semibold text-sm transition-colors ${
              alreadyWatching
                ? "bg-white/10 text-white/50 cursor-default"
                : "bg-white/10 hover:bg-white/15 text-white active:scale-95"
            }`}
          >
            {watching
              ? "..."
              : alreadyWatching
              ? "You're watching this ✓"
              : "I'm watching this"}
          </button>
        </div>

        {/* Author actions */}
        {isAuthor && report.status !== "fixed" && (
          <button
            onClick={handleMarkFixed}
            className="text-sm text-green-400 hover:text-green-300 underline"
          >
            Mark as fixed (beta)
          </button>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          className="w-full h-14 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white font-bold text-lg transition-colors active:scale-95"
        >
          Share this exposé
        </button>

        <p className="text-xs text-[var(--fc-muted)] text-center">
          Every exposé is a receipt. Thanks for helping your city.
        </p>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/10 text-white text-sm px-6 py-3 rounded-xl animate-fade-in z-50">
            {toast}
          </div>
        )}
      </div>
    </AppShell>
  );
}
