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
  const cost = (CATEGORY_COSTS[cat] || CATEGORY_COSTS.other);
  const avg = cost.avg;
  if (avg >= 1_000_000) return `$${(avg / 1_000_000).toFixed(1)}M`;
  if (avg >= 1_000) return `$${Math.round(avg / 1_000)}K`;
  return `$${avg}`;
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

function renderCard(opts: {
  title: string;
  estCost: string;
  status: string;
  neighborhood: string;
  affected: number;
  daysOpen: number;
  subline: string;
}) {
  const { title, estCost, status, neighborhood, affected, daysOpen, subline } = opts;
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
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Cat icon — the glowing omnipresent logo */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #E8652B 0%, #ff8c5a 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
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
                    fontSize: 24,
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
                    letterSpacing: 3,
                    display: "flex",
                  }}
                >
                  POINT. EXPOSE. FIX.
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
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 16 }}>
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

            {/* The cost hero — EST. prefix, massive */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              {/* Cost estimate - THE LEAD STAT */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "14px 28px",
                  borderRadius: 16,
                  background: "rgba(232, 101, 43, 0.12)",
                  border: "2px solid rgba(232, 101, 43, 0.3)",
                }}
              >
                <span
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 2,
                    display: "flex",
                  }}
                >
                  EST. COST TO FIX
                </span>
                <span
                  style={{
                    color: "#E8652B",
                    fontSize: 36,
                    fontWeight: 900,
                    display: "flex",
                  }}
                >
                  ~{estCost}
                </span>
              </div>

              {/* Days open */}
              {daysOpen > 0 && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 2,
                      display: "flex",
                    }}
                  >
                    OPEN
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
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: 2,
                      display: "flex",
                    }}
                  >
                    AFFECTED
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

            {/* Dharmaraj subline — cold, factual */}
            <div
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 18,
                fontWeight: 500,
                display: "flex",
                marginTop: 4,
              }}
            >
              {subline}
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
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 16, fontWeight: 500, display: "flex" }}>
                {neighborhood}
              </span>
            </div>
            <span
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 3,
                display: "flex",
              }}
            >
              FATCATSAPP.COM
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
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Try to fetch from Supabase for real data
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let title = "NYC Infrastructure Issue";
    let status = "open";
    let category = "other";
    let neighborhood = "New York City";
    let affected = 0;
    let daysOpen = 0;

    if (supabaseUrl && supabaseKey) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: report } = await supabase
          .from("reports")
          .select("title,status,category,neighborhood,supporters_count,created_at")
          .eq("id", params.id)
          .single();

        if (report) {
          title = report.title ?? title;
          status = report.status ?? status;
          category = report.category ?? category;
          neighborhood = report.neighborhood ?? neighborhood;
          affected = report.supporters_count ?? 0;
          daysOpen = report.created_at
            ? Math.max(1, Math.floor((Date.now() - new Date(report.created_at).getTime()) / 86400000))
            : 0;
        }
      } catch {
        // Supabase failed — use defaults
      }
    }

    const estCost = getEstCost(category);
    const isOpen = status !== "fixed" && status !== "verified";
    const subline = isOpen
      ? daysOpen > 14
        ? `${daysOpen} days. No one has moved.`
        : daysOpen > 1
        ? `Filed ${daysOpen} days ago. Still waiting.`
        : "Just filed. Clock starts now."
      : "Resolved.";

    return renderCard({ title, estCost, status, neighborhood, affected, daysOpen, subline });
  } catch {
    // If anything fails, return a generic FatCats card (never return empty)
    return renderCard({
      title: "NYC Infrastructure Issue",
      estCost: "$2K",
      status: "open",
      neighborhood: "New York City",
      affected: 0,
      daysOpen: 0,
      subline: "Point. Expose. Fix.",
    });
  }
}
