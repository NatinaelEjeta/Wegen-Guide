"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AnimationPref, Lang, Reminder, ServiceTabId, TripRecord, View } from "@/lib/types";

interface AppState {
  // ---- settings ----
  lang: Lang;
  langChosen: boolean;
  animationPref: AnimationPref; // auto = respect OS reduced-motion + device capability
  largeText: boolean;
  darkMode: boolean;
  setLang: (lang: Lang) => void;
  setLangChosen: (chosen: boolean) => void;
  setAnimationPref: (pref: AnimationPref) => void;
  setLargeText: (on: boolean) => void;
  setDarkMode: (on: boolean) => void;

  // ---- navigation (client-side view router) ----
  viewStack: View[];
  navigate: (view: View) => void;
  /** like navigate but replaces the top (used when opening a tab inside service) */
  replaceTop: (view: View) => void;
  back: () => void;
  resetToHome: () => void;

  // ---- checklists (saved locally per service) ----
  checklists: Record<string, Record<string, boolean>>;
  toggleDoc: (serviceId: string, docId: string) => void;
  setAllDocs: (serviceId: string, docIds: string[], checked: boolean) => void;

  // ---- reminders (local only) ----
  reminders: Reminder[];
  addReminder: (r: Reminder) => void;
  removeReminder: (id: string) => void;
  markReminderFired: (id: string) => void;

  // ---- trip history (local only; active trip lives in tripStore) ----
  tripHistory: TripRecord[];
  addTrip: (r: TripRecord) => void;
  clearTrips: () => void;

  // ---- saved offices (Phase 2) ----
  savedOffices: string[];
  saveOffice: (id: string) => void;
  unsaveOffice: (id: string) => void;

  resetAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      lang: "am",
      langChosen: false,
      animationPref: "auto",
      largeText: false,
      darkMode: false,
      setLang: (lang) => set({ lang }),
      setLangChosen: (langChosen) => set({ langChosen }),
      setAnimationPref: (animationPref) => set({ animationPref }),
      setLargeText: (largeText) => set({ largeText }),
      setDarkMode: (darkMode) => set({ darkMode }),

      viewStack: [{ name: "home" }],
      navigate: (view) =>
        set((s) => {
          const top = s.viewStack[s.viewStack.length - 1];
          // avoid stacking identical consecutive views
          if (
            top &&
            top.name === view.name &&
            JSON.stringify(top) === JSON.stringify(view)
          ) {
            return { viewStack: s.viewStack };
          }
          return { viewStack: [...s.viewStack, view] };
        }),
      replaceTop: (view) =>
        set((s) => ({
          viewStack: [...s.viewStack.slice(0, -1), view],
        })),
      back: () =>
        set((s) => ({
          viewStack:
            s.viewStack.length > 1 ? s.viewStack.slice(0, -1) : s.viewStack,
        })),
      resetToHome: () => set({ viewStack: [{ name: "home" }] }),

      checklists: {},
      toggleDoc: (serviceId, docId) =>
        set((s) => {
          const current = s.checklists[serviceId] ?? {};
          return {
            checklists: {
              ...s.checklists,
              [serviceId]: { ...current, [docId]: !current[docId] },
            },
          };
        }),
      setAllDocs: (serviceId, docIds, checked) =>
        set((s) => {
          const next: Record<string, boolean> = {};
          for (const id of docIds) next[id] = checked;
          return { checklists: { ...s.checklists, [serviceId]: next } };
        }),

      reminders: [],
      addReminder: (r) => set((s) => ({ reminders: [...s.reminders, r] })),
      removeReminder: (id) =>
        set((s) => ({ reminders: s.reminders.filter((x) => x.id !== id) })),
      markReminderFired: (id) =>
        set((s) => ({
          reminders: s.reminders.map((x) => (x.id === id ? { ...x, fired: true } : x)),
        })),

      tripHistory: [],
      addTrip: (r) => set((s) => ({ tripHistory: [r, ...s.tripHistory].slice(0, 50) })),
      clearTrips: () => set({ tripHistory: [] }),

      savedOffices: [],
      saveOffice: (id) =>
        set((s) => ({
          savedOffices: s.savedOffices.includes(id)
            ? s.savedOffices
            : [...s.savedOffices, id],
        })),
      unsaveOffice: (id) =>
        set((s) => ({ savedOffices: s.savedOffices.filter((x) => x !== id) })),

      resetAll: () =>
        set({
          checklists: {},
          reminders: [],
          tripHistory: [],
          savedOffices: [],
          viewStack: [{ name: "home" }],
        }),
    }),
    {
      name: "wegen-guide-v1",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          // SSR-safe no-op storage
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return window.localStorage;
      }),
    }
  )
);

/** Convenience selectors */
export const useCurrentView = (): View => {
  const stack = useAppStore((s) => s.viewStack);
  return stack[stack.length - 1] ?? { name: "home" };
};

export type { ServiceTabId };
