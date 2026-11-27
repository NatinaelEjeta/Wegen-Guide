"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { isServiceWorkerActive } from "@/components/pwa/ServiceWorkerRegister";
/**
 * Sticky footer: stays at the bottom of the viewport on short pages
 * (mt-auto in a min-h-screen flex column) and is pushed down naturally
 * when content is long.
 */
export function Footer() {
  const { t } = useI18n();
  const navigate = useAppStore((s) => s.navigate);

  return (
    <footer
      role="contentinfo"
      className="mt-auto border-t border-border/70 bg-secondary/60"
    >
      <div className="mx-auto max-w-xl px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3">
        <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden />
          {t("footer.disclaimer")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => navigate({ name: "privacy" })}
          >
            {t("footer.privacy")}
          </button>
          <span aria-hidden className="text-border">|</span>
          <button
            type="button"
            className="underline-offset-2 hover:underline"
            onClick={() => navigate({ name: "admin" })}
          >
            {t("nav.admin")}
          </button>
          <span aria-hidden className="text-border">|</span>
          {isServiceWorkerActive() && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              {t("home.offlineChip")}
            </span>
          )}
          <span className="ml-auto text-muted-foreground">{t("app.version")} 0.3 · Phase 2–3</span>
        </div>
      </div>
    </footer>
  );
}
