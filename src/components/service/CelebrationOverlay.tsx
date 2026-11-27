"use client";

import React, { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const CONFETTI_COLORS = ["#0e7b45", "#f7c600", "#c8102e", "#e3b341", "#3f8f6b"];
const PIECE_COUNT = 24;

interface CelebrationOverlayProps {
  open: boolean;
  onClose: () => void;
  onFindOffice: () => void;
}

/**
 * Full-screen celebration shown when the checklist reaches 100%.
 * Confetti pieces are generated client-side only (overlay is never
 * rendered during SSR because it starts closed).
 */
export function CelebrationOverlay({ open, onClose, onFindOffice }: CelebrationOverlayProps) {
  const { t } = useI18n();
  const reduce = useReducedMotion();

  const pieces = useMemo(() => {
    if (!open || reduce) return [];
    return Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      left: Math.round(Math.random() * 100),
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      duration: 2.2 + Math.random() * 1.4,
      delay: Math.random() * 0.5,
    }));
  }, [open, reduce]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="celebration-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
        >
          {pieces.map((p) => (
            <span
              key={p.id}
              className="wg-confetti-piece"
              style={{
                left: `${p.left}%`,
                backgroundColor: p.color,
                animationDuration: `${p.duration.toFixed(2)}s`,
                animationDelay: `${p.delay.toFixed(2)}s`,
              }}
            />
          ))}

          <motion.div
            className="w-full max-w-xs rounded-3xl border bg-card p-6 text-center shadow-xl"
            initial={reduce ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { scale: 1, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 22 }}
          >
            <motion.div
              className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground"
              initial={reduce ? false : { scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.05 }}
            >
              <Check size={32} aria-hidden />
            </motion.div>
            <h2 className="mt-3 text-xl font-extrabold">{t("celebration.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("celebration.subtitle")}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={onFindOffice}>{t("celebration.cta")}</Button>
              <Button variant="ghost" onClick={onClose}>
                {t("celebration.dismiss")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
