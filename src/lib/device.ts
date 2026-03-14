import { supabase } from "./supabase";
import { NYC_NEIGHBORHOODS } from "@/data/nyc-neighborhoods";

function generateHash(): string {
  const chars = "abcdef0123456789";
  let hash = "";
  for (let i = 0; i < 32; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function getDeviceHash(): string {
  if (typeof window === "undefined") return "";
  let hash = localStorage.getItem("watchdog_id");
  if (!hash) {
    hash = generateHash();
    localStorage.setItem("watchdog_id", hash);
    // Register in Supabase
    supabase
      .from("users_anonymous")
      .upsert({ device_hash: hash }, { onConflict: "device_hash" })
      .then(() => {});
  }
  return hash;
}

export function getNeighborhoodFromLatLng(
  lat: number,
  lng: number
): string {
  // Sort by bounding-box area (smallest first) for accuracy
  const sorted = [...NYC_NEIGHBORHOODS].sort((a, b) => {
    const areaA = (a.maxLat - a.minLat) * (a.maxLng - a.minLng);
    const areaB = (b.maxLat - b.minLat) * (b.maxLng - b.minLng);
    return areaA - areaB;
  });

  for (const hood of sorted) {
    if (
      lat >= hood.minLat &&
      lat <= hood.maxLat &&
      lng >= hood.minLng &&
      lng <= hood.maxLng
    ) {
      return `${hood.name}, ${hood.borough}`;
    }
  }

  return "New York City";
}
