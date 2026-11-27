"use client";

// Office tab: offices that provide this service, sorted by distance from the
// user's location (on-device Haversine) with the shared Phase-2 map/list.

import React from "react";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { NearestOffices } from "@/components/offices/NearestOffices";

export function OfficeTab({ serviceId }: { serviceId: string }) {
  const { t } = useI18n();
  const navigate = useAppStore((s) => s.navigate);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold">{t("office.title")}</h2>
      <NearestOffices
        serviceId={serviceId}
        onServiceClick={(sid) => navigate({ name: "service", serviceId: sid })}
      />
    </div>
  );
}
