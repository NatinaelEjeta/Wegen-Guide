"use client";

import React from "react";
import { Banknote, ExternalLink } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import type { Service } from "@/lib/types";

/**
 * Fee list. Amounts that are placeholders (contain "PLACEHOLDER" or "~")
 * are highlighted with an amber chip so users know to verify at the office.
 */
export function FeesTab({ service }: { service: Service }) {
  const { t, pick } = useI18n();

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold">{t("fees.title")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("fees.hint")}</p>
      </div>

      {service.fees.length > 0 ? (
        <Card className="gap-0 py-0">
          {/* column header */}
          <div className="flex items-center justify-between px-4 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>{t("fees.item")}</span>
            <span>{t("fees.amount")}</span>
          </div>
          <ul className="px-4 pb-3">
            {service.fees.map((f) => {
              const isPlaceholder =
                f.amount.includes("PLACEHOLDER") || f.amount.includes("~");
              return (
                <li
                  key={f.id}
                  className="flex items-start justify-between gap-3 border-b py-2.5 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-snug">{pick(f.label)}</p>
                    {f.note ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {pick(f.note)}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={
                      isPlaceholder
                        ? "whitespace-nowrap rounded-full bg-[#f7c600]/20 px-2 py-0.5 text-[11px] font-extrabold text-[#6b4d0c] dark:text-[#f2d98a]"
                        : "whitespace-nowrap text-sm font-extrabold"
                    }
                  >
                    {f.amount}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Banknote size={14} className="mt-0.5 shrink-0" aria-hidden />
        <span>{t("fees.payHint")}</span>
      </p>

      {service.sourceLink ? (
        <a
          href={service.sourceLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border bg-card px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ExternalLink size={12} className="shrink-0" aria-hidden />
          <span className="break-all">{service.sourceLink}</span>
        </a>
      ) : null}
    </div>
  );
}
