"use client";

import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { IconByName } from "@/components/common/icon";
import type { Service } from "@/lib/types";

/**
 * Vertical step timeline. Tap a step to expand its detail;
 * the first step starts expanded.
 */
export function StepsTab({ service }: { service: Service }) {
  const { t, pick } = useI18n();
  const reduce = useReducedMotion();
  const [expandedId, setExpandedId] = useState<string | null>(service.steps[0]?.id ?? null);

  return (
    <div>
      <h2 className="text-sm font-bold">{t("steps.title")}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("steps.hint")}</p>

      {service.steps.length > 0 ? (
        <div className="relative mt-3">
          {/* vertical guide line */}
          <span aria-hidden className="absolute bottom-2 left-[15px] top-2 w-0.5 bg-border" />
          <ol>
            {service.steps.map((step, i) => {
              const isOpen = expandedId === step.id;
              const hasDetail = Boolean(step.detail);
              return (
                <motion.li
                  key={step.id}
                  className="relative flex gap-3 pb-4 last:pb-0"
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25), ease: "easeOut" }}
                >
                  {/* marker */}
                  <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_0_3px_var(--background)]">
                    {i === 0 && !reduce ? (
                      <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                    ) : null}
                    {step.icon ? (
                      <IconByName name={step.icon} size={15} />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </span>

                  {/* content */}
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : step.id)}
                      aria-expanded={isOpen}
                      className="flex min-h-[44px] w-full items-center gap-2 text-left"
                    >
                      <span className="flex-1 text-sm font-bold leading-snug">{pick(step.title)}</span>
                      {hasDetail ? (
                        <ChevronDown
                          size={14}
                          aria-hidden
                          className={`shrink-0 text-muted-foreground transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      ) : null}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && step.detail ? (
                        <motion.div
                          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <p className="pb-1 pr-2 text-xs leading-relaxed text-muted-foreground">
                            {pick(step.detail)}
                          </p>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
