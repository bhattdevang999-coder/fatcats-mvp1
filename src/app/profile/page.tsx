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
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Profile card */}
        <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-6 text-center mb-8">
          <Image
            src="/assets/logo-128.png"
            alt="FatCats"
            width={64}
            height={64}
            className="mx-auto mb-4"
          />
          <h1 className="text-xl font-bold text-white mb-1">
            Founding Watchdog
          </h1>
          <p className="text-sm text-[var(--fc-muted)] mb-4">
            You&apos;ve filed {reports.length} exposé{reports.length !== 1 ? "s" : ""}.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--fc-orange)]/10 border border-[var(--fc-orange)]/20">
            <span className="w-2 h-2 rounded-full bg-[var(--fc-orange)]" />
            <span className="text-xs text-[var(--fc-orange)] font-medium">
              Early supporter
            </span>
          </div>
        </div>

        {/* Your exposés */}
        <h2 className="text-sm font-semibold text-[var(--fc-orange)] uppercase tracking-wider mb-4">
          Your exposés
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-[var(--fc-orange)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center">
            <p className="text-[var(--fc-muted)] text-sm mb-4">
              You haven&apos;t filed any exposés yet.
            </p>
            <Link
              href="/report/new"
              className="inline-flex h-10 items-center px-5 rounded-lg bg-[var(--fc-orange)] hover:bg-[var(--fc-orange-hover)] text-white text-sm font-semibold transition-colors"
            >
              File your first
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <Link key={r.id} href={`/expose/${r.id}`} className="block">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.07] transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {r.title}
                      </h3>
                      <p className="text-xs text-[var(--fc-muted)] mt-1">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusPill status={r.status} source={r.source} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer text */}
        <p className="text-xs text-[var(--fc-muted)] text-center mt-8">
          We&apos;re just getting started. You&apos;re early.
        </p>
      </div>
    </AppShell>
  );
}
