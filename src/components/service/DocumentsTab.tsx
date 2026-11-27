"use client";

import React, { useMemo, useState } from "react";
import { CalendarClock, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { ProgressRing } from "./ProgressRing";
import type { Reminder, Service } from "@/lib/types";

interface DocumentsTabProps {
  service: Service;
  /** switch the parent to the office tab (used by the celebration CTA) */
  onFindOffice: () => void;
}

export function DocumentsTab({ service, onFindOffice }: DocumentsTabProps) {
  const { t, pick } = useI18n();
  const { toast } = useToast();
  const checklist = useAppStore((s) => s.checklists[service.id]);
  const toggleDoc = useAppStore((s) => s.toggleDoc);
  const setAllDocs = useAppStore((s) => s.setAllDocs);
  const addReminder = useAppStore((s) => s.addReminder);
  const removeReminder = useAppStore((s) => s.removeReminder);
  const reminders = useAppStore((s) => s.reminders);

  const [celebrating, setCelebrating] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [dateValue, setDateValue] = useState("");

  const docIds = useMemo(
    () => service.requiredDocuments.map((d) => d.id),
    [service]
  );
  const total = service.requiredDocuments.length;
  const checkedCount = useMemo(
    () => service.requiredDocuments.reduce((acc, d) => acc + (checklist?.[d.id] ? 1 : 0), 0),
    [service, checklist]
  );
  const progress = total > 0 ? checkedCount / total : 0;

  const serviceReminders = useMemo(
    () => reminders.filter((r) => r.serviceId === service.id),
    [reminders, service.id]
  );

  /** Celebrate when the checklist reaches 100% (computed in the click handlers). */
  const handleToggleDoc = (docId: string) => {
    toggleDoc(service.id, docId);
    const next = { ...(checklist ?? {}), [docId]: !(checklist?.[docId] ?? false) };
    if (docIds.every((id) => next[id])) setCelebrating(true);
  };

  const handleSetAllDocs = (checked: boolean) => {
    setAllDocs(service.id, docIds, checked);
    if (checked && total > 0) setCelebrating(true);
  };

  const saveReminder = () => {
    if (!dateValue) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    const reminder: Reminder = {
      id,
      serviceId: service.id,
      serviceLabel: pick(service.name),
      date: dateValue,
      fired: false,
    };
    addReminder(reminder);
    toast({ description: t("service.reminderSaved") });
    // Best-effort: ask for notification permission so the reminder can show.
    try {
      if (typeof window !== "undefined" && "Notification" in window) {
        const permission = Notification.requestPermission();
        if (permission && typeof permission.catch === "function") {
          permission.catch(() => {
            /* user declined or unavailable */
          });
        }
      }
    } catch {
      /* notifications not available on this device */
    }
    setReminderOpen(false);
    setDateValue("");
  };

  return (
    <div>
      <h2 className="text-sm font-bold">{t("service.documentsTitle")}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{t("service.checklistHint")}</p>

      {/* progress */}
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-muted p-3">
        <ProgressRing checked={checkedCount} total={total} />
        <div className="min-w-0">
          <p className="text-sm font-bold">{t("service.progress")}</p>
          <p className="text-xs text-muted-foreground">{Math.round(progress * 100)}%</p>
        </div>
      </div>

      {/* checklist */}
      {total > 0 ? (
        <div className="mt-3 space-y-2">
          {service.requiredDocuments.map((doc) => {
            const checked = checklist?.[doc.id] ?? false;
            return (
              <label
                key={doc.id}
                className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border bg-card p-3 transition-colors ${
                  checked ? "border-primary/40 bg-primary/5" : "hover:border-primary/30"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => handleToggleDoc(doc.id)}
                  className="mt-0.5"
                />
                <span className="flex-1 text-sm font-medium leading-snug">{pick(doc.text)}</span>
                {doc.optional ? (
                  <span className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {t("service.optional")}
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      ) : null}

      {/* mark all / clear all */}
      {total > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => handleSetAllDocs(true)}>
            {t("service.markAll")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleSetAllDocs(false)}>
            {t("service.uncheckAll")}
          </Button>
        </div>
      ) : null}

      {/* reminders */}
      <div className="mt-4 space-y-2 border-t pt-3">
        <Button variant="outline" size="sm" onClick={() => setReminderOpen(true)}>
          <CalendarClock className="size-3.5" aria-hidden />
          {t("service.reminder")}
        </Button>

        {serviceReminders.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">{t("service.reminderEmpty")}</p>
        ) : (
          <div>
            <p className="text-xs font-semibold">{t("service.reminderUpcoming")}</p>
            <ul className="mt-1.5 space-y-1.5">
              {serviceReminders.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-2"
                >
                  <span className="text-xs">{new Date(r.date).toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => removeReminder(r.id)}
                    aria-label={t("common.close")}
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* reminder dialog */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>{t("service.reminder")}</DialogTitle>
            <DialogDescription>{t("service.reminderDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="wg-reminder-date" className="text-xs font-semibold">
              {t("service.reminderDate")}
            </label>
            <Input
              id="wg-reminder-date"
              type="datetime-local"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button size="sm" disabled={!dateValue} onClick={saveReminder}>
              {t("service.reminderSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 100% celebration */}
      <CelebrationOverlay
        open={celebrating}
        onClose={() => setCelebrating(false)}
        onFindOffice={() => {
          setCelebrating(false);
          onFindOffice();
        }}
      />
    </div>
  );
}
