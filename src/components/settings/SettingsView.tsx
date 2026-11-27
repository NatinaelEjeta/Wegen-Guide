"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, Database, Github, Info, Languages, Moon, Palette, ShieldCheck, Trash2, Vibrate, Wifi, WifiOff, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useOnline } from "@/lib/hooks/useOnline";
import { getProvider } from "@/lib/data";
import { LanguageDialog } from "@/components/common/LanguageDialog";
import {
  getLastContentUpdate,
  isServiceWorkerActive,
} from "@/components/pwa/ServiceWorkerRegister";
import type { AnimationPref } from "@/lib/types";
import { LANG_LABELS } from "@/lib/types";

function Row({
  icon,
  title,
  desc,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        {desc ? <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{desc}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function SettingsView() {
  const { t } = useI18n();
  const { toast } = useToast();
  const online = useOnline();
  const lang = useAppStore((s) => s.lang);
  const animationPref = useAppStore((s) => s.animationPref);
  const setAnimationPref = useAppStore((s) => s.setAnimationPref);
  const largeText = useAppStore((s) => s.largeText);
  const setLargeText = useAppStore((s) => s.setLargeText);
  const darkMode = useAppStore((s) => s.darkMode);
  const setDarkMode = useAppStore((s) => s.setDarkMode);
  const reminders = useAppStore((s) => s.reminders);
  const removeReminder = useAppStore((s) => s.removeReminder);
  const resetAll = useAppStore((s) => s.resetAll);
  const tripHistory = useAppStore((s) => s.tripHistory);
  const clearTrips = useAppStore((s) => s.clearTrips);
  const navigate = useAppStore((s) => s.navigate);
  const pickName = (v: { am: string; om: string; en: string }) => v[lang] || v.en || v.am;
  const [lastUpdate, setLastUpdate] = useState<number | null>(() =>
    typeof window === "undefined" ? null : getLastContentUpdate()
  );

  useEffect(() => {
    const onUpdate = () => setLastUpdate(getLastContentUpdate());
    window.addEventListener("wg-content-saved", onUpdate);
    return () => window.removeEventListener("wg-content-saved", onUpdate);
  }, []);

  const prefOptions: { value: AnimationPref; label: string }[] = [
    { value: "auto", label: t("settings.reduceAnimations.auto") },
    { value: "reduced", label: t("settings.reduceAnimations.reduced") },
    { value: "full", label: t("settings.reduceAnimations.full") },
  ];

  return (
    <div className="mx-auto max-w-xl px-4 pb-8 pt-4">
      <h1 className="mb-3 text-xl font-bold">{t("settings.title")}</h1>

      <div className="grid gap-4">
        {/* Language */}
        <Card>
          <CardContent className="p-4">
            <LanguageDialog>
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                aria-label={t("settings.language")}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Languages size={18} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t("settings.language")}</span>
                  <span className="block text-xs text-muted-foreground">{LANG_LABELS[lang]}</span>
                </span>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold">
                  {t("common.change")}
                </span>
              </button>
            </LanguageDialog>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Palette size={13} aria-hidden /> {t("settings.appearance")}
            </p>
            <Row
              icon={<Vibrate size={18} aria-hidden />}
              title={t("settings.reduceAnimations")}
              desc={t("settings.reduceAnimationsDesc")}
            >
              <div
                role="radiogroup"
                aria-label={t("settings.reduceAnimations")}
                className="flex shrink-0 rounded-full bg-muted p-0.5"
              >
                {prefOptions.map((o) => (
                  <button
                    key={o.value}
                    role="radio"
                    aria-checked={animationPref === o.value}
                    onClick={() => setAnimationPref(o.value)}
                    className={`min-h-8 rounded-full px-2.5 text-[11px] font-bold transition-colors ${
                      animationPref === o.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Row>
            <Separator />
            <Row icon={<span className="text-base font-black">A</span>} title={t("settings.largeText")} desc={t("settings.largeTextDesc")}>
              <Switch
                checked={largeText}
                onCheckedChange={(v) => {
                  setLargeText(v);
                  document.documentElement.classList.toggle("wg-large-text", v);
                }}
                aria-label={t("settings.largeText")}
              />
            </Row>
            <Separator />
            <Row icon={<Moon size={18} aria-hidden />} title={t("settings.darkMode")} desc={t("settings.darkModeDesc")}>
              <Switch
                checked={darkMode}
                onCheckedChange={(v) => {
                  setDarkMode(v);
                  document.documentElement.classList.toggle("dark", v);
                }}
                aria-label={t("settings.darkMode")}
              />
            </Row>
          </CardContent>
        </Card>

        {/* Offices near me */}
        <Card>
          <CardContent className="p-4">
            <button
              type="button"
              onClick={() => navigate({ name: "offices" })}
              className="flex w-full items-center gap-3 text-left"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin size={18} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t("settings.officesLink")}</span>
                <span className="block text-xs text-muted-foreground">{t("settings.officesLinkDesc")}</span>
              </span>
            </button>
          </CardContent>
        </Card>

        {/* Offline */}
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Wifi size={13} aria-hidden /> {t("settings.offline")}
            </p>
            <Row
              icon={online ? <Wifi size={18} aria-hidden /> : <WifiOff size={18} aria-hidden />}
              title={t("settings.onlineStatus")}
              desc={online ? t("settings.online") : t("settings.offlineStatus")}
            >
              <span
                className={`size-2.5 shrink-0 rounded-full ${online ? "bg-primary" : "bg-destructive"}`}
                aria-hidden
              />
            </Row>
            <Separator />
            <Row
              icon={<CalendarClock size={18} aria-hidden />}
              title={t("settings.lastContentUpdate")}
              desc={
                isServiceWorkerActive()
                  ? lastUpdate
                    ? new Date(lastUpdate).toLocaleString()
                    : t("settings.never")
                  : t("settings.never")
              }
            />
            <p className="text-xs leading-snug text-muted-foreground">{t("settings.offlineDesc")}</p>
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("settings.reminders")}
            </p>
            {reminders.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">{t("service.reminderEmpty")}</p>
            ) : (
              <ul className="grid gap-2 py-1">
                {reminders.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
                  >
                    <CalendarClock size={15} className="shrink-0 text-primary" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="block truncate font-semibold">{r.serviceLabel}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {new Date(r.date).toLocaleString()}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full text-destructive"
                      onClick={() => removeReminder(r.id)}
                      aria-label={t("common.cancel")}
                    >
                      <Trash2 size={15} aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Trip history (local only) */}
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {t("settings.tripHistory")}
            </p>
            {tripHistory.length === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">{t("trip.historyEmpty")}</p>
            ) : (
              <ul className="grid gap-2 py-1">
                {tripHistory.slice(0, 10).map((tr) => {
                  const prov = getProvider(tr.providerId);
                  return (
                    <li
                      key={tr.id}
                      className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm"
                    >
                      <MapPin size={15} className="shrink-0 text-primary" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="block truncate font-semibold">
                          {prov ? pickName(prov.name) : tr.providerId}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {t("trip.startedAt")}: {new Date(tr.startedAt).toLocaleString()}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                          tr.arrived
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tr.arrived ? t("trip.arrivedYes") : t("trip.notArrived")}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {tripHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-1.5"
                onClick={() => {
                  clearTrips();
                  toast({ description: t("settings.resetDone") });
                }}
              >
                <Trash2 size={14} aria-hidden />
                {t("settings.clearTrips")}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* My data */}
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Database size={13} aria-hidden /> {t("settings.data")}
            </p>
            <p className="mb-2 text-xs leading-snug text-muted-foreground">{t("settings.dataDesc")}</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
                  <Trash2 size={14} aria-hidden />
                  {t("settings.reset")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-sm rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("settings.resetConfirm")}</AlertDialogTitle>
                  <AlertDialogDescription>{t("settings.resetConfirmBody")}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      resetAll();
                      toast({ description: t("settings.resetDone") });
                    }}
                  >
                    {t("settings.reset")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* About + links */}
        <Card>
          <CardContent className="p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <Info size={13} aria-hidden /> {t("settings.about")}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("settings.aboutBody")}</p>
            <Separator className="my-3" />
            <button
              type="button"
              onClick={() => navigate({ name: "admin" })}
              className="flex w-full items-center gap-3 py-2 text-left"
            >
              <ShieldCheck size={17} className="text-primary" aria-hidden />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{t("settings.admin")}</span>
                <span className="block text-xs text-muted-foreground">{t("settings.adminDesc")}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ name: "privacy" })}
              className="flex w-full items-center gap-3 py-2 text-left"
            >
              <ShieldCheck size={17} className="text-primary" aria-hidden />
              <span className="flex-1">
                <span className="block text-sm font-semibold">{t("nav.privacy")}</span>
              </span>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
