import { ImageResponse } from "next/og";

export const runtime = "edge";

const CATEGORY_COSTS: Record<string, { range: string; avg: number }> = {
  pothole: { range: "$800–$5,000", avg: 2800 },
  streetlight: { range: "$2,000–$8,000", avg: 5000 },
  street_light: { range: "$2,000–$8,000", avg: 5000 },
  sidewalk: { range: "$1,500–$6,000", avg: 3500 },
  road_damage: { range: "$3,000–$15,000", avg: 8000 },
  traffic_signal: { range: "$5,000–$25,000", avg: 15000 },
  water: { range: "$5,000–$50,000", avg: 20000 },
  sewer: { range: "$10,000–$80,000", avg: 35000 },
  trash: { range: "$200–$1,000", avg: 500 },
  other: { range: "$500–$5,000", avg: 2000 },
};

function getEstCost(cat: string): string {
  const cost = CATEGORY_COSTS[cat] || CATEGORY_COSTS.other;
  const avg = cost.avg;
  if (avg >= 1_000_000) return `$${(avg / 1_000_000).toFixed(1)}M`;
  if (avg >= 1_000) return `$${Math.round(avg / 1_000)}K`;
  return `$${avg}`;
}

function sColor(status: string): string {
  switch (status) {
    case "fixed": case "verified": return "#22C55E";
    case "in_progress": case "assigned": return "#F59E0B";
    default: return "#EF4444";
  }
}

function sText(status: string): string {
  switch (status) {
    case "fixed": return "FIXED";
    case "verified": return "VERIFIED";
    case "in_progress": case "assigned": return "IN PROGRESS";
    default: return "OPEN";
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  let title = "NYC Infrastructure Issue";
  let status = "open";
  let category = "other";
  let neighborhood = "New York City";
  let affected = 0;
  let daysOpen = 0;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const apiUrl = `${supabaseUrl}/rest/v1/reports?id=eq.${params.id}&select=title,status,category,neighborhood,supporters_count,created_at&limit=1`;
      const res = await fetch(apiUrl, {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      });
      if (res.ok) {
        const rows = await res.json();
        if (rows && rows.length > 0) {
          const r = rows[0];
          title = r.title || title;
          status = r.status || status;
          category = r.category || category;
          neighborhood = r.neighborhood || neighborhood;
          affected = r.supporters_count || 0;
          if (r.created_at) {
            daysOpen = Math.max(1, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000));
          }
        }
      }
    } catch {
      // Supabase fetch failed — use defaults
    }
  }

  const estCost = getEstCost(category);
  const statusColor = sColor(status);
  const statusLabel = sText(status);
  const displayTitle = title.length > 70 ? title.slice(0, 67) + "..." : title;

  // Build subline text
  const isOpen = status !== "fixed" && status !== "verified";
  let subline = "Resolved.";
  if (isOpen) {
    if (daysOpen > 14) subline = `${daysOpen} days. No one has moved.`;
    else if (daysOpen > 1) subline = `Filed ${daysOpen} days ago. Still waiting.`;
    else subline = "Just filed. Clock starts now.";
  }

  // Build stats text (avoid conditional JSX rendering which breaks Satori)
  const daysText = daysOpen > 0 ? `${daysOpen} days` : "";
  const affectedText = affected > 0 ? `${affected} people` : "";
  const daysColor = daysOpen > 30 ? "#EF4444" : "#F1F0EB";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(145deg, #1B2A4A 0%, #0F172A 50%, #0D1117 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div style={{ width: "100%", height: 4, background: "linear-gradient(90deg, #E8652B, #ff8c5a, #E8652B)", display: "flex" }} />

        {/* Content container */}
        <div style={{ display: "flex", flexDirection: "column", padding: "48px 64px", flex: 1, justifyContent: "space-between" }}>

          {/* Header: Logo + Status badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "linear-gradient(135deg, #E8652B, #ff8c5a)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, fontWeight: 900, color: "white",
                }}
              >
                FC
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ color: "#E8652B", fontSize: 24, fontWeight: 800, letterSpacing: 1, display: "flex" }}>
                  FatCats
                </div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, letterSpacing: 3, display: "flex" }}>
                  POINT. EXPOSE. FIX.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 99, border: `2px solid ${statusColor}`, background: `${statusColor}15` }}>
              <div style={{ width: 10, height: 10, borderRadius: 99, background: statusColor, display: "flex" }} />
              <span style={{ color: statusColor, fontSize: 16, fontWeight: 700, letterSpacing: 2, display: "flex" }}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Main content area */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 16 }}>
            {/* Title */}
            <div style={{ color: "#F1F0EB", fontSize: displayTitle.length > 50 ? 36 : 44, fontWeight: 800, lineHeight: 1.15, maxWidth: 900, display: "flex" }}>
              {displayTitle}
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              {/* Cost badge - always shown */}
              <div style={{ display: "flex", flexDirection: "column", padding: "14px 28px", borderRadius: 16, background: "rgba(232,101,43,0.12)", border: "2px solid rgba(232,101,43,0.3)" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2, display: "flex" }}>
                  EST. COST TO FIX
                </span>
                <span style={{ color: "#E8652B", fontSize: 36, fontWeight: 900, display: "flex" }}>
                  ~{estCost}
                </span>
              </div>

              {/* Days open - shown when available */}
              <div style={{ display: daysText ? "flex" : "none", flexDirection: "column" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2, display: "flex" }}>OPEN</span>
                <span style={{ color: daysColor, fontSize: 30, fontWeight: 800, display: "flex" }}>{daysText}</span>
              </div>

              {/* Affected count - shown when available */}
              <div style={{ display: affectedText ? "flex" : "none", flexDirection: "column" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, letterSpacing: 2, display: "flex" }}>AFFECTED</span>
                <span style={{ color: "#F1F0EB", fontSize: 30, fontWeight: 800, display: "flex" }}>{affectedText}</span>
              </div>
            </div>

            {/* Subline */}
            <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 18, fontWeight: 500, display: "flex", marginTop: 4 }}>
              {subline}
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: 500, display: "flex" }}>{neighborhood}</span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14, fontWeight: 700, letterSpacing: 3, display: "flex" }}>FATCATSAPP.COM</span>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div style={{ width: "100%", height: 4, background: "linear-gradient(90deg, #E8652B, #ff8c5a, #E8652B)", display: "flex" }} />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    }
  );
}
