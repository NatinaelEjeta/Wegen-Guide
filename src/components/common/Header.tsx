"use client";

import React from "react";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { LanguageDialog } from "@/components/common/LanguageDialog";

/** Brand mark: map pin + checklist. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect x="1" y="1" width="38" height="38" rx="11" fill="var(--et-green)" />
      <path
        d="M20 8c-4.6 0-8.4 3.7-8.4 8.3 0 6.1 8.4 15.2 8.4 15.2s8.4-9.1 8.4-15.2C28.4 11.7 24.6 8 20 8Z"
        fill="#fff"
      />
      <path
        d="M15.8 16.6l2.6 2.6 5.2-5.2"
        stroke="var(--et-green)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="8" y="31.5" width="24" height="3" rx="1.5" fill="var(--et-yellow)" />
    </svg>
  );
}

export function Header() {
  const { t } = useI18n();
  const viewStack = useAppStore((s) => s.viewStack);
  const back = useAppStore((s) => s.back);
  const resetToHome = useAppStore((s) => s.resetToHome);
  const view = viewStack[viewStack.length - 1] ?? { name: "home" };
  const canGoBack = viewStack.length > 1;

  return (
    <header
      className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md"
      role="banner"
    >
      <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-3">
        {canGoBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={back}
            aria-label={t("nav.back")}
            className="size-10 rounded-full"
          >
            <ArrowLeft size={20} aria-hidden />
          </Button>
        ) : null}
        <button
          type="button"
          onClick={resetToHome}
          className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-1 text-left"
          aria-label={t("nav.home")}
        >
          <LogoMark />
          <span className="leading-tight">
            <span className="block text-[15px] font-bold">{t("app.name")}</span>
            <span className="hidden truncate text-[11px] font-medium text-muted-foreground sm:block">
              {t("app.tagline")}
            </span>
          </span>
        </button>
        <LanguageDialog />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => useAppStore.getState().navigate({ name: "settings" })}
          aria-label={t("nav.settings")}
          className="size-10 rounded-full"
        >
          <Settings size={19} aria-hidden />
        </Button>
      </div>
    </header>
  );
}
