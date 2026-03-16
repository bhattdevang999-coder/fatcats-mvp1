import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

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

function getCostRange(cat: string): string {
  return (CATEGORY_COSTS[cat] || CATEGORY_COSTS.other).range;
}

function statusColor(status: string): string {
  switch (status) {
    case "fixed":
    case "verified":
      return "#22C55E";
    case "in_progress":
    case "assigned":
      return "#F59E0B";
    default:
      return "#EF4444";
  }
}

function statusText(status: string): string {
  switch (status) {
    case "fixed":
      return "FIXED";
    case "verified":
      return "VERIFIED";
    case "in_progress":
    case "assigned":
      return "IN PROGRESS";
    default:
      return "OPEN";
  }
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: report } = await supabase
    .from("reports")
    .select("title,status,category,neighborhood,supporters_count,created_at,lat,lng")
    .eq("id", params.id)
    .single();

  const title = report?.title ?? "NYC Infrastructure Issue";
  const status = report?.status ?? "open";
  const category = report?.category ?? "other";
  const neighborhood = report?.neighborhood ?? "New York City";
  const affected = report?.supporters_count ?? 0;
  const costRange = getCostRange(category);
  const daysOpen = report?.created_at
    ? Math.max(1, Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000))
    : 0;

  // Truncate title for display
  const displayTitle = title.length > 70 ? title.slice(0, 67) + "..." : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(145deg, #1B2A4A 0%, #0F172A 50%, #0D1117 100%)",
          padding: "0",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)",
            backgroundSize: "40px 40px",
            display: "flex",
          }}
        />

        {/* Top bar - orange accent line */}
        <div
          style={{
            width: "100%",
            height: 4,
            background: "linear-gradient(90deg, #E8652B 0%, #ff8c5a 50%, #E8652B 100%)",
            display: "flex",
          }}
        />

        {/* Content area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "48px 64px",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          {/* Header row: FatCats branding + status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Cat icon (simple geometric) */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "#E8652B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                  color: "white",
                }}
              >
                FC
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    color: "#E8652B",
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: 1,
                    display: "flex",
                  }}
                >
                  FatCats
                </div>
                <div
                  style={{
                    color: "rgba(255,255,255,0.35)",
                    fontSize: 13,
                    display: "flex",
                  }}
                >
                  Point. Expose. Fix.
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 20px",
                borderRadius: 99,
                border: `2px solid ${statusColor(status)}`,
                background: `${statusColor(status)}15`,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: statusColor(status),
                  display: "flex",
                }}
              />
              <span
                style={{
                  color: statusColor(status),
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: 2,
                  display: "flex",
                }}
              >
                {statusText(status)}
              </span>
            </div>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 20 }}>
            {/* Title */}
            <div
              style={{
                color: "#F1F0EB",
                fontSize: displayTitle.length > 50 ? 38 : 46,
                fontWeight: 800,
                lineHeight: 1.15,
                maxWidth: 900,
                display: "flex",
              }}
            >
              {displayTitle}
            </div>

            {/* Stats row */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              {/* Cost estimate - THE LEAD STAT */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 24px",
                  borderRadius: 16,
                  background: "rgba(232, 101, 43, 0.12)",
                  border: "1px solid rgba(232, 101, 43, 0.25)",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: 1,
                    textTransform: "uppercase",
                    display: "flex",
                  }}
                >
                  Est. Cost
                </span>
                <span
                  style={{
                    color: "#E8652B",
                    fontSize: 30,
                    fontWeight: 800,
                    display: "flex",
                  }}
                >
                  {costRange}
                </span>
              </div>

              {/* Days open */}
              {daysOpen > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      display: "flex",
                    }}
                  >
                    Open
                  </span>
                  <span
                    style={{
                      color: daysOpen > 30 ? "#EF4444" : "#F1F0EB",
                      fontSize: 30,
                      fontWeight: 800,
                      display: "flex",
                    }}
                  >
                    {daysOpen} days
                  </span>
                </div>
              )}

              {/* Affected */}
              {affected > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 12,
                      fontWeight: 600,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      display: "flex",
                    }}
                  >
                    Affected
                  </span>
                  <span
                    style={{
                      color: "#F1F0EB",
                      fontSize: 30,
                      fontWeight: 800,
                      display: "flex",
                    }}
                  >
                    {affected} people
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 16, display: "flex" }}>
                📍
              </span>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: 500, display: "flex" }}>
                {neighborhood}
              </span>
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.2)",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: 2,
                display: "flex",
              }}
            >
              fatcatsapp.com
            </span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            width: "100%",
            height: 4,
            background: "linear-gradient(90deg, #E8652B 0%, #ff8c5a 50%, #E8652B 100%)",
            display: "flex",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
