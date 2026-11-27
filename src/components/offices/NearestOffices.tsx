"use client";

// Wegen Guide — "nearest offices" block (Phase 2)
// - "Use my location" (requested only on tap; kept in memory only)
// - Manual region → zone → woreda fallback when location is denied/unsupported
// - Distance + compass computed on-device (Haversine) → works fully offline
// - Filters: open now · accessible · online · within 5/10/25 km
// - Embedded Google map is lazy (only after an explicit tap) and is replaced
//   by the card list + Google Maps deep links on low-end devices.

import React, { useMemo, useState } from "react";
import {
  Accessibility,
  CircleAlert,
  Globe,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useOnline } from "@/lib/hooks/useOnline";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { useDeviceCapability } from "@/lib/hooks/useDeviceCapability";
import {
  filterByArea,
  getRegionList,
  getWoredasFor,
  getZonesFor,
  sortByDistance,
  nearestArea,
  areaCenter,
} from "@/lib/geo";
import { getServices } from "@/lib/data";
import { useAutoLocate } from "@/lib/hooks/useAutoLocate";
import { RouteTrace } from "@/components/offices/RouteTrace";
import { OfficeSuggestionForm } from "@/components/offices/OfficeSuggestionForm";
import { emptyMessage, emptyTexts } from "@/lib/officeMessages";
import type { EmptyKind } from "@/lib/officeMessages";
import { getProviders } from "@/lib/data";
import { ProviderCard } from "@/components/offices/ProviderCard";
import { OfficeMap, MAPS_KEY_PRESENT } from "@/components/offices/OfficeMap";
import { TripTracker } from "@/components/offices/TripTracker";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AreaFilter = 0 | 5 | 10 | 25; // 0 = any distance

interface Filters {
  openNow: boolean;
  accessible: boolean;
  online: boolean;
  maxKm: AreaFilter;
}

const DEFAULT_FILTERS: Filters = { openNow: false, accessible: false, online: false, maxKm: 0 };

export function NearestOffices({
  serviceId,
  onServiceClick,
}: {
  /** when set, only offices that provide this service are listed */
  serviceId?: string;
  onServiceClick?: (serviceId: string) => void;
}) {
  const { t, lang, pick } = useI18n();
  const online = useOnline();
  const { isLowEnd } = useDeviceCapability();
  const { status: geoStatus, position, accuracy, request, clear } = useGeolocation();
  useAutoLocate();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [manualOpen, setManualOpen] = useState(false);
  const [region, setRegion] = useState("");
  const [zone, setZone] = useState("");
  const [woreda, setWoreda] = useState("");
  const [mapVisible, setMapVisible] = useState(false);

  const usingDistance = !!position;
  const usingArea = !!region || !!zone || !!woreda;

  const todayKey = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"][
    (new Date().getDay() + 6) % 7
  ];

  const enriched = useMemo(() => {
    const list = serviceId
      ? getProviders().filter((p) => p.serviceIds.includes(serviceId))
      : getProviders();
    const scoped = usingArea ? filterByArea(list, region, zone, woreda) : list;
    if (position) return sortByDistance(scoped, position); // adds distanceKm + bearing, sorted
    return scoped.map((p) => ({ ...p, distanceKm: NaN, bearing: 0 }));
  }, [serviceId, position, usingArea, region, zone, woreda]);

  const providers = useMemo(() => {
    let list = enriched;
    if (filters.openNow) {
      list = list.filter(
        (p) => p.status === "active" && !!p.workingHours[todayKey] && p.workingHours[todayKey] !== "closed"
      );
    }
    if (filters.accessible) {
      list = list.filter((p) => p.accessibility.includes("wheelchair_access"));
    }
    if (filters.online) {
      list = list.filter((p) => p.offersOnline);
    }
    if (position && filters.maxKm > 0) {
      list = list.filter((p) => p.distanceKm <= filters.maxKm);
    }
    return list;
  }, [enriched, filters, position, todayKey]);

  // true when the chosen zone/woreda had no exact-name match and the list is the nearby fallback
  const nearbyNote =
    usingArea &&
    !!zone &&
    enriched.length > 0 &&
    !enriched.some((p) => p.region === region && p.zone === zone && (!woreda || p.woreda === woreda));

  const service = serviceId ? getServices().find((s) => s.id === serviceId) : undefined;
  const serviceName = service ? pick(service.name) : "";
  const nearest = useMemo(() => (position ? nearestArea(position) : null), [position]);
  const areaName =
    [woreda, zone, region].find(Boolean) ??
    (nearest ? [nearest.woreda, nearest.region].filter(Boolean).join(", ") : "");
  const chosenCenter = areaCenter(region, zone, woreda);
  const filtersOn = filters.openNow || filters.accessible || filters.online || filters.maxKm > 0;
  const roughKm = accuracy && accuracy > 5000 ? Math.round(accuracy / 1000) : 0;
  const roughText = roughKm > 0 ? emptyTexts(lang).rough.replace("{km}", String(roughKm)) : "";
  const emptyKind: EmptyKind =
    enriched.length > 0 && filtersOn
      ? "filters"
      : areaName
        ? serviceName
          ? "serviceInArea"
          : "anyInArea"
        : serviceName
          ? "serviceNone"
          : "none";

  const showMapToggle = online && MAPS_KEY_PRESENT && !isLowEnd && (providers.length > 0 || !!position || !!chosenCenter);

  return (
    <div className="space-y-3">
      {/* --- location card --- */}
      <div className="rounded-2xl border border-border bg-muted/50 p-3">
        {geoStatus === "idle" && (
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => void request()}
              className="h-11 gap-2 rounded-xl"
              aria-label={t("geo.useLocation")}
            >
              <LocateFixed size={17} aria-hidden />
              {t("geo.useLocation")}
            </Button>
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
              <CircleAlert size={13} className="mt-0.5 shrink-0" aria-hidden />
              {t("geo.privacyNote")}
            </p>
          </div>
        )}

        {geoStatus === "locating" && (
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Loader2 size={16} className="animate-spin" aria-hidden />
            {t("geo.locating")}
          </div>
        )}

        {geoStatus === "ready" && position && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-[12px] font-bold text-primary">
              <LocateFixed size={14} aria-hidden />
              {t("geo.showingNearby")}
            </span>
            {accuracy ? (
              <span className="text-[10.5px] text-muted-foreground">±{Math.round(accuracy)} m</span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-9 gap-1 rounded-full text-muted-foreground"
              onClick={clear}
            >
              <RotateCcw size={13} aria-hidden />
              {t("geo.resetLocation")}
            </Button>
          </div>
        )}

        {geoStatus === "ready" && position && roughKm > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-amber-800 dark:text-amber-200">
            <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
            {roughText}
          </p>
        )}

        {geoStatus === "denied" && (
          <p className="flex items-start gap-1.5 text-[12px] leading-snug text-amber-800 dark:text-amber-200">
            <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
            {t("geo.deniedNote")}
          </p>
        )}

        {geoStatus === "unsupported" && (
          <p className="flex items-start gap-1.5 text-[12px] leading-snug text-amber-800 dark:text-amber-200">
            <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
            {t("geo.unsupportedNote")}
          </p>
        )}

        {geoStatus === "error" && (
          <div className="flex flex-col gap-2">
            <p className="text-[12px] leading-snug text-muted-foreground">{t("geo.errorNote")}</p>
            <Button onClick={() => void request()} className="h-11 gap-2 rounded-xl">
              <LocateFixed size={17} aria-hidden />
              {t("common.retry")}
            </Button>
          </div>
        )}

        {/* manual area fallback */}
        {(geoStatus === "denied" || geoStatus === "unsupported" || manualOpen || roughKm > 0) && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
              <MapPin size={13} aria-hidden />
              {t("geo.chooseArea")}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Select
                value={region}
                onValueChange={(v) => {
                  setRegion(v === "any" ? "" : v);
                  setZone("");
                  setWoreda("");
                }}
              >
                <SelectTrigger aria-label={t("geo.region")} className="h-11 rounded-xl bg-card">
                  <SelectValue placeholder={t("geo.region")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t("geo.anyArea")}</SelectItem>
                  {getRegionList().map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={zone}
                onValueChange={(v) => {
                  setZone(v === "any" ? "" : v);
                  setWoreda("");
                }}
                disabled={!region}
              >
                <SelectTrigger aria-label={t("geo.zone")} className="h-11 rounded-xl bg-card">
                  <SelectValue placeholder={t("geo.zone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t("geo.anyArea")}</SelectItem>
                  {getZonesFor(region).map((z) => (
                    <SelectItem key={z} value={z}>
                      {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={woreda}
                onValueChange={(v) => setWoreda(v === "any" ? "" : v)}
                disabled={!region || !zone}
              >
                <SelectTrigger aria-label={t("geo.woreda")} className="h-11 rounded-xl bg-card">
                  <SelectValue placeholder={t("geo.woreda")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">{t("geo.anyArea")}</SelectItem>
                  {getWoredasFor(region, zone).map((w) => (
                    <SelectItem key={w} value={w}>
                      {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* small toggle to open manual selection even when location works */}
        {geoStatus !== "denied" && geoStatus !== "unsupported" && !manualOpen && !(roughKm > 0) && (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="mt-2 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
          >
            {t("geo.chooseAreaInstead")}
          </button>
        )}
      </div>

      {/* --- offline note --- */}
      {!online && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {t("offline.mapNote")}
        </p>
      )}

      {/* --- lazy map (capable devices, online, API key present) --- */}
      {showMapToggle && !mapVisible && (
        <button
          type="button"
          onClick={() => setMapVisible(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-[12.5px] font-bold text-foreground transition-colors hover:bg-muted"
          aria-label={t("geo.showMap")}
        >
          <MapIcon size={16} aria-hidden />
          {t("geo.showMap")}
        </button>
      )}
      {mapVisible && (
        <OfficeMap
          providers={providers}
          userPos={position}
          center={chosenCenter}
          accuracyM={accuracy}
          areaLabel={areaName}
          onClear={() => setMapVisible(false)}
        />
      )}

      {nearbyNote && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {t("geo.nearbyArea")}
        </p>
      )}

      {/* --- filters --- */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t("office.filters")}
      >
        <FilterChip
          active={filters.openNow}
          onClick={() => setFilters((f) => ({ ...f, openNow: !f.openNow }))}
          label={t("office.filterOpen")}
        />
        <FilterChip
          active={filters.accessible}
          onClick={() => setFilters((f) => ({ ...f, accessible: !f.accessible }))}
          label={t("office.filterAccessible")}
          icon={<Accessibility size={12} aria-hidden />}
        />
        <FilterChip
          active={filters.online}
          onClick={() => setFilters((f) => ({ ...f, online: !f.online }))}
          label={t("office.filterOnline")}
          icon={<Globe size={12} aria-hidden />}
        />
        {position &&
          ([5, 10, 25] as const).map((km) => (
            <FilterChip
              key={km}
              active={filters.maxKm === km}
              onClick={() =>
                setFilters((f) => ({ ...f, maxKm: f.maxKm === km ? 0 : km }))
              }
              label={`≤ ${km} ${t("common.km")}`}
            />
          ))}
      </div>

      {/* --- scope note --- */}
      <p className="text-[11px] leading-snug text-muted-foreground">
        {usingDistance
          ? t("geo.sortedByDistance")
          : usingArea
            ? t("geo.filteredByArea")
            : t("office.allOffices")}
      </p>

      {/* --- list --- */}
      <div className="grid gap-3">
        {providers.map((p) => (
          <div key={p.id} className="grid gap-2">
            <RouteTrace provider={p} />
            <TripTracker provider={p} serviceId={serviceId} />
            <ProviderCard
              provider={p}
              distance={
                position && !Number.isNaN(p.distanceKm)
                  ? { distanceKm: p.distanceKm, bearing: p.bearing }
                  : undefined
              }
              onServiceClick={onServiceClick}
            />
          </div>
        ))}
        {providers.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            <p>{emptyMessage(lang, emptyKind, { service: serviceName, area: areaName })}</p>
            {emptyKind === "filters" ? (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilters(DEFAULT_FILTERS)}>
                {emptyTexts(lang).clearFilters}
              </Button>
            ) : (
              <div className="mt-3 flex flex-col items-center gap-2">
                <p className="text-[12px]">{emptyTexts(lang).suggestHint}</p>
                <OfficeSuggestionForm serviceIds={serviceId ? [serviceId] : []} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-[11.5px] font-bold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-muted"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
