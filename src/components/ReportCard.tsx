import Link from "next/link";
import type { Report } from "@/lib/types";
import StatusPill from "./StatusPill";

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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

export default function ReportCard({ report }: { report: Report }) {
  return (
    <Link href={`/expose/${report.id}`} className="block">
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.07] transition-colors active:scale-[0.98] transition-transform">
        <div className="flex gap-3">
          {/* Thumbnail */}
          <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center shrink-0 overflow-hidden">
            {report.photo_url ? (
              <img
                src={report.photo_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl">{categoryIcon(report.category)}</span>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate mb-1">
              {report.title}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <StatusPill status={report.status} source={report.source} />
              <span className="text-[10px] text-[var(--fc-muted)]">
                {report.source === "citizen" ? "Citizen exposé" : "City data"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[var(--fc-muted)]">
              {report.neighborhood && (
                <span className="truncate">{report.neighborhood}</span>
              )}
              <span>{report.supporters_count} watching</span>
              <span>{timeAgo(report.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
