"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { listMapReports } from "@/lib/reports";
import type { Report } from "@/lib/types";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const CATEGORY_FILTERS = [
  { value: "all", label: "All" },
  { value: "pothole", label: "Potholes" },
  { value: "streetlight", label: "Streetlights" },
  { value: "sidewalk", label: "Sidewalks" },
  { value: "trash", label: "Trash" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "unresolved", label: "Unresolved" },
  { value: "fixed", label: "Fixed" },
];

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [reports, setReports] = useState<Report[]>([]);

  // Load reports
  useEffect(() => {
    async function load() {
      const data = await listMapReports({ category, status });
      setReports(data);
    }
    load();
  }, [category, status]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN || mapRef.current) return;

    import("mapbox-gl").then((mapboxgl) => {

      const map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [-73.98, 40.74],
        zoom: 11,
        accessToken: MAPBOX_TOKEN,
      });

      map.on("load", () => {
        setLoaded(true);

        // Cluster source
        map.addSource("reports", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster circles
        map.addLayer({
          id: "clusters",
          type: "circle",
          source: "reports",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#E8652B",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              18, 10, 24, 50, 32,
            ],
            "circle-opacity": 0.8,
          },
        });

        // Cluster count labels
        map.addLayer({
          id: "cluster-count",
          type: "symbol",
          source: "reports",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: { "text-color": "#ffffff" },
        });

        // Individual points
        map.addLayer({
          id: "unclustered-point",
          type: "circle",
          source: "reports",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": [
              "case",
              ["==", ["get", "source"], "citizen"],
              "#E8652B",
              "#A0734A",
            ],
            "circle-radius": [
              "case",
              ["==", ["get", "source"], "citizen"],
              7,
              5,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#0F172A",
          },
        });

        // Cluster click → zoom
        map.on("click", "clusters", (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          if (!features.length) return;
          const clusterId = features[0].properties?.cluster_id;
          const source = map.getSource("reports") as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            const geom = features[0].geometry;
            if (geom.type === "Point") {
              map.easeTo({
                center: geom.coordinates as [number, number],
                zoom: zoom!,
              });
            }
          });
        });

        // Point click → popup
        map.on("click", "unclustered-point", (e) => {
          if (!e.features?.length) return;
          const props = e.features[0].properties!;
          const geom = e.features[0].geometry;
          if (geom.type !== "Point") return;
          const coords = geom.coordinates as [number, number];

          const sourceLabel = props.source === "citizen" ? "Citizen exposé" : "City data";
          new mapboxgl.default.Popup({ offset: 12 })
            .setLngLat(coords)
            .setHTML(`
              <div style="max-width:220px;">
                <p style="font-weight:600;font-size:14px;margin:0 0 6px;color:#fff;">${props.title}</p>
                <p style="font-size:11px;color:#8B95A8;margin:0 0 8px;">${sourceLabel} · ${props.supporters_count || 0} watching</p>
                <a href="/expose/${props.id}" style="color:#E8652B;font-size:12px;font-weight:600;text-decoration:none;">View exposé →</a>
              </div>
            `)
            .addTo(map);
        });

        // Cursor style
        map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
        map.on("mouseenter", "unclustered-point", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "unclustered-point", () => { map.getCanvas().style.cursor = ""; });
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

  // Update source data when reports change
  useEffect(() => {
    if (!mapRef.current || !loaded) return;
    const source = mapRef.current.getSource("reports") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    const features = reports
      .filter((r) => r.lat && r.lng)
      .map((r) => ({
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
          category: r.category,
          supporters_count: r.supporters_count,
        },
      }));

    source.setData({ type: "FeatureCollection", features });
  }, [reports, loaded]);

  return (
    <AppShell>
      <div className="flex flex-col" style={{ height: "calc(100dvh - 56px)" }}>
        {/* Filters */}
        <div className="px-4 py-3 space-y-2 bg-[var(--fc-deep)]/50 border-b border-white/5">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORY_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setCategory(f.value)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  category === f.value
                    ? "bg-[var(--fc-orange)] text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  status === f.value
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {f.label}
              </button>
            ))}
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
