"use client";

// Wegen Guide — trip tracking panel (Phase 3)
// Start trip → live distance/ETA (on-device) → arrival detection (~100 m)
// with a final document check, closing-hours warnings, optional share,
// and an always-visible "Stop tracking" button. History stays on the phone.

import React, { useState } from "react";
import {
  Bus,
  Car,
  Flag,
  Footprints,
  Loader2,
  LocateFixed,
  Navigation2,
  PartyPopper,
  Share2,
  Square,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useTripStore } from "@/lib/tripStore";
import { useGeoStore } from "@/lib/hooks/useGeolocation";
import { useAppStore } from "@/lib/store";
import { getService } from "@/lib/data";
import {
  estimateMinutes,
  formatDistance,
  mapsPlaceUrl,
  parseHours,
} from "@/lib/geo";
import type { TravelMode } from "@/lib/geo";
import { WEEKDAYS, type Provider } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function TripTracker({
  provider,
  serviceId,
}: {
  provider: Provider;
  serviceId?: string;
}) {
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const trip = useTripStore((s) => s.trip);
  const remainingKm = useTripStore((s) => s.remainingKm);
  const arrived = useTripStore((s) => s.arrived);
  const lowPower = useTripStore((s) => s.lowPower);
  const startTrip = useTripStore((s) => s.start);
  const stopTrip = useTripStore((s) => s.stop);

  const [mode, setMode] = useState<TravelMode>("walk");
  const [starting, setStarting] = useState(false);

  const isThisTrip = trip?.providerId === provider.id;

  const service = serviceId ? getService(serviceId) : undefined;
  const docs = service?.requiredDocuments ?? [];
  const checklists = useAppStore((s) => s.checklists);
  const toggleDoc = useAppStore((s) => s.toggleDoc);
  const checkedCount = docs.filter((d) => checklists[service?.id ?? ""]?.[d.id]).length;

  const handleStart = async () => {
    setStarting(true);
    try {
      // The tap on "Start trip" is the user gesture that grants location.
      const { request } = useGeoStore.getState();
      if (!useGeoStore.getState().position) {
        await request();
      }
      const pos = useGeoStore.getState().position;
      if (!pos) {
        toast({ description: t("geo.errorNote") });
        return;
      }
      startTrip(provider, serviceId, pos, mode);
    } finally {
      setStarting(false);
    }
  };

  const handleShare = async () => {
    const dest = { lat: provider.latitude, lng: provider.longitude };
    const text = `${t("trip.share")}: ${pick(provider.name)}\n${mapsPlaceUrl(dest, pick(provider.name))}`;
    try {
      if (navigator.share) await navigator.share({ title: pick(provider.name), text });
      else {
        await navigator.clipboard?.writeText(text);
        toast({ description: t("share.copied") });
      }
    } catch {
      /* cancelled */
    }
  };

  /* ---------- warnings: compare ETA with today's closing time ---------- */
  const etaWarning = (): "afterClose" | "lunch" | null => {
    if (!trip || remainingKm === null) return null;
    const now = new Date();
    const arrivalMin =
      now.getHours() * 60 + now.getMinutes() + estimateMinutes(remainingKm, trip.mode);
    const todayKey = WEEKDAYS[(now.getDay() + 6) % 7];
    const ranges = parseHours(provider.workingHours[todayKey] ?? "closed");
    if (ranges.length === 0) return null;
    for (const r of ranges) {
      if (arrivalMin >= r.startMin && arrivalMin < r.endMin) {
        // inside an open range — but flag lunch if in a gap handled below
        return null;
      }
    }
    const first = ranges[0];
    const last = ranges[ranges.length - 1];
    if (ranges.length > 1 && arrivalMin >= first.endMin && arrivalMin < last.startMin) {
      return "lunch";
    }
    return "afterClose";
  };

  const warn = etaWarning();
  const dest = { lat: provider.latitude, lng: provider.longitude };

  /* ------------------------------ idle ------------------------------ */
  if (!trip) {
    return (
      <div className="rounded-2xl border border-border bg-muted/50 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <div
            className="flex rounded-full bg-muted p-0.5"
            role="group"
            aria-label={t("office.directions")}
          >
            {(
              [
                { m: "walk" as const, icon: <Footprints size={12} aria-hidden />, label: t("trip.modeWalk") },
                { m: "drive" as const, icon: <Car size={12} aria-hidden />, label: t("trip.modeDrive") },
                { m: "transit" as const, icon: <Bus size={12} aria-hidden />, label: t("trip.modeTransit") },
              ] satisfies { m: TravelMode; icon: React.ReactNode; label: string }[]
            ).map(({ m, icon, label }) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                aria-label={label}
                onClick={() => setMode(m)}
                className={`flex h-9 items-center gap-1 rounded-full px-2.5 text-[10.5px] font-bold transition-colors ${
                  mode === m
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
          <Button
            onClick={() => void handleStart()}
            className="ml-auto h-10 gap-1.5 rounded-full px-4 text-[12px]"
            aria-label={t("trip.start")}
          >
            <LocateFixed size={15} aria-hidden />
            {t("trip.start")}
          </Button>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          {t("trip.permissionNote")}
        </p>
      </div>
    );
  }

  /* --------------------------- starting ---------------------------- */
  if (starting) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        {t("trip.starting")}
      </div>
    );
  }

  /* --------------------- another trip is active -------------------- */
  if (trip && !isThisTrip) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/60 p-2.5 text-[11.5px] text-muted-foreground">
        <Navigation2 size={13} aria-hidden />
        <span className="flex-1">{t("trip.inProgress")}</span>
        <button
          type="button"
          onClick={stopTrip}
          aria-label={t("trip.stop")}
          className="flex min-h-9 items-center rounded-full border border-border bg-card px-2.5 text-[10.5px] font-bold text-destructive hover:bg-muted"
        >
          <Square size={11} className="mr-1" aria-hidden />
          {t("trip.stop")}
        </button>
      </div>
    );
  }

  /* ------------------------- active: this office -------------------- */
  if (isThisTrip && trip) {
    const etaDate = new Date(Date.now() + estimateMinutes(remainingKm ?? 0, trip.mode) * 60_000);
    const etaText = etaDate.toLocaleTimeString(lang === "om" ? "om" : lang, {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div
        className={`rounded-2xl border p-3 ${
          arrived ? "border-primary bg-primary/5" : "border-border bg-muted/50"
        }`}
        aria-live="polite"
      >
        {!arrived ? (
          <>
            <div className="flex items-center gap-2 text-[12.5px] font-bold text-foreground">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
              {t("trip.tracking")}
              {remainingKm !== null && !Number.isNaN(remainingKm) ? (
                <span className="ml-auto flex items-center gap-1 text-primary">
                  <Navigation2
                    size={12}
                    aria-hidden
                    style={{
                      transform: `rotate(${bearingTo(provider, useTripStore.getState().current)}deg)`,
                    }}
                  />
                  {formatDistance(remainingKm, t)}
                </span>
              ) : null}
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
              <span>
                {t("trip.eta")}: <strong className="text-foreground">{etaText}</strong>
              </span>
              {warn === "afterClose" && (
                <span className="font-semibold text-destructive">⚠ {t("trip.afterClose")}</span>
              )}
              {warn === "lunch" && (
                <span className="font-semibold text-[#b7791f]">⚠ {t("trip.lunchWarning")}</span>
              )}
            </div>
            {lowPower && (
              <p className="mt-1 text-[10.5px] text-muted-foreground">{t("trip.lowBattery")}</p>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <PartyPopper size={18} className="shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-[13px] font-extrabold text-primary">{t("trip.arrived")}</p>
              <p className="text-[11px] leading-snug text-muted-foreground">{t("trip.arrivedMsg")}</p>
            </div>
          </div>
        )}

        {/* final document check on arrival */}
        {arrived && docs.length > 0 && service && (
          <div className="mt-2.5 rounded-xl border border-border bg-card p-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold">
              <Flag size={12} aria-hidden />
              {t("service.documentsTitle")} — {checkedCount}/{docs.length}
            </p>
            <ul className="space-y-1.5">
              {docs.map((d) => (
                <li key={d.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`trip-${d.id}`}
                    checked={!!checklists[service.id]?.[d.id]}
                    onCheckedChange={() => toggleDoc(service.id, d.id)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor={`trip-${d.id}`}
                    className="cursor-pointer text-[11.5px] leading-snug"
                  >
                    {pick(d.text)}
                    {d.optional ? (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ({t("service.optional")})
                      </span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* actions: share + stop — Stop is always reachable */}
        <div className="mt-2.5 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10 flex-1 gap-1.5 rounded-xl"
            onClick={() => void handleShare()}
          >
            <Share2 size={14} aria-hidden />
            {t("trip.share")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="h-10 flex-1 gap-1.5 rounded-xl"
            onClick={stopTrip}
            aria-label={t("trip.stop")}
          >
            <Square size={12} aria-hidden />
            {t("trip.stop")}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

/** Bearing from the live position to the office (for the compass arrow). */
function bearingTo(provider: Provider, from: { lat: number; lng: number } | null): number {
  if (!from) return 0;
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (provider.latitude * Math.PI) / 180;
  const Δλ = ((provider.longitude - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
