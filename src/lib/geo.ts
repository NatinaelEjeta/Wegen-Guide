// Wegen Guide — on-device geo helpers (Phase 2)
// Distance/bearing are computed locally with the Haversine formula so the
// nearest-office list keeps working fully OFFLINE. providers.json is the
// single source of truth — Google data never replaces it.

import type { Provider, Lang } from "@/lib/types";
import adminAreasJson from "@/data/admin-areas.json";
import { WEEKDAYS } from "@/lib/types";

export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in kilometers (Haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371; // earth radius km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a → b in degrees (0 = north, clockwise). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/** 8-wind compass sector key for i18n (geo.dir.n, geo.dir.ne, …). */
export function compassKey(deg: number): string {
  const sectors = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return sectors[idx];
}

/** Human distance: meters under 1 km, otherwise km with 1 decimal. */
export function formatDistance(km: number, t: (k: string) => string): string {
  if (km < 1) {
    const m = Math.max(10, Math.round((km * 1000) / 10) * 10);
    return `${m} ${t("common.m")}`;
  }
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} ${t("common.km")}`;
}

export type TravelMode = "walk" | "drive" | "transit";

/** Rough urban ETB-style speeds (km/h) — placeholders, refined by Google when online. */
const SPEED_KMH: Record<TravelMode, number> = { walk: 4.5, drive: 20, transit: 14 };

/** Estimated minutes for a distance (offline fallback). */
export function estimateMinutes(km: number, mode: TravelMode): number {
  return Math.max(1, Math.ceil((km / SPEED_KMH[mode]) * 60));
}

/** Google Maps deep links — work without an API key in any browser. */
export function mapsDirectionsUrl(
  dest: LatLng,
  mode: TravelMode,
  origin?: LatLng | null
): string {
  const tm = mode === "walk" ? "walking" : mode === "drive" ? "driving" : "transit";
  const params = new URLSearchParams({
    api: "1",
    destination: `${dest.lat},${dest.lng}`,
    travelmode: tm,
  });
  if (origin) params.set("origin", `${origin.lat},${origin.lng}`);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function mapsPlaceUrl(p: LatLng, label?: string): string {
  const q = label ? `${label} ${p.lat},${p.lng}` : `${p.lat},${p.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/* ------------------------------------------------------------------ */
/* Office status from providers.json hours (Monday-first)             */
/* ------------------------------------------------------------------ */

export type OfficeStatusKey =
  | "open"
  | "closing_soon"
  | "closed"
  | "temporarily_closed"
  | "moved"
  | "hours_unknown";

interface ParsedHours {
  startMin: number;
  endMin: number;
}

/** Parse "8:30-12:30, 13:30-17:30" into minute ranges. Returns [] when closed/unparseable. */
export function parseHours(spec: string): ParsedHours[] {
  if (!spec || spec.trim().toLowerCase() === "closed") return [];
  const out: ParsedHours[] = [];
  for (const chunk of spec.split(",")) {
    const m = chunk.trim().match(/^(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const startMin = Number(m[1]) * 60 + Number(m[2]);
    const endMin = Number(m[3]) * 60 + Number(m[4]);
    if (endMin > startMin) out.push({ startMin, endMin });
  }
  return out;
}

export interface OfficeStatus {
  key: OfficeStatusKey;
  /** Monday-first weekday key, e.g. "mon" */
  todayKey: (typeof WEEKDAYS)[number];
  todayHours: string;
  /** minutes until the current (or next) range ends, when closing_soon */
  minutesToClose?: number;
  /** true when inside the lunch break window */
  onLunchBreak: boolean;
}

/** Derive the current office status from local device time (no network). */
export function getOfficeStatus(provider: Provider): OfficeStatus {
  const now = new Date();
  const todayKey = WEEKDAYS[(now.getDay() + 6) % 7];
  const todayHours = provider.workingHours[todayKey] ?? "closed";
  const base: OfficeStatus = {
    key: "closed",
    todayKey,
    todayHours,
    onLunchBreak: false,
  };

  if (provider.status === "temporarily_closed") {
    return { ...base, key: "temporarily_closed" };
  }
  if (provider.status === "moved") {
    return { ...base, key: "moved" };
  }

  if (!todayHours.trim()) return { ...base, key: "hours_unknown" };
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const ranges = parseHours(todayHours);
  if (ranges.length === 0) return base;

  for (const r of ranges) {
    if (nowMin >= r.startMin && nowMin < r.endMin) {
      const minutesToClose = r.endMin - nowMin;
      return {
        ...base,
        key: minutesToClose <= 60 ? "closing_soon" : "open",
        minutesToClose,
      };
    }
  }

  // Between ranges (e.g. lunch 12:30–13:30) → treat as on lunch break but "open" overall
  const first = ranges[0];
  const last = ranges[ranges.length - 1];
  if (ranges.length > 1 && nowMin >= first.endMin && nowMin < last.startMin) {
    return { ...base, key: "open", onLunchBreak: true };
  }

  // Outside all ranges: if the office opens later today, still "closed" but with hours shown
  return base;
}

/* ------------------------------------------------------------------ */
/* Manual area selection (region → zone → woreda), data-driven        */
/* ------------------------------------------------------------------ */

interface AdminWoreda { pcode: string; name: string; lat?: number; lng?: number }
interface AdminZone { pcode: string; name: string; woredas: AdminWoreda[] }
interface AdminRegion { pcode: string; name: string; zones: AdminZone[] }

// Area names: OCHA Ethiopia / CSA / BoFED (COD-AB v04, CC BY-IGO)
const ADMIN_REGIONS: AdminRegion[] = (adminAreasJson as unknown as { regions: AdminRegion[] }).regions;

const byName = (a: string, b: string) => a.localeCompare(b);
const findRegion = (region: string) => ADMIN_REGIONS.find((r) => r.name === region);
const findZone = (region: string, zone: string) => findRegion(region)?.zones.find((z) => z.name === zone);
export function getRegionList(): string[] {
  return ADMIN_REGIONS.map((r) => r.name).sort(byName);
}

export function getZonesFor(region: string): string[] {
  return (findRegion(region)?.zones ?? []).map((z) => z.name).sort(byName);
}

export function getWoredasFor(region: string, zone: string): string[] {
  return (findZone(region, zone)?.woredas ?? []).map((w) => w.name).sort(byName);
}

/** Search circle for a chosen zone/woreda, from the centre points in admin-areas.json. */
function areaCircle(region: string, zone: string, woreda: string): { center: LatLng; radiusKm: number } | null {
  const z = findZone(region, zone);
  if (!z) return null;

  if (woreda) {
    const w = z.woredas.find((x) => x.name === woreda);
    if (w && w.lat !== undefined && w.lng !== undefined) {
      return { center: { lat: w.lat, lng: w.lng }, radiusKm: 25 };
    }
    return null;
  }

  const pts: LatLng[] = [];
  for (const w of z.woredas) {
    if (w.lat !== undefined && w.lng !== undefined) pts.push({ lat: w.lat, lng: w.lng });
  }
  if (pts.length === 0) return null;
  const center = {
    lat: pts.reduce((s, q) => s + q.lat, 0) / pts.length,
    lng: pts.reduce((s, q) => s + q.lng, 0) / pts.length,
  };
  const far = Math.max(...pts.map((q) => haversineKm(center, q)));
  return { center, radiusKm: Math.min(60, far + 10) };
}

/**
 * Providers for the chosen region/zone/woreda (ignores empty levels).
 * Exact name match first; if that finds nothing for a zone or woreda,
 * falls back to offices located near that area's centre point.
 */
export function filterByArea(
  providers: Provider[],
  region: string,
  zone: string,
  woreda: string
): Provider[] {
  const exact = providers.filter(
    (p) =>
      (!region || p.region === region) &&
      (!zone || p.zone === zone) &&
      (!woreda || p.woreda === woreda)
  );
  if (exact.length > 0 || !zone) return exact;

  const circle = areaCircle(region, zone, woreda);
  if (!circle) return exact;
  return providers.filter(
    (p) => haversineKm(circle.center, { lat: p.latitude, lng: p.longitude }) <= circle.radiusKm
  );
}
/** Sort providers by distance from a point, enriching with distanceKm + bearing. */
export function sortByDistance(
  providers: Provider[],
  from: LatLng
): (Provider & { distanceKm: number; bearing: number })[] {
  return providers
    .map((p) => ({
      ...p,
      distanceKm: haversineKm(from, { lat: p.latitude, lng: p.longitude }),
      bearing: bearingDeg(from, { lat: p.latitude, lng: p.longitude }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Compass label per language (not via i18n dict — used in voice text too). */
export function compassLabelLocal(key: string, lang: Lang): string {
  const table: Record<string, Record<Lang, string>> = {
    n: { am: "ሰሜን", om: "Kaaba", en: "N" },
    ne: { am: "ሰሜን ምሥራቅ", om: "Kaaba Bahaa", en: "NE" },
    e: { am: "ምሥራቅ", om: "Bahaa", en: "E" },
    se: { am: "ደቡብ ምሥራቅ", om: "Kibba Bahaa", en: "SE" },
    s: { am: "ደቡብ", om: "Kibba", en: "S" },
    sw: { am: "ደቡብ ምዕራብ", om: "Kibba Dhihaa", en: "SW" },
    w: { am: "ምዕራብ", om: "Dhihaa", en: "W" },
    nw: { am: "ሰሜን ምዕራብ", om: "Kaaba Dhihaa", en: "NW" },
  };
  const row = table[key];
  return row ? row[lang] || row.en : "";
}
