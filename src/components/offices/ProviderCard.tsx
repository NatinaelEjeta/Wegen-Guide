"use client";

// Wegen Guide — shared office/provider card (Phase 2)
// Used by the "Offices near me" screen and the per-service Office tab.
// Shows distance + compass (on-device Haversine, works offline), live status
// from providers.json hours, and Google Maps deep links (no API key needed).

import React from "react";
import {
  Accessibility,
  Bus,
  Car,
  Clock,
  ExternalLink,
  Footprints,
  MapPin,
  Navigation2,
  Phone,
  Share2,
  Volume2,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSpeech } from "@/lib/hooks/useSpeech";
import { useToast } from "@/hooks/use-toast";
import { buildProviderText } from "@/lib/voice";
import {
  compassKey,
  formatDistance,
  getOfficeStatus,
  mapsDirectionsUrl,
  mapsPlaceUrl,
} from "@/lib/geo";
import type { TravelMode } from "@/lib/geo";
import { getService } from "@/lib/data";
import type { Provider } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ProviderDistance {
  distanceKm: number;
  bearing: number;
}

export function ProviderCard({
  provider: p,
  distance,
  onServiceClick,
}: {
  provider: Provider;
  distance?: ProviderDistance;
  /** when set, service chips become clickable (offices list view) */
  onServiceClick?: (serviceId: string) => void;
}) {
  const { t, pick, lang } = useI18n();
  const { toast } = useToast();
  const { speak, stop, speaking, supported } = useSpeech();

  const status = getOfficeStatus(p);

  const spokenText = buildProviderText(p, lang, {
    hours: t("office.workingHours"),
    phone: t("office.address") + " / " + t("common.call"),
    landmark: t("office.landmark"),
  });

  const dest = { lat: p.latitude, lng: p.longitude };

  const handleShare = async () => {
    const text = `${pick(p.name)}\n${pick(p.address)}\n${t("common.call")}: ${p.phone}\n${t("office.openInMaps")}: ${mapsPlaceUrl(dest, pick(p.name))}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: pick(p.name), text });
      } else {
        await navigator.clipboard?.writeText(text);
        toast({ description: t("share.copied") });
      }
    } catch {
      try {
        await navigator.clipboard?.writeText(text);
        toast({ description: t("share.copied") });
      } catch {
        /* user cancelled or clipboard unavailable */
      }
    }
  };

  const statusBadge = () => {
    switch (status.key) {
      case "open":
        return (
          <Badge variant="default" className="text-[10px]">
            {status.onLunchBreak ? t("office.lunch") : t("officeStatus.open")}
          </Badge>
        );
      case "closing_soon":
        return (
          <Badge className="bg-[#b7791f] text-white text-[10px]">
            {t("officeStatus.closingSoon")}
          </Badge>
        );
      case "temporarily_closed":
        return (
          <Badge variant="outline" className="border-destructive/50 text-[10px] text-destructive">
            {t("officeStatus.temporarily_closed")}
          </Badge>
        );
      case "hours_unknown":
        return (
          <Badge variant="outline" className="text-[10px]">
            {t("office.hoursUnconfirmed")}
          </Badge>
        );
      case "moved":
        return (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-[10px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
          >
            {t("officeStatus.moved")}
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="text-[10px]">
            {t("officeStatus.closed")}
          </Badge>
        );
    }
  };

  const travelButtons: { mode: TravelMode; icon: React.ReactNode; label: string }[] = [
    { mode: "walk", icon: <Footprints className="size-3.5" aria-hidden />, label: t("trip.modeWalk") },
    { mode: "drive", icon: <Car className="size-3.5" aria-hidden />, label: t("trip.modeDrive") },
    { mode: "transit", icon: <Bus className="size-3.5" aria-hidden />, label: t("trip.modeTransit") },
  ];

  return (
    <Card className="gap-0 p-4">
      {/* header */}
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MapPin size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-bold leading-snug">{pick(p.name)}</h3>
            {p.source === "community-suggestion" ? (
              <Badge variant="outline" className="text-[10px]">
                {t("office.unverifiedBadge")}
              </Badge>
            ) : null}
            {p.isSample ? (
              <Badge variant="outline" className="text-[10px]">
                {t("office.sampleBadge")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{t(`providerType.${p.type}`)}</p>
        </div>
        {distance ? (
          <div
            className="flex shrink-0 flex-col items-center rounded-xl bg-primary/10 px-2.5 py-1.5 text-primary"
            title={t("office.distance")}
          >
            <span className="text-[13px] font-extrabold leading-none">
              {formatDistance(distance.distanceKm, t)}
            </span>
            <span className="mt-1 flex items-center gap-1 text-[9.5px] font-semibold leading-none">
              <Navigation2
                size={10}
                aria-hidden
                style={{ transform: `rotate(${distance.bearing}deg)` }}
              />
              {t(`geo.dir.${compassKey(distance.bearing)}`)}
            </span>
          </div>
        ) : null}
      </div>

      {/* status + today's hours */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {statusBadge()}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock size={11} className="shrink-0" aria-hidden />
          {t(`weekday.${status.todayKey}`)}:{" "}
          {status.todayHours === "closed" ? t("office.closed") : status.todayHours.trim() === "" ? t("office.hoursUnconfirmed") : status.todayHours}
        </span>
      </div>

      {/* address + landmark */}
      <p className="mt-2 text-xs leading-snug text-muted-foreground">
        {pick(p.address)} · {t("office.landmark")}: {pick(p.landmark)}
      </p>

      {/* busy days + accessibility */}
      <div className="mt-2 space-y-1.5">
        {p.typicalBusyDays.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{t("office.busyDays")}</span>
            {p.typicalBusyDays.map((d) => (
              <span
                key={d}
                className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground"
              >
                {t(`weekday.${d}Short`)}
              </span>
            ))}
          </div>
        ) : null}
        {p.accessibility.includes("wheelchair_access") ? (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Accessibility size={12} className="shrink-0" aria-hidden />
            {t("office.wheelchair")}
          </div>
        ) : null}
      </div>

      {/* actions */}
      <div className="mt-3 flex items-center gap-2 border-t pt-3">
        <Button asChild size="sm" className="gap-1 rounded-full">
          <a href={`tel:${p.phone.replace(/[^+\d]/g, "")}`}>
            <Phone className="size-3.5" aria-hidden />
            {t("common.call")}
          </a>
        </Button>
        {supported ? (
          <button
            type="button"
            onClick={() => (speaking ? stop() : speak(spokenText))}
            aria-label={speaking ? t("service.voiceStop") : t("service.voiceRead")}
            className={`flex size-9 shrink-0 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-accent ${
              speaking ? "wg-voice-speaking" : ""
            }`}
          >
            <Volume2 size={15} aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void handleShare();
          }}
          aria-label={t("common.share")}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border bg-card text-foreground transition-colors hover:bg-accent"
        >
          <Share2 size={15} aria-hidden />
        </button>
      </div>

      {/* travel modes + open in google maps */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {travelButtons.map(({ mode, icon, label }) => (
          <a
            key={mode}
            href={mapsDirectionsUrl(dest, mode)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${t("office.directions")} — ${label}`}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border bg-card text-[11px] font-bold text-foreground transition-colors hover:bg-muted"
          >
            {icon}
            {label}
          </a>
        ))}
      </div>
      <a
        href={mapsPlaceUrl(dest, pick(p.name))}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 flex h-10 items-center justify-center gap-1.5 rounded-xl bg-secondary text-[11.5px] font-bold text-secondary-foreground transition-colors hover:bg-secondary/80"
      >
        <ExternalLink size={13} aria-hidden />
        {t("office.openInMaps")}
      </a>

      {/* service chips (offices list only) */}
      {onServiceClick && p.serviceIds.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {p.serviceIds.slice(0, 4).map((sid) => {
            const svc = getService(sid);
            return (
              <button
                key={sid}
                type="button"
                onClick={() => onServiceClick(sid)}
                className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-[11px] font-semibold hover:bg-muted"
              >
                {svc ? pick(svc.name) : sid}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="mt-2 text-[10px] text-muted-foreground">
        {p.source === "community-suggestion" ? t("office.hoursUnconfirmed") : `${t("office.verified")}: ${p.verifiedDate}`}
      </p>
    </Card>
  );
}
