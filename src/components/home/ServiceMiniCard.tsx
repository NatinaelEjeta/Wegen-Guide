"use client";

import { BadgeCheck, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { ObjectFallback } from "@/components/object/ObjectFallback";
import type { Service } from "@/lib/types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

interface ServiceMiniCardProps {
  service: Service;
}

/**
 * Compact service card used in the category grid and search results.
 * Whole card is a 44px+ tap target; navigation goes through the store.
 */
export default function ServiceMiniCard({ service }: ServiceMiniCardProps) {
  const { t, pick } = useI18n();
  const navigate = useAppStore((s) => s.navigate);

  return (
    <button
      type="button"
      onClick={() => navigate({ name: "service", serviceId: service.id })}
      aria-label={pick(service.name)}
      className={`flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 ${FOCUS_RING}`}
    >
      <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-muted/60">
        <ObjectFallback
          objectType={service.objectType}
          size="sm"
          label={pick(service.name)}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-snug">
          {pick(service.name)}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted-foreground">
          {pick(service.shortDescription)}
        </span>

        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {service.contentStatus === "pending" ? (
            <span className="rounded-full bg-[#f7c600]/20 px-2 py-0.5 text-[10px] font-bold text-[#6b4d0c]">
              {t("service.contentPending")}
            </span>
          ) : null}

          {service.usesFayda ? (
            <span
              aria-label={t("service.faydaBadge")}
              title={t("service.faydaBadge")}
              className="inline-flex items-center gap-1 rounded-full border border-[#0e7b45]/40 px-2 py-0.5 text-[#0e7b45]"
            >
              <BadgeCheck size={12} aria-hidden />
              <span className="sr-only">{t("service.faydaBadge")}</span>
            </span>
          ) : null}

          {service.canBeDoneOnline ? (
            <span
              aria-label={t("service.onlineBadge")}
              title={t("service.onlineBadge")}
              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground"
            >
              <Globe size={12} aria-hidden />
              <span className="sr-only">{t("service.onlineBadge")}</span>
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}
