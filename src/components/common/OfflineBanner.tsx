"use client";

import React from "react";
import { AlertTriangle, ShieldAlert, WifiOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useOnline } from "@/lib/hooks/useOnline";

/** Amber banner shown under the header when the user is offline. */
export function OfflineBanner() {
  const { t } = useI18n();
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-200"
    >
      <p className="mx-auto flex max-w-xl items-center gap-2">
        <WifiOff size={16} className="shrink-0" aria-hidden />
        {t("offline.banner")}
      </p>
    </div>
  );
}

/**
 * The standing accuracy disclaimer. Used on every service and office
 * screen together with the lastVerified date.
 */
export function Disclaimer({ lastVerified }: { lastVerified?: string }) {
  const { t } = useI18n();
  return (
    <div
      role="note"
      className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-[12.5px] leading-snug text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1">
        <p>{t("service.disclaimer")}</p>
        {lastVerified ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold opacity-80">
            <ShieldAlert size={12} aria-hidden />
            {t("service.lastVerified")}: {lastVerified}
          </p>
        ) : null}
      </div>
    </div>
  );
}
