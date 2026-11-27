"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import {
  POPULAR_IDS,
  countServicesByCategory,
  getCategories,
  getService,
  searchServices,
} from "@/lib/data";
import { useVisualMode } from "@/lib/hooks/useDeviceCapability";
import { IconByName } from "@/components/common/icon";
import { ObjectFallback } from "@/components/object/ObjectFallback";
import { ServiceObject3D } from "@/components/three/ServiceObject3D";
import ServiceMiniCard from "@/components/home/ServiceMiniCard";
import { Input } from "@/components/ui/input";
import type { Service, ServiceCategory } from "@/lib/types";

/** Static tint classes for category icon chips (kept literal for Tailwind). */
const TINT_CHIP: Record<ServiceCategory["tint"], string> = {
  green: "bg-[#0e7b45]/12 text-[#0e7b45]",
  amber: "bg-[#f7c600]/18 text-[#8a6d00]",
  red: "bg-[#c8102e]/12 text-[#c8102e]",
  stone: "bg-stone-500/12 text-stone-600",
  teal: "bg-teal-600/12 text-teal-700",
  orange: "bg-orange-600/12 text-orange-700",
  lime: "bg-lime-600/15 text-lime-700",
};

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

/** Crossfades the featured card text when the rotation advances. */
function FadeSwap({
  swapKey,
  reduce,
  children,
}: {
  swapKey: string;
  reduce: boolean;
  children: ReactNode;
}) {
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      key={swapKey}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export default function HomeView() {
  const { t, pick } = useI18n();
  const navigate = useAppStore((s) => s.navigate);
  const { mode3d } = useVisualMode();
  const reduce = useReducedMotion();

  const [q, setQ] = useState("");
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [tabVisible, setTabVisible] = useState(true);

  // Track tab visibility so the rotation pauses in the background.
  useEffect(() => {
    const onVis = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Rotate the featured service every 4.5s — only in 3D mode with a visible tab.
  useEffect(() => {
    if (!mode3d || !tabVisible) return;
    const id = setInterval(
      () => setFeaturedIndex((i) => (i + 1) % POPULAR_IDS.length),
      4500
    );
    return () => clearInterval(id);
  }, [mode3d, tabVisible]);

  const popular = useMemo(
    () =>
      POPULAR_IDS.map((id) => getService(id)).filter(
        (s): s is Service => Boolean(s)
      ),
    []
  );
  const categories = useMemo(() => getCategories(), []);

  const featured =
    popular.length > 0 ? popular[featuredIndex % popular.length] : undefined;
  const openFeatured = featured
    ? () => navigate({ name: "service", serviceId: featured.id })
    : undefined;

  const trimmed = q.trim();
  const searching = trimmed.length >= 2;
  const results = searching ? searchServices(trimmed) : null;

  return (
    <div className="mx-auto max-w-xl px-4 pb-8 pt-4">
      {/* 1. Search */}
      <Reveal>
        <div className="relative">
          <Search
            size={18}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("home.searchPlaceholder")}
            aria-label={t("home.searchPlaceholder")}
            className="h-12 rounded-2xl pl-9 text-base md:text-base"
          />
        </div>
      </Reveal>

      {searching && results !== null ? (
        <section aria-label={t("home.searchResults")} className="mt-5">
          <Reveal>
            <h2 className="text-sm font-bold">{t("home.searchResults")}</h2>
            {results.length === 0 ? (
              <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
                {t("home.noResults")}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {results.map((s) => (
                  <ServiceMiniCard key={s.id} service={s} />
                ))}
              </div>
            )}
          </Reveal>
        </section>
      ) : (
        <>
          {/* 2. Greeting */}
          <Reveal className="mt-5">
            <h1 className="text-xl font-bold">{t("home.welcome")}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("home.subtitle")}
            </p>
          </Reveal>

          {/* 3. Featured 3D hero card */}
          {featured && openFeatured ? (
            <Reveal className="mt-4">
              <button
                type="button"
                onClick={openFeatured}
                aria-label={pick(featured.name)}
                className={`relative block w-full overflow-hidden rounded-3xl border border-border bg-card text-left shadow-sm transition-shadow hover:shadow-md ${FOCUS_RING}`}
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-primary/15 via-transparent to-[#f7c600]/20"
                />
                <div className="relative px-4 pt-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f7c600] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#3f3000]">
                    <Sparkles size={11} aria-hidden />
                    {t("home.featured")}
                  </span>
                </div>
                <div className="relative">
                  <ServiceObject3D
                    objectType={featured.objectType}
                    size="lg"
                    onActivate={openFeatured}
                    label={pick(featured.name)}
                  />
                </div>
                <div className="relative p-4 pt-2">
                  <FadeSwap swapKey={featured.id} reduce={Boolean(reduce)}>
                    <span className="block text-base font-bold leading-snug">
                      {pick(featured.name)}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-muted-foreground">
                      {pick(featured.shortDescription)}
                    </span>
                  </FadeSwap>
                </div>
              </button>
            </Reveal>
          ) : null}

          {/* 4. Popular strip */}
          <section aria-label={t("home.popular")} className="mt-6">
            <Reveal>
              <h2 className="text-sm font-bold">{t("home.popular")}</h2>
            </Reveal>
            <div className="-mx-4 mt-3 flex gap-3 px-4 pb-2 wg-scroll-x">
              {popular.map((s, i) => (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => navigate({ name: "service", serviceId: s.id })}
                  aria-label={pick(s.name)}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(i * 0.04, 0.2),
                    ease: "easeOut",
                  }}
                  className={`relative min-w-[8.5rem] shrink-0 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:bg-muted/50 ${FOCUS_RING}`}
                >
                  <span className="flex h-24 items-center justify-center">
                    <ObjectFallback
                      objectType={s.objectType}
                      size="sm"
                      className="mx-auto"
                      label={pick(s.name)}
                    />
                  </span>
                  <span className="mt-2 line-clamp-2 block text-xs font-bold leading-snug">
                    {pick(s.name)}
                  </span>
                  {s.usesFayda ? (
                    <span
                      role="img"
                      aria-label={t("service.faydaBadge")}
                      title={t("service.faydaBadge")}
                      className="absolute right-2 top-2 size-2.5 rounded-full bg-[#0e7b45]"
                    >
                      <span className="sr-only">{t("service.faydaBadge")}</span>
                    </span>
                  ) : null}
                </motion.button>
              ))}
            </div>
          </section>

          {/* 5. Categories grid */}
          <section aria-label={t("home.categories")} className="mt-6">
            <Reveal>
              <h2 className="text-sm font-bold">{t("home.categories")}</h2>
            </Reveal>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {categories.map((c, i) => (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => navigate({ name: "category", categoryId: c.id })}
                  aria-label={pick(c.name)}
                  initial={reduce ? false : { opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(i * 0.03, 0.18),
                    ease: "easeOut",
                  }}
                  className={`flex min-h-24 w-full flex-col items-start rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 ${FOCUS_RING}`}
                >
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${TINT_CHIP[c.tint]}`}
                  >
                    <IconByName name={c.icon} size={20} />
                  </span>
                  <span className="mt-2 block text-sm font-bold leading-snug">
                    {pick(c.name)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {t("common.serviceCount", {
                      count: countServicesByCategory(c.id),
                    })}
                  </span>
                </motion.button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/** Named alias — the app shell imports this style. */
export { HomeView };
