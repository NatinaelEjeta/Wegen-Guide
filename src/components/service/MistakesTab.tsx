"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Service } from "@/lib/types";

export function MistakesTab({ service }: { service: Service }) {
  const { t, pick } = useI18n();

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-bold">{t("mistakes.title")}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("mistakes.hint")}</p>
      </div>

      {service.commonMistakes.length > 0 ? (
        <ul className="space-y-2">
          {service.commonMistakes.map((m) => (
            <li
              key={m.id}
              className="flex items-start gap-2.5 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/40"
            >
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              <p className="text-sm leading-snug">{pick(m.text)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
