"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
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
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "verified", label: "Verified" },
];

// Status to color mapping for map markers
function getStatusColor(status: string): string {
  const idx = getPipelineIndex(status);
  switch (idx) {
    case 0: return "#F59E0B"; // amber - open
    case 1: return "#3B82F6"; // blue - assigned
    case 2: return "#A855F7"; // purple - in progress
    case 3: return "#22C55E"; // green - resolved
    case 4: return "#34D399"; // emerald - verified
    default: return "#F59E0B";
  }
}

// Create cat-head SVG as data URL for use as Mapbox marker image
function createCatMarkerSVG(color: string, size: number = 40): string {
  // Minimal angular cat head silhouette matching the FatCats logo style
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
    <defs>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#000" flood-opacity="0.5"/>
      </filter>
    </defs>
    <g filter="url(#s)">
      <!-- Cat head shape: angular ears + round face -->
      <path d="M8 28 L6 10 L13 16 L20 8 L27 16 L34 10 L32 28 Q32 34 20 34 Q8 34 8 28Z" fill="${color}" stroke="#0F172A" stroke-width="1.5"/>
      <!-- Eyes -->
      <ellipse cx="14" cy="22" rx="2.5" ry="2" fill="#0F172A"/>
      <ellipse cx="26" cy="22" rx="2.5" ry="2" fill="#0F172A"/>
      <!-- Nose -->
      <polygon points="20,25 18.5,27 21.5,27" fill="#0F172A"/>
    </g>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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

        // Add GeoJSON source for 311 reports (will use clusters)
        map.addSource("reports-311", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster circles for 311 data
        map.addLayer({
          id: "clusters-311",
          type: "circle",
          source: "reports-311",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#A0734A",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              16, 10, 22, 50, 28,
            ],
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

        // Individual 311 dots (small, muted)
        map.addLayer({
          id: "unclustered-311",
          type: "circle",
          source: "reports-311",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "match",
              ["get", "pipelineIdx"],
              0, "#F59E0B",
              1, "#3B82F6",
              2, "#A855F7",
              3, "#22C55E",
              4, "#34D399",
              "#A0734A",
            ],
            "circle-radius": 5,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#0F172A",
            "circle-opacity": 0.6,
          },
        });

        // Click handlers for 311 clusters
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

        // Click on individual 311 point
        map.on("click", "unclustered-311", (e) => {
          if (!e.features?.length) return;
          const props = e.features[0].properties!;
          const geom = e.features[0].geometry;
          if (geom.type !== "Point") return;
          const coords = geom.coordinates as [number, number];

          new mapboxgl.default.Popup({ offset: 12, className: "fc-popup" })
            .setLngLat(coords)
            .setHTML(`
              <div style="max-width:220px;">
                <p style="font-weight:600;font-size:14px;margin:0 0 6px;color:#fff;">${props.title}</p>
                <p style="font-size:11px;color:#8B95A8;margin:0 0 4px;">311 Data · ${props.statusLabel}</p>
                ${props.contractor_name ? `<p style="font-size:10px;color:#8B95A8;margin:0 0 8px;">📋 ${props.contractor_name}</p>` : ""}
                <a href="/expose/${props.id}" style="color:#E8652B;font-size:12px;font-weight:600;text-decoration:none;">View exposé →</a>
              </div>
            `)
            .addTo(map);
        });

        // Cursors
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

    // Clear old citizen markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Separate citizen vs 311
    const citizenReports = reports.filter((r) => r.source === "citizen" && r.lat && r.lng);
    const threeOneOneReports = reports.filter((r) => r.source === "311" && r.lat && r.lng);

    // Add citizen reports as custom cat-head HTML markers
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

      // Hover effect
      el.addEventListener("mouseenter", () => { el.style.transform = "scale(1.3)"; });
      el.addEventListener("mouseleave", () => { el.style.transform = "scale(1)"; });

      // Click -> popup
      el.addEventListener("click", () => {
        const statusLabel = (() => {
          const idx = getPipelineIndex(r.status);
          return ["Open", "Assigned", "In Progress", "Resolved", "Verified"][idx];
        })();

        new mapboxgl.default.Popup({ offset: 20, className: "fc-popup" })
          .setLngLat([r.lng!, r.lat!])
          .setHTML(`
            <div style="max-width:220px;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                <span style="font-size:14px;">🐱</span>
                <span style="font-size:10px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusLabel}</span>
              </div>
              <p style="font-weight:600;font-size:14px;margin:0 0 6px;color:#fff;">${r.title}</p>
              <p style="font-size:11px;color:#8B95A8;margin:0 0 4px;">Citizen watchdog · ${r.supporters_count} watching</p>
              ${r.contractor_name ? `<p style="font-size:10px;color:#8B95A8;margin:0 0 8px;">📋 ${r.contractor_name}</p>` : ""}
              <a href="/expose/${r.id}" style="color:#E8652B;font-size:12px;font-weight:600;text-decoration:none;">View exposé →</a>
            </div>
          `)
          .addTo(mapRef.current!);
      });

      const marker = new mapboxgl.default.Marker({ element: el })
        .setLngLat([r.lng!, r.lat!])
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });

    // Update 311 GeoJSON source
    const source311 = mapRef.current.getSource("reports-311") as mapboxgl.GeoJSONSource | undefined;
    if (source311) {
      const features = threeOneOneReports.map((r) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [r.lng!, r.lat!],
        },
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

        {/* Legend */}
        <div className="absolute bottom-4 left-3 z-10 flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--fc-deep)]/90 backdrop-blur-md border border-white/[0.06]">
          <div className="flex items-center gap-1.5">
            <img src={createCatMarkerSVG("#E8652B", 20)} alt="" width="16" height="16" />
            <span className="text-[10px] text-white/70 font-medium">Citizens</span>
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
      </div>
    </AppShell>
  );
}
