"use client";

import React, { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppStore, useCurrentView } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useVisualMode } from "@/lib/hooks/useDeviceCapability";
import { Header, LogoMark } from "@/components/common/Header";
import { Footer } from "@/components/common/Footer";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { LanguageGate } from "@/components/home/LanguageGate";
import { HomeView } from "@/components/home/HomeView";
import { CategoryView } from "@/components/home/CategoryView";
import { ServiceView } from "@/components/service/ServiceView";
import { SettingsView } from "@/components/settings/SettingsView";
import { PrivacyView } from "@/components/settings/PrivacyView";
import { AdminView } from "@/components/admin/AdminView";
import { OfficesView } from "@/components/common/OfficesView";

const emptySubscribe = () => () => {};
const hydrateSnapshot = () => true;
const serverSnapshot = () => false;

/**
 * Client-side view router (the PWA is a single route: /).
 * Handles: first-run language gate, header/footer, offline banner,
 * browser/hardware back button, theme + accessibility classes.
 */
export function AppShell() {
  // Wait for the persisted store to hydrate (avoids SSR mismatch)
  const mounted = useSyncExternalStore(emptySubscribe, hydrateSnapshot, serverSnapshot);
  const langChosen = useAppStore((s) => s.langChosen);
  const lang = useAppStore((s) => s.lang);
  const view = useCurrentView();
  const stackLen = useAppStore((s) => s.viewStack.length);
  const back = useAppStore((s) => s.back);
  const { t } = useI18n();
  const { osReducedMotion, pref } = useVisualMode();
  const prevLen = useRef(stackLen);

  // Apply accessibility / theme classes after hydration
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    html.classList.toggle("wg-large-text", useAppStore.getState().largeText);
    html.classList.toggle("dark", useAppStore.getState().darkMode);
    const reduce = pref === "reduced" || (pref === "auto" && osReducedMotion);
    html.classList.toggle("wg-reduce-motion", reduce);
  }, [mounted, pref, osReducedMotion, view]);

  // Sync html lang for screen readers
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = lang === "om" ? "om" : lang;
  }, [mounted, langChosen, lang]);

  // Browser/hardware back button integration:
  // push a history entry when the stack grows, pop view on popstate.
  useEffect(() => {
    if (!mounted) return;
    if (stackLen > prevLen.current) {
      try {
        window.history.pushState({ wg: true }, "");
      } catch {
        /* noop */
      }
    }
    prevLen.current = stackLen;
  }, [mounted, stackLen]);

  useEffect(() => {
    const onPop = () => {
      if (useAppStore.getState().viewStack.length > 1) back();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mounted, back]);

  const renderView = () => {
    switch (view.name) {
      case "home":
        return <HomeView />;
      case "category":
        return <CategoryView categoryId={view.categoryId} />;
      case "service":
        return <ServiceView serviceId={view.serviceId} initialTab={view.tab} />;
      case "offices":
        return <OfficesView />;
      case "settings":
        return <SettingsView />;
      case "privacy":
        return <PrivacyView />;
      case "admin":
        return <AdminView />;
      default:
        return <HomeView />;
    }
  };

  if (!mounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
        <LogoMark size={56} />
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      </div>
    );
  }

  if (!langChosen) {
    return (
      <div className="min-h-screen bg-background">
        <ServiceWorkerRegister />
        <LanguageGate />
      </div>
    );
  }

  const viewKey = `${view.name}:${"serviceId" in view ? view.serviceId : ""}:${"categoryId" in view ? view.categoryId : ""}`;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ServiceWorkerRegister />
      <Header />
      <OfflineBanner />
      <main role="main" className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <span className="sr-only">{t("app.name")}</span>
    </div>
  );
}
