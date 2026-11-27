"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { getCategory, getServicesByCategory } from "@/lib/data";
import { IconByName } from "@/components/common/icon";
import ServiceMiniCard from "@/components/home/ServiceMiniCard";
import type { CategoryId, ServiceCategory } from "@/lib/types";

/** Static tint classes for the category icon chip (kept literal for Tailwind). */
const TINT_CHIP: Record<ServiceCategory["tint"], string> = {
  green: "bg-[#0e7b45]/12 text-[#0e7b45]",
  amber: "bg-[#f7c600]/18 text-[#8a6d00]",
  red: "bg-[#c8102e]/12 text-[#c8102e]",
  stone: "bg-stone-500/12 text-stone-600",
  teal: "bg-teal-600/12 text-teal-700",
  orange: "bg-orange-600/12 text-orange-700",
  lime: "bg-lime-600/15 text-lime-700",
};

/** Fade-up entrance wrapper; skipped entirely under reduced motion. */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-16px" }}
      transition={{ duration: 0.28, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export default function CategoryView({ categoryId }: { categoryId: CategoryId }) {
  const { t, pick } = useI18n();
  const category = getCategory(categoryId);
  const services = getServicesByCategory(categoryId);

  if (!category) {
    return (
      <section className="mx-auto max-w-xl px-4 pb-8 pt-4">
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          {t("home.noResults")}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 pb-8 pt-4">
      {/* Header */}
      <Reveal>
        <div className="flex items-center gap-3">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${TINT_CHIP[category.tint]}`}
          >
            <IconByName name={category.icon} size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-tight">
              {pick(category.name)}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("common.serviceCount", { count: services.length })}
            </p>
          </div>
        </div>
      </Reveal>

      {/* Service grid */}
      {services.length === 0 ? (
        <Reveal className="mt-4">
          <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
            {t("home.noResults")}
          </div>
        </Reveal>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {services.map((s, i) => (
            <Reveal key={s.id} delay={Math.min(i * 0.05, 0.25)}>
              <ServiceMiniCard service={s} />
            </Reveal>
          ))}
        </div>
      )}
    </section>
  );
}

/** Named alias — the app shell imports this style. */
export { CategoryView };
