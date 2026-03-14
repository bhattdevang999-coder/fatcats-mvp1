"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { listReportsByDevice } from "@/lib/reports";
import { getDeviceHash } from "@/lib/device";
import type { Report } from "@/lib/types";

export default function ProfilePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const dh = getDeviceHash();
      const data = await listReportsByDevice(dh);
      setReports(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AppShell>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Profile card */}
        <div className="glass-card p-6 text-center mb-6 animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-[var(--fc-orange)]/10 flex items-center justify-center mx-auto mb-4">
            <Image
              src="/assets/logo-128.png"
              alt="FatCats"
              width={40}
              height={40}
            />
          </div>
          <h1 className="text-lg font-bold text-white mb-1">
            Founding Watchdog
          </h1>
          <p className="text-[13px] text-[var(--fc-muted)] mb-4">
            You&apos;ve filed {reports.length} exposé{reports.length !== 1 ? "s" : ""}
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20">
            <span className="w-2 h-2 rounded-full bg-[var(--fc-orange)] animate-pulse" />
            <span className="text-[11px] text-[var(--fc-orange)] font-medium">
              Early supporter
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card p-3 text-center">
            <span className="text-lg font-bold text-white block">{reports.length}</span>
            <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Exposés</span>
          </div>
          <div className="glass-card p-3 text-center">
            <span className="text-lg font-bold text-white block">
              {reports.reduce((sum, r) => sum + r.supporters_count, 0)}
            </span>
            <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Watchers</span>
          </div>
          <div className="glass-card p-3 text-center">
            <span className="text-lg font-bold text-white block">
              {reports.filter((r) => r.status === "fixed").length}
            </span>
            <span className="text-[10px] text-[var(--fc-muted)] uppercase tracking-wider">Fixed</span>
          </div>
        </div>

        {/* Your exposés */}
        <h2 className="text-[13px] font-semibold text-white/60 uppercase tracking-wider mb-3">
          Your exposés
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-card p-4 h-16 skeleton-shimmer rounded-2xl" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B95A8" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <p className="text-[var(--fc-muted)] text-sm mb-4">
              You haven&apos;t filed any exposés yet
            </p>
            <Link
              href="/report/new"
              className="inline-flex h-10 items-center px-5 rounded-xl bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white text-[13px] font-semibold transition-all active:scale-95"
            >
              File your first
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link key={r.id} href={`/expose/${r.id}`} className="block">
                <div className="glass-card p-4 active:scale-[0.98] transition-transform">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-semibold text-white truncate">
                        {r.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-[var(--fc-muted)]">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-[var(--fc-muted)]">
                          · {r.supporters_count} watching
                        </span>
                      </div>
                    </div>
                    <StatusPill status={r.status} source={r.source} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-[11px] text-[var(--fc-muted)] text-center mt-8">
          We&apos;re just getting started. You&apos;re early.
        </p>
      </div>
    </AppShell>
  );
}
