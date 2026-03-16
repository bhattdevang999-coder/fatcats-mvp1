import { ImageResponse } from "next/og";

export const runtime = "edge";

const NYC_API = "https://data.cityofnewyork.us/resource/fb86-vt7u.json";

function phaseEmoji(phase: string): string {
  switch (phase) {
    case "Construction":              return "🚧";
    case "Design":                    return "📐";
    case "(Completed)":               return "✅";
    case "Close-out":                 return "✅";
    case "Construction Procurement":  return "📋";
    case "(On-Hold)":                 return "⏸";
    case "(Inactive)":                return "⏸";
    default:                          return "🏗️";
  }
}

function phaseLabel(phase: string): string {
  return phase.replace(/^\(|\)$/g, "");
}

function formatMoney(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1000)}K`;
  return `$${Math.round(n)}`;
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const fmsId = decodeURIComponent(params.id);

  // Fetch latest snapshot for this project from NYC Open Data
  const url = `${NYC_API}?$where=fms_id='${fmsId}' AND reporting_period='202509'&$limit=1`;
  let projectName = "Capital Project";
  let borough = "New York City";
  let budget = 0;
  let phase = "Unknown";
  let emoji = "🏗️";

  try {
    const res = await fetch(url);
    if (res.ok) {
      const rows = await res.json();
      if (rows.length > 0) {
        const row = rows[0];
        projectName = row.agency_project_name || row.fms_project_name || projectName;
        borough = row.borough || borough;
        budget = parseFloat(row.total_budget || "0");
        phase = row.current_phase || phase;
        emoji = phaseEmoji(phase);
      }
    }
  } catch {
    // Use defaults
  }

  const budgetStr = formatMoney(budget);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1B2A4A 0%, #0F172A 100%)",
          padding: "72px 80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top label */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              background: "#E8652B",
              color: "#fff",
              fontSize: 18,
              fontWeight: 700,
              padding: "6px 18px",
              borderRadius: 99,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            FATCATS
          </div>
          <div style={{ color: "#8B95A8", fontSize: 18 }}>
            Contract Tracker
          </div>
        </div>

        {/* Emoji */}
        <div style={{ fontSize: 80, marginBottom: 28, display: "flex" }}>
          {emoji}
        </div>

        {/* Title */}
        <div
          style={{
            color: "#E8E6E1",
            fontSize: projectName.length > 60 ? 40 : 52,
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: 960,
            marginBottom: 24,
            display: "flex",
          }}
        >
          {projectName}
        </div>

        {/* Phase + Budget */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              color: "#E8652B",
              fontSize: 28,
              fontWeight: 700,
              display: "flex",
            }}
          >
            {phaseLabel(phase)}
          </div>
          <div
            style={{
              color: "#8B95A8",
              fontSize: 22,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            💰 {budgetStr} budget
          </div>
        </div>

        {/* Borough */}
        <div
          style={{
            color: "#8B95A8",
            fontSize: 24,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>📍</span>
          <span>{borough}</span>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: "linear-gradient(90deg, #E8652B 0%, #ff8c5a 100%)",
            display: "flex",
          }}
        />

        {/* Watermark — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 30,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,0.25)",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            fatcatsapp.com
          </div>
        </div>

        {/* Diagonal watermark overlay */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-30deg)",
            color: "rgba(232, 101, 43, 0.06)",
            fontSize: 120,
            fontWeight: 900,
            letterSpacing: 20,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            display: "flex",
          }}
        >
          FATCATS
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
