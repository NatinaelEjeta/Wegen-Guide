"use client";

// Wegen Guide — geolocation (Phase 2)
// Location is requested ONLY when the user taps a location button, is kept in
// memory only (never persisted / never uploaded), and can be cleared any time.

import { create } from "zustand";
import type { LatLng } from "@/lib/geo";

export type GeoStatus =
  | "idle" // user has not asked yet
  | "locating"
  | "ready"
  | "denied"
  | "unsupported"
  | "error";

interface GeoState {
  status: GeoStatus;
  position: LatLng | null;
  /** meters */
  accuracy: number | null;
  updatedAt: number | null;
  request: () => Promise<void>;
  clear: () => void;
}

export const useGeoStore = create<GeoState>()((set, get) => ({
  status: "idle",
  position: null,
  accuracy: null,
  updatedAt: null,

  request: async () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      set({ status: "unsupported" });
      return;
    }
    if (get().status === "locating") return;
    set({ status: "locating" });

    const finish = (partial: Partial<GeoState>) =>
      set({ status: "ready", ...partial });

    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          finish({
            position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            accuracy: pos.coords.accuracy ?? null,
            updatedAt: Date.now(),
          });
          resolve();
        },
        (err) => {
          set({
            status: err.code === err.PERMISSION_DENIED ? "denied" : "error",
          });
          resolve();
        },
        // Balanced for low-end phones: no high accuracy (GPS drain), accept
        // a recent fix, fail fast so users are never left waiting.
        { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 }
      );
    });
  },

  clear: () => set({ status: "idle", position: null, accuracy: null, updatedAt: null }),
}));

/**
 * Convenience hook. Privacy rule: a location fix is only fetched when the
 * user taps a location button (request() from UI) — never silently, never
 * persisted, never uploaded.
 */
export function useGeolocation() {
  const status = useGeoStore((s) => s.status);
  const position = useGeoStore((s) => s.position);
  const accuracy = useGeoStore((s) => s.accuracy);
  const request = useGeoStore((s) => s.request);
  const clear = useGeoStore((s) => s.clear);

  return { status, position, accuracy, request, clear };
}
