"use client";

// Wegen Guide - "Trace route": start (your location) -> destination (the office), with km.
// Location is requested only when the person taps the button. The route line comes from the
// public OpenStreetMap routing server; if it is unreachable we show the straight-line km.

import React, { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { Car, ExternalLink, Footprints, Loader2, Route as RouteIcon, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useGeoStore } from "@/lib/hooks/useGeolocation";
import { mapsDirectionsUrl } from "@/lib/geo";
import type { LatLng } from "@/lib/geo";
import type { Provider } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const TEXT = {
  en: {
    trace: "Trace route",
    hide: "Hide route",
    start: "Start",
    yourLocation: "Your location",
    destination: "Destination",
    distance: "Distance",
    foot: "On foot",
    car: "By car",
    km: "km",
    min: "min",
    straight: "straight line (route unavailable)",
    locating: "Finding your location...",
    routing: "Tracing route...",
    noLocation: "Your location is needed to trace the route. Allow location in the browser, or open Google Maps.",
    rough: "Your location is only approximate (about {km} km), so the start point may be wrong.",
    openGoogle: "Open in Google Maps",
  },
  am: {
    trace: "መንገዱን አሳይ",
    hide: "መንገዱን ደብቅ",
    start: "መነሻ",
    yourLocation: "የእርስዎ ቦታ",
    destination: "መድረሻ",
    distance: "ርቀት",
    foot: "በእግር",
    car: "በመኪና",
    km: "ኪ.ሜ",
    min: "ደቂቃ",
    straight: "በቀጥታ መስመር (መንገድ አልተገኘም)",
    locating: "ቦታዎን በመፈለግ ላይ...",
    routing: "መንገዱን በማሳየት ላይ...",
    noLocation: "መንገዱን ለማሳየት ቦታዎ ያስፈልጋል። በአሳሹ ውስጥ ቦታን ይፍቀዱ፣ ወይም Google Mapsን ይክፈቱ።",
    rough: "ቦታዎ ግምታዊ ብቻ ነው (ወደ {km} ኪ.ሜ)፤ መነሻው ትክክል ላይሆን ይችላል።",
    openGoogle: "በGoogle Maps ክፈት",
  },
  om: {
    trace: "Karaa agarsiisi",
    hide: "Karaa dhoksi",
    start: "Eegala",
    yourLocation: "Iddoo kee",
    destination: "Bakka ga'umsaa",
    distance: "Fageenya",
    foot: "Miilaan",
    car: "Konkolaataan",
    km: "km",
    min: "daq.",
    straight: "sararaa kallattii (karaan hin argamne)",
    locating: "Iddoo kee barbaadaa jira...",
    routing: "Karaa agarsiisaa jira...",
    noLocation: "Karaa agarsiisuuf iddoon kee barbaachisa. Biraawzarii keessatti iddoo hayyami, ykn Google Maps bani.",
    rough: "Iddoon kee tilmaama qofa (km {km} ta'a); iddoon eegalaa dogoggora ta'uu danda'a.",
    openGoogle: "Google Maps irratti bani",
  },
} as const;

type Mode = "walk" | "drive";
type Phase = "idle" | "locating" | "noLocation" | "routing" | "done";
interface Result {
  km: number;
  minutes: number | null;
  straight: boolean;
}

function straightKm(a: LatLng, b: LatLng): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const fmtKm = (n: number) => (n < 10 ? n.toFixed(1) : String(Math.round(n)));

export function RouteTrace({ provider }: { provider: Provider }) {
  const { pick, lang } = useI18n();
  const s = TEXT[lang as keyof typeof TEXT] ?? TEXT.en;
  const sRef = useRef(s);
  const accuracy = useGeoStore((st) => st.accuracy);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("walk");
  const [start, setStart] = useState<LatLng | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    sRef.current = s;
  });

  const trace = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setResult(null);
    let pos = useGeoStore.getState().position;
    if (!pos) {
      setPhase("locating");
      await useGeoStore.getState().request();
      pos = useGeoStore.getState().position;
    }
    if (!pos) {
      setPhase("noLocation");
      return;
    }
    setStart(pos);
    setPhase("routing");
  };

  useEffect(() => {
    if (!open || !start || !containerRef.current) return;
    let cancelled = false;
    let map: Leaflet.Map | null = null;
    const controller = new AbortController();
    const from = start;
    const target = { lat: provider.latitude, lng: provider.longitude };

    (async () => {
      try {
        const mod = await import("leaflet");
        const L = ((mod as unknown as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
        if (cancelled || !containerRef.current) return;

        map = L.map(containerRef.current);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);

        L.circleMarker([from.lat, from.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 3,
          fillColor: "#0e7b45",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(sRef.current.yourLocation);

        const pin = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 30 42"><path d="M15 1C7.8 1 2 6.8 2 14c0 9.9 13 27 13 27s13-17.1 13-27C28 6.8 22.2 1 15 1z" fill="#b91c1c" stroke="#ffffff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#ffffff"/></svg>`;
        L.marker([target.lat, target.lng], {
          icon: L.divIcon({ className: "", html: pin, iconSize: [28, 40], iconAnchor: [14, 38] }),
        }).addTo(map);

        map.fitBounds(
          L.latLngBounds([
            [from.lat, from.lng],
            [target.lat, target.lng],
          ]),
          { padding: [30, 30], maxZoom: 16 }
        );

        try {
          const profile = mode === "walk" ? "routed-foot" : "routed-car";
          const url =
            `https://routing.openstreetmap.de/${profile}/route/v1/driving/` +
            `${from.lng},${from.lat};${target.lng},${target.lat}?overview=full&geometries=geojson`;
          const timer = setTimeout(() => controller.abort(), 10000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timer);
          if (!res.ok) throw new Error("routing failed");
          const data = (await res.json()) as {
            routes?: { distance?: number; duration?: number; geometry?: { coordinates?: number[][] } }[];
          };
          const r = data.routes?.[0];
          const coords = r?.geometry?.coordinates;
          if (!r || !coords || coords.length < 2 || typeof r.distance !== "number") {
            throw new Error("no route");
          }
          if (cancelled || !map) return;
          const line = L.polyline(
            coords.map(([lng, lat]) => [lat, lng] as [number, number]),
            { color: "#0e7b45", weight: 5, opacity: 0.85 }
          ).addTo(map);
          map.fitBounds(line.getBounds(), { padding: [30, 30] });
          setResult({
            km: r.distance / 1000,
            minutes: typeof r.duration === "number" ? Math.max(1, Math.round(r.duration / 60)) : null,
            straight: false,
          });
        } catch {
          if (cancelled || !map) return;
          L.polyline(
            [
              [from.lat, from.lng],
              [target.lat, target.lng],
            ],
            { color: "#6b7280", weight: 4, dashArray: "6 8" }
          ).addTo(map);
          setResult({ km: straightKm(from, target), minutes: null, straight: true });
        }
        setPhase("done");
      } catch {
        if (!cancelled) setPhase("done");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (map) map.remove();
    };
  }, [open, start, mode, provider.latitude, provider.longitude]);

  const roughKm = accuracy && accuracy > 5000 ? Math.round(accuracy / 1000) : 0;
  const dest = { lat: provider.latitude, lng: provider.longitude };

  return (
    <div>
      <Button
        variant={open ? "secondary" : "outline"}
        size="sm"
        className="h-10 w-full gap-1.5 rounded-xl font-bold"
        onClick={() => void trace()}
      >
        {open ? <X size={14} aria-hidden /> : <RouteIcon size={14} aria-hidden />}
        {open ? s.hide : s.trace}
      </Button>

      {open && (
        <Card className="mt-2 gap-2 p-3">
          {phase === "locating" && (
            <p className="flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              {s.locating}
            </p>
          )}

          {phase === "noLocation" && (
            <div className="space-y-2">
              <p className="text-[12px] leading-snug text-amber-800 dark:text-amber-200">{s.noLocation}</p>
              <a
                href={mapsDirectionsUrl(dest, "walk", null)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-[11.5px] font-bold text-primary-foreground"
              >
                <ExternalLink size={13} aria-hidden />
                {s.openGoogle}
              </a>
            </div>
          )}

          {start && (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                {(["walk", "drive"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => {
                      setMode(m);
                      setResult(null);
                      setPhase("routing");
                    }}
                    className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border text-[11.5px] font-bold ${
                      mode === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {m === "walk" ? <Footprints size={13} aria-hidden /> : <Car size={13} aria-hidden />}
                    {m === "walk" ? s.foot : s.car}
                  </button>
                ))}
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
                <dt className="font-bold text-muted-foreground">{s.start}</dt>
                <dd>
                  {s.yourLocation} ({start.lat.toFixed(4)}, {start.lng.toFixed(4)})
                </dd>
                <dt className="font-bold text-muted-foreground">{s.destination}</dt>
                <dd>{pick(provider.name)}</dd>
                <dt className="font-bold text-muted-foreground">{s.distance}</dt>
                <dd className="font-extrabold">
                  {result ? (
                    result.straight ? (
                      `${fmtKm(result.km)} ${s.km} - ${s.straight}`
                    ) : (
                      `${fmtKm(result.km)} ${s.km}${result.minutes ? ` - ~${result.minutes} ${s.min}` : ""}`
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
                      <Loader2 size={12} className="animate-spin" aria-hidden />
                      {s.routing}
                    </span>
                  )}
                </dd>
              </dl>

              {roughKm > 0 && (
                <p className="text-[11px] leading-snug text-amber-800 dark:text-amber-200">
                  {s.rough.replace("{km}", String(roughKm))}
                </p>
              )}

              <div
                ref={containerRef}
                className="isolate h-56 w-full overflow-hidden rounded-xl border border-border bg-muted"
              />
            </>
          )}
        </Card>
      )}
    </div>
  );
}