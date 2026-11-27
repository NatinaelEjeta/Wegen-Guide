"use client";

// Wegen Guide — "Offices near me" screen (Phase 2)
// Device location (tap-to-ask) or manual region → zone → woreda selection,
// distance computed on-device (works offline), lazy embedded map on capable
// devices, Google Maps deep links everywhere else.

import React from "react";
import { TriangleAlert } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { NearestOffices } from "@/components/offices/NearestOffices";
import { OfficeSuggestionForm } from "@/components/offices/OfficeSuggestionForm";
import { Disclaimer } from "@/components/common/OfflineBanner";

export function OfficesView() {
  const { t } = useI18n();
  const navigate = useAppStore((s) => s.navigate);

  return (
    <div className="mx-auto max-w-xl px-4 pb-8 pt-4">
      <h1 className="text-xl font-bold">{t("nav.offices")}</h1>
      <p className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-snug text-muted-foreground">
        <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
        {t("office.disclaimerShort")}
      </p>

      <div className="mt-4">
        <NearestOffices onServiceClick={(serviceId) => navigate({ name: "service", serviceId })} />
      </div>

      <div className="mt-4">
        <OfficeSuggestionForm />
      </div>

      <div className="mt-4">
        <Disclaimer />
        <p className="mt-2 text-[10px] text-muted-foreground">Area names: OCHA Ethiopia / CSA / BoFED (CC BY-IGO)</p>
      </div>
    </div>
  );
}
