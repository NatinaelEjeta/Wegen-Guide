"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { LANG_LABELS, LANGS, type Lang } from "@/lib/types";

/** Big, forgiving language chooser — reachable from header & settings. */
export function LanguageDialog({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const { t } = useI18n();
  const setLang = useAppStore((s) => s.setLang);
  const lang = useAppStore((s) => s.lang);

  const choose = (l: Lang) => {
    setLang(l);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button
            variant="outline"
            size="sm"
            aria-label={t("nav.language")}
            className="h-10 gap-1.5 rounded-full px-3 font-semibold"
          >
            <Languages size={16} aria-hidden />
            <span className="text-sm">{LANG_LABELS[lang]}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-3xl p-5" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="text-lg">{t("gate.choose")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2.5">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => choose(l)}
              className={`flex min-h-14 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-base font-semibold transition-colors ${
                lang === l
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:bg-muted"
              }`}
              aria-pressed={lang === l}
            >
              <span>{LANG_LABELS[l]}</span>
              {lang === l && (
                <span className="inline-block size-2.5 rounded-full bg-primary" aria-hidden />
              )}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground">{t("gate.hint")}</p>
      </DialogContent>
    </Dialog>
  );
}
