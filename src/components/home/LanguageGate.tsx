"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, WifiOff } from "lucide-react";
import { LogoMark } from "@/components/common/Header";
import { ObjectFallback } from "@/components/object/ObjectFallback";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { LANGS, LANG_LABELS, type Lang } from "@/lib/types";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/**
 * First-run language chooser. Shown by the shell while !langChosen.
 * Full screen, centered, with large tap targets for first-time
 * smartphone users.
 */
export default function LanguageGate() {
  const { t } = useI18n();
  const setLang = useAppStore((s) => s.setLang);
  const setLangChosen = useAppStore((s) => s.setLangChosen);
  const reduce = useReducedMotion();

  const choose = (l: Lang) => {
    setLang(l);
    setLangChosen(true);
  };

  return (
    <main
      aria-label={t("gate.title")}
      className="flex min-h-dvh w-full flex-col items-center justify-center bg-background px-6 py-10"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        <LogoMark size={64} />
        <p className="mt-3 text-xl font-bold">{t("app.name")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("app.tagline")}</p>

        {/* Soft decorative container for the animated object */}
        <div className="mt-2 w-full rounded-3xl border border-border bg-card/70 p-4 shadow-sm">
          <ObjectFallback
            objectType="holographic-card"
            size="md"
            className="mx-auto my-4"
          />
        </div>

        <h1 className="mt-2 text-2xl font-extrabold">{t("gate.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("gate.subtitle")}</p>

        <div
          role="group"
          aria-label={t("gate.choose")}
          className="mt-6 w-full"
        >
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => choose(l)}
              aria-label={LANG_LABELS[l]}
              className={`mt-3 flex min-h-14 w-full items-center justify-between rounded-2xl border border-border bg-card px-5 text-base font-semibold transition-colors first:mt-0 hover:bg-muted ${FOCUS_RING}`}
            >
              <span>{LANG_LABELS[l]}</span>
              <ChevronRight size={18} aria-hidden className="text-muted-foreground" />
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <WifiOff size={14} aria-hidden />
          <span>{t("gate.offlineNote")}</span>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          {t("gate.hint")}
        </p>
      </motion.div>
    </main>
  );
}

/** Named alias — the app shell imports this style. */
export { LanguageGate };
