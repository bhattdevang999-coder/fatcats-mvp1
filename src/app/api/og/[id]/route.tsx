import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

function categoryEmoji(cat: string): string {
  switch (cat) {
    case "pothole":    return "🕳️";
    case "streetlight": return "💡";
    case "sidewalk":   return "🚶";
    case "trash":      return "🗑️";
    default:           return "📍";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "fixed":      return "✅ Fixed";
    case "open":       return "🔴 Open";
    case "pending":    return "🟡 Pending";
    case "closed":     return "⚪ Closed";
    default:           return "🔴 Unresolved";
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
    .select("title,status,category,neighborhood")
    .eq("id", params.id)
    .single();

  const title = report?.title ?? "Street Issue";
  const status = statusLabel(report?.status ?? "unresolved");
  const emoji = categoryEmoji(report?.category ?? "other");
  const neighborhood = report?.neighborhood ?? "New York City";

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
            on FatCats
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
            fontSize: title.length > 60 ? 44 : 56,
            fontWeight: 800,
            lineHeight: 1.15,
            maxWidth: 960,
            marginBottom: 24,
            display: "flex",
          }}
        >
          {title}
        </div>

        {/* Status */}
        <div
          style={{
            color: "#E8652B",
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 16,
            display: "flex",
          }}
        >
          {status}
        </div>

        {/* Neighborhood */}
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
          <span>{neighborhood}</span>
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
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
