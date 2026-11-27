"use client";

// Wegen Guide - lazy embedded map (OpenStreetMap + Leaflet, no API key, no card).
// Loaded ONLY after an explicit user tap ("Show map") on capable, online devices.
// providers.json stays the single source of truth.
// Every office keeps a no-key path: Google Maps deep links in ProviderCard.

import React, { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bus, Car, ExternalLink, Footprints, Loader2, MapPin, Phone, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getOfficeStatus, mapsDirectionsUrl, mapsPlaceUrl } from "@/lib/geo";
import type { LatLng } from "@/lib/geo";
import type { Provider, ProviderType } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

/** Kept for compatibility: the OpenStreetMap map needs no key. */
export const MAPS_KEY_PRESENT = true;

/** Marker color per office type (Ethiopian palette - no blues/indigos). */
const TYPE_COLORS: Record<ProviderType, string> = {
  kebele: "#166534",
  woreda: "#15803d",
  city_administration: "#44403c",
  immigration: "#0f766e",
  tax_office: "#9a3412",
  court: "#7f1d1d",
  police_station: "#3f3f46",
  health_center: "#b91c1c",
  utility_office: "#a16207",
  fayda_center: "#b7791f",
  transport_authority: "#b45309",
  trade_bureau: "#c2410c",
  land_registry: "#57534e",
  notary: "#57534e",
  civil_registry: "#166534",
  other: "#6b7280",
};

type Mode = "walk" | "drive" | "transit";

const DEFAULT_CENTER: [number, number] = [9.0192, 38.7525];

/** Classic pin shape as inline SVG (no network fetch). */
function pinHtml(color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 30 42"><path d="M15 1C7.8 1 2 6.8 2 14c0 9.9 13 27 13 27s13-17.1 13-27C28 6.8 22.2 1 15 1z" fill="${color}" stroke="#ffffff" stroke-width="2"/><circle cx="15" cy="14" r="5" fill="#ffffff"/></svg>`;
}

export function OfficeMap({
  providers,
  userPos,
  onClear,
}: {
  providers: Provider[];
  userPos: LatLng | null;
  onClear: () => void;
}) {
  const { t, pick } = useI18n();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const leafletRef = useRef<typeof Leaflet | null>(null);
  const routeRef = useRef<Leaflet.Polyline | null>(null);
  const pickRef = useRef(pick);
  const tRef = useRef(t);
  const [apiState, setApiState] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<Provider | null>(null);
  const [routing, setRouting] = useState(false);

  // keep the latest translation helpers available to the map effect
  useEffect(() => {
    pickRef.current = pick;
    tRef.current = t;
  });

  useEffect(() => {
    let cancelled = false;
    let map: Leaflet.Map | null = null;

    (async () => {
      try {
        const mod = await import("leaflet");
        const L = ((mod as unknown as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
        if (cancelled || !containerRef.current) return;
        leafletRef.current = L;

        map = L.map(containerRef.current).setView(
          userPos ? [userPos.lat, userPos.lng] : DEFAULT_CENTER,
          userPos ? 13 : 11
        );
        mapRef.current = map;

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);

        const points: [number, number][] = [];
        for (const p of providers) {
          const icon = L.divIcon({
            className: "",
            html: pinHtml(TYPE_COLORS[p.type] ?? TYPE_COLORS.other),
            iconSize: [28, 40],
            iconAnchor: [14, 38],
          });
          L.marker([p.latitude, p.longitude], { icon, title: pickRef.current(p.name) })
            .addTo(map)
            .on("click", () => setSelected(p));
          points.push([p.latitude, p.longitude]);
        }
        if (userPos) {
          L.circleMarker([userPos.lat, userPos.lng], {
            radius: 9,
            color: "#ffffff",
            weight: 3,
            fillColor: "#0e7b45",
            fillOpacity: 1,
          })
            .addTo(map)
            .bindTooltip(tRef.current("geo.youAreHere"));
          points.push([userPos.lat, userPos.lng]);
        }
        if (points.length > 0) {
          map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
        }
        setApiState("ready");
      } catch {
        if (!cancelled) setApiState("error");
      }
    })();

    return () => {
      cancelled = true;
      routeRef.current = null;
      mapRef.current = null;
      if (map) map.remove();
    };
  }, [providers, userPos]);

  /** Draw a walking/driving route (one request per tap). Falls back to a Google Maps link. */
  const drawRoute = async (p: Provider, mode: Mode) => {
    const dest = { lat: p.latitude, lng: p.longitude };
    const openGoogle = () =>
      window.open(mapsDirectionsUrl(dest, mode, userPos), "_blank", "noopener,noreferrer");

    const L = leafletRef.current;
    const map = mapRef.current;
    if (mode === "transit" || !userPos || !L || !map) {
      openGoogle();
      return;
    }

    setRouting(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const profile = mode === "walk" ? "routed-foot" : "routed-car";
      const url =
        `https://routing.openstreetmap.de/${profile}/route/v1/driving/` +
        `${userPos.lng},${userPos.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("routing failed");
      const data = (await res.json()) as {
        routes?: { geometry?: { coordinates?: number[][] } }[];
      };
      const coords = data.routes?.[0]?.geometry?.coordinates;
      if (!coords || coords.length < 2) throw new Error("no route");

      routeRef.current?.remove();
      const latlngs = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
      routeRef.current = L.polyline(latlngs, { color: "#0e7b45", weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(routeRef.current.getBounds(), { padding: [40, 40] });
      setSelected(null); // close the drawer so the route is visible
    } catch {
      openGoogle();
    } finally {
      clearTimeout(timer);
      setRouting(false);
    }
  };

  const st = selected ? getOfficeStatus(selected) : null;
  const hoursText = !st
    ? ""
    : st.key === "hours_unknown"
      ? t("office.hoursUnconfirmed")
      : st.todayHours === "closed"
        ? t("officeStatus.closed")
        : `${t("officeStatus.open")} \u2014 ${st.todayHours}`;

  return (
    <div className="relative">
      <div
        ref={containerRef}
        role="application"
        aria-label={t("geo.mapLabel")}
        className="isolate h-72 w-full overflow-hidden rounded-2xl border border-border bg-muted sm:h-80"
      />

      {/* loading / error overlays */}
      {apiState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-muted/80">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 size={16} className="animate-spin" aria-hidden />
            {t("common.loading")}
          </span>
        </div>
      )}
      {apiState === "error" && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-muted/90 px-6 text-center">
          <p className="text-[12px] leading-snug text-muted-foreground">{t("geo.mapError")}</p>
        </div>
      )}

      {/* close button */}
      <button
        type="button"
        onClick={onClear}
        aria-label={t("common.close")}
        className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-muted"
      >
        <X size={16} aria-hidden />
      </button>

      {/* office drawer */}
      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent className="mx-auto max-w-xl">
          <DrawerHeader>
            <DrawerTitle className="flex flex-wrap items-center gap-2 text-left text-sm font-bold">
              {selected ? pick(selected.name) : ""}
              {selected?.isSample ? (
                <Badge variant="outline" className="text-[10px]">{t("office.sampleBadge")}</Badge>
              ) : null}
              {selected?.source === "community-suggestion" ? (
                <Badge variant="outline" className="text-[10px]">{t("office.unverifiedBadge")}</Badge>
              ) : null}
            </DrawerTitle>
            <DrawerDescription className="text-left text-xs leading-snug text-muted-foreground">
              {selected
                ? `${pick(selected.address)} \u00B7 ${t("office.landmark")}: ${pick(selected.landmark)}`
                : ""}
            </DrawerDescription>
          </DrawerHeader>
          {selected && (
            <div className="px-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
              <p className="mb-2 text-[11px] text-muted-foreground">
                {t(`providerType.${selected.type}`)} {"\u00B7"} {hoursText}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["walk", "drive", "transit"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    disabled={routing}
                    onClick={() => void drawRoute(selected, mode)}
                    className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[11px] font-bold hover:bg-muted disabled:opacity-60"
                  >
                    {routing ? (
                      <Loader2 size={13} className="animate-spin" aria-hidden />
                    ) : mode === "walk" ? (
                      <Footprints size={13} aria-hidden />
                    ) : mode === "drive" ? (
                      <Car size={13} aria-hidden />
                    ) : (
                      <Bus size={13} aria-hidden />
                    )}
                    {t(`trip.mode${mode === "walk" ? "Walk" : mode === "drive" ? "Drive" : "Transit"}`)}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <a
                  href={mapsDirectionsUrl({ lat: selected.latitude, lng: selected.longitude }, "walk", userPos)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary text-[11px] font-bold text-primary-foreground"
                >
                  <MapPin size={13} aria-hidden />
                  {t("office.directions")}
                </a>
                <a
                  href={mapsPlaceUrl({ lat: selected.latitude, lng: selected.longitude }, pick(selected.name))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-secondary text-[11px] font-bold text-secondary-foreground"
                >
                  <ExternalLink size={13} aria-hidden />
                  {t("office.openInMaps")}
                </a>
              </div>
              <a
                href={`tel:${selected.phone.replace(/[^+\d]/g, "")}`}
                className="mt-1.5 flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[11.5px] font-bold"
              >
                <Phone size={13} aria-hidden />
                {t("common.call")}
              </a>
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}