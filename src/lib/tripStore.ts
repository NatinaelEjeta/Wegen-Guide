"use client";

// Wegen Guide — live trip tracking (Phase 3)
// The active trip lives in memory only (never persisted, never uploaded).
// History is appended to the local-only app store when the trip stops.
// Low battery → less frequent location updates (Battery Status API when available).

import { create } from "zustand";
import { haversineKm } from "@/lib/geo";
import type { LatLng, TravelMode } from "@/lib/geo";
import type { Provider, TripRecord } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export interface ActiveTrip {
  providerId: string;
  serviceId?: string;
  /** epoch ms */
  startedAt: number;
  origin: LatLng;
  dest: LatLng;
  mode: TravelMode;
}

interface TripState {
  trip: ActiveTrip | null;
  current: LatLng | null;
  remainingKm: number | null;
  arrived: boolean;
  lowPower: boolean;
  /** start tracking; requires the user's current position (from a user tap) */
  start: (provider: Provider, serviceId: string | undefined, origin: LatLng, mode: TravelMode) => void;
  /** stop tracking and record history (arrived = reached within ~100 m) */
  stop: () => void;
}

const ARRIVAL_KM = 0.1; // ~100 m

let watchId: number | null = null;

/** Battery Status API (Chromium) — optional; degrades silently. */
async function readLowPower(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{ level: number; charging: boolean }>;
    };
    if (!nav.getBattery) return false;
    const b = await nav.getBattery();
    return b.level < 0.2 && !b.charging;
  } catch {
    return false;
  }
}

function clearWatch() {
  if (watchId !== null && typeof navigator !== "undefined" && "geolocation" in navigator) {
    navigator.geolocation.clearWatch(watchId);
  }
  watchId = null;
}

export const useTripStore = create<TripState>()((set, get) => ({
  trip: null,
  current: null,
  remainingKm: null,
  arrived: false,
  lowPower: false,

  start: (provider, serviceId, origin, mode) => {
    if (get().trip) return;
    const dest = { lat: provider.latitude, lng: provider.longitude };
    set({
      trip: { providerId: provider.id, serviceId, startedAt: Date.now(), origin, dest, mode },
      current: origin,
      remainingKm: haversineKm(origin, dest),
      arrived: haversineKm(origin, dest) < ARRIVAL_KM,
      lowPower: false,
    });

    void readLowPower().then((low) => {
      set({ lowPower: low });
      // restart watch with the right frequency once battery state is known
      if (watchId !== null) {
        clearWatch();
        beginWatch(set, get);
      }
    });

    beginWatch(set, get);
  },

  stop: () => {
    const { trip, arrived } = get();
    clearWatch();
    if (trip) {
      const record: TripRecord = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `trip-${Date.now()}`,
        providerId: trip.providerId,
        ...(trip.serviceId ? { serviceId: trip.serviceId } : {}),
        startedAt: new Date(trip.startedAt).toISOString(),
        endedAt: new Date().toISOString(),
        arrived,
      };
      useAppStore.getState().addTrip(record);
    }
    set({ trip: null, current: null, remainingKm: null, arrived: false });
  },
}));

function beginWatch(
  set: (partial: Partial<TripState>) => void,
  get: () => TripState
) {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
  clearWatch();
  const low = get().lowPower;
  watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { trip } = get();
      if (!trip) return;
      const cur = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const remainingKm = haversineKm(cur, trip.dest);
      set({
        current: cur,
        remainingKm,
        arrived: remainingKm < ARRIVAL_KM,
      });
    },
    () => undefined, // ignore single-fix errors; tracking continues
    {
      enableHighAccuracy: false, // battery-friendly network/wifi fixes are fine for walking
      maximumAge: low ? 30_000 : 10_000,
      timeout: low ? 60_000 : 27_000,
    }
  );
}
