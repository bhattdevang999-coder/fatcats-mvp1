"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { listMapReports } from "@/lib/reports";
import { getPipelineIndex } from "@/lib/types";
import type { Report } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const CATEGORY_FILTERS = [
  { value: "all", label: "All", icon: "🗺️" },
  { value: "road_damage", label: "Roads", icon: "🛣️" },
  { value: "pothole", label: "Potholes", icon: "🕳️" },
  { value: "traffic_signal", label: "Signals", icon: "🚦" },
  { value: "street_light", label: "Lights", icon: "💡" },
  { value: "sidewalk", label: "Sidewalks", icon: "🚶" },
  { value: "water", label: "Water", icon: "💧" },
  { value: "sewer", label: "Sewer", icon: "🚰" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "unresolved", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

// Status to color mapping for map markers
function getStatusColor(status: string): string {
  const idx = getPipelineIndex(status);
  switch (idx) {
    case 0: return "#F59E0B";
    case 1: return "#3B82F6";
    case 2: return "#A855F7";
    case 3: return "#22C55E";
    case 4: return "#34D399";
    default: return "#F59E0B";
  }
}

function createCatMarkerSVG(color: string, size: number = 40): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>
    <g filter="url(#s)">
      <path d="M8 28 L6 10 L13 16 L20 8 L27 16 L34 10 L32 28 Q32 34 20 34 Q8 34 8 28Z" fill="${color}" stroke="#0F172A" stroke-width="1.5"/>
      <ellipse cx="14" cy="22" rx="2.5" ry="2" fill="#0F172A"/>
      <ellipse cx="26" cy="22" rx="2.5" ry="2" fill="#0F172A"/>
      <polygon points="20,25 18.5,27 21.5,27" fill="#0F172A"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function timeAgo(dateStr: string): string {
  const days = Math.max(1, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [reports, setReports] = useState<Report[]>([]);
  const [reportCount, setReportCount] = useState(0);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const mapboxglRef = useRef<typeof import("mapbox-gl") | null>(null);

  // Bottom sheet state
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Load reports
  useEffect(() => {
    async function load() {
      const data = await listMapReports({ category, status });
      setReports(data);
      setReportCount(data.length);
    }
    load();
  }, [category, status]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || mapRef.current) return;

    import("mapbox-gl").then((mapboxgl) => {
      mapboxglRef.current = mapboxgl;

      const map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-73.98, 40.74],
        zoom: 11,
        accessToken: MAPBOX_TOKEN,
      });

      map.on("load", () => {
        setLoaded(true);

        map.addSource("reports-311", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        map.addLayer({
          id: "clusters-311",
          type: "circle",
          source: "reports-311",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#A0734A",
            "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28],
            "circle-opacity": 0.7,
          },
        });

        map.addLayer({
          id: "cluster-count-311",
          type: "symbol",
          source: "reports-311",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 11,
          },
          paint: { "text-color": "#ffffff" },
        });

        map.addLayer({
          id: "unclustered-311",
          type: "circle",
          source: "reports-311",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match", ["get", "pipelineIdx"],
              0, "#F59E0B", 1, "#3B82F6", 2, "#A855F7", 3, "#22C55E", 4, "#34D399", "#A0734A",
            ],
            "circle-radius": 5,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0F172A",
            "circle-opacity": 0.6,
          },
        });

        map.on("click", "clusters-311", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters-311"] });
          if (!features.length) return;
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource("reports-311") as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            const geom = features[0].geometry;
            if (geom.type === "Point") {
              map.easeTo({ center: geom.coordinates as [number, number], zoom: zoom! });
            }
          });
        });

        map.on("mouseenter", "clusters-311", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "clusters-311", () => { map.getCanvas().style.cursor = ""; });
        map.on("mouseenter", "unclustered-311", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "unclustered-311", () => { map.getCanvas().style.cursor = ""; });
      });

      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when reports change
  useEffect(() => {
    if (!mapRef.current || !loaded || !mapboxglRef.current) return;
    const mapboxgl = mapboxglRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const citizenReports = reports.filter((r) => r.source === "citizen" && r.lat && r.lng);
    const threeOneOneReports = reports.filter((r) => r.source === "311" && r.lat && r.lng);

    citizenReports.forEach((r) => {
      const color = getStatusColor(r.status);
      const el = document.createElement("div");
      el.className = "cat-marker";
      el.style.width = "36px";
      el.style.height = "36px";
      el.style.cursor = "pointer";
      el.style.transition = "transform 0.15s ease";

      const img = document.createElement("img");
      img.src = createCatMarkerSVG(color, 40);
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.pointerEvents = "none";
      el.appendChild(img);

      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.3)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });

      // Click -> bottom sheet instead of popup
      el.addEventListener("click", () => {
        setSelectedReport(r);
      });

      const marker = new mapboxgl.default.Marker({ element: el })
        .setLngLat([r.lng!, r.lat!])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // 311 click → bottom sheet
    const handle311Click = (e: mapboxgl.MapMouseEvent) => {
      if (!e.features?.length) return;
      const props = e.features[0].properties!;
      const match = reports.find((r) => r.id === props.id);
      if (match) setSelectedReport(match);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapRef.current.on("click", "unclustered-311", handle311Click as any);

    const source311 = mapRef.current.getSource("reports-311") as mapboxgl.GeoJSONSource | undefined;
    if (source311) {
      const features = threeOneOneReports.map((r) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [r.lng!, r.lat!] },
        properties: {
          id: r.id,
          title: r.title,
          source: r.source,
          status: r.status,
          pipelineIdx: getPipelineIndex(r.status),
          statusLabel: ["Open", "Assigned", "In Progress", "Resolved", "Verified"][getPipelineIndex(r.status)],
          category: r.category,
          supporters_count: r.supporters_count,
          contractor_name: r.contractor_name || "",
        },
      }));
      source311.setData({ type: "FeatureCollection", features });
    }
  }, [reports, loaded]);

  // My Location handler
  const handleMyLocation = () => {
    if (!mapRef.current || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
      },
      () => {}
    );
  };

  return (
    <AppShell>
      <div className="flex flex-col" style={{ height: "calc(100dvh - var(--top-bar-height) - var(--bottom-bar-height))" }}>
        {/* Filters */}
        <div className="px-3 py-2.5 space-y-2 bg-[var(--fc-deep)]/80 backdrop-blur-md border-b border-white/5 relative z-10">
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setCategory(f.value)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all flex items-center gap-1 ${
                  category === f.value
                    ? "bg-[var(--fc-orange)] text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                  status === f.value
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="shrink-0 px-2.5 py-1.5 text-[11px] text-[var(--fc-muted)]">
              {reportCount} reports
            </span>
          </div>
        </div>

        {/* My Location button */}
        <button
          onClick={handleMyLocation}
          className="absolute bottom-20 right-3 z-10 w-10 h-10 rounded-xl bg-[var(--fc-deep)]/90 backdrop-blur-md border border-white/[0.08] flex items-center justify-center hover:bg-white/10 transition-colors active:scale-90"
          title="My location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8652B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>

        {/* Legend */}
        <div className="absolute bottom-4 left-3 z-10 flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--fc-deep)]/90 backdrop-blur-md border border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <img src={createCatMarkerSVG("#E8652B", 20)} alt="" width="16" height="16" />
            <span className="text-[10px] text-white/70 font-medium">Residents</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#A0734A]/70 border border-[#0F172A]" />
            <span className="text-[10px] text-white/70 font-medium">311 Data</span>
          </div>
        </div>

        {/* Map */}
        <div ref={mapContainer} className="flex-1" />

        {!MAPBOX_TOKEN && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--fc-deep)]">
            <p className="text-[var(--fc-muted)] text-sm">Mapbox token not configured.</p>
          </div>
        )}

        {/* Bottom sheet for selected report */}
        {selectedReport && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setSelectedReport(null)} />
            <div className="fixed bottom-[var(--bottom-bar-height)] left-0 right-0 z-30 animate-slide-up">
              <div className="max-w-lg mx-auto mx-3 mb-3">
                <div className="glass-card p-4 border border-white/10 shadow-2xl">
                  <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[var(--fc-surface-2)]">
                      <img
                        src={createCatMarkerSVG(getStatusColor(selectedReport.status), 40)}
                        alt=""
                        className="w-full h-full"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusPill status={selectedReport.status} />
                        <span className="text-[10px] text-[var(--fc-muted)]">
                          {selectedReport.source === "citizen" ? "Resident" : "311"} · {timeAgo(selectedReport.created_at)}
                        </span>
                      </div>
                      <h3 className="text-[14px] font-semibold text-white leading-tight line-clamp-2 mb-1">
                        {selectedReport.title}
                      </h3>
                      {selectedReport.neighborhood && (
                        <p className="text-[11px] text-[var(--fc-muted)] mb-2">{selectedReport.neighborhood}</p>
                      )}
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-[var(--fc-muted)]">
                          🐾 {selectedReport.supporters_count} affected
                        </span>
                        <Link
                          href={`/expose/${selectedReport.id}`}
                          className="text-[12px] font-semibold text-[var(--fc-orange)] hover:underline ml-auto"
                        >
                          View exposé →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
