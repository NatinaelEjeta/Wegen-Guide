"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";

interface DeviceCapability {
  isLowEnd: boolean;
  webgl: boolean;
  saveData: boolean;
  cores: number;
  memoryGb: number | null;
  osReducedMotion: boolean;
}

let cachedCapability: DeviceCapability | null = null;

function detectCapability(): DeviceCapability {
  if (cachedCapability && typeof window !== "undefined") return cachedCapability;
  if (typeof window === "undefined") {
    return {
      isLowEnd: false,
      webgl: false,
      saveData: false,
      cores: 4,
      memoryGb: null,
      osReducedMotion: false,
    };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };

  const cores = nav.hardwareConcurrency ?? 4;
  const memoryGb = nav.deviceMemory ?? null;
  const saveData = nav.connection?.saveData ?? false;
  const osReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let webgl = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = !!(
      canvas.getContext("webgl2") || canvas.getContext("webgl")
    );
  } catch {
    webgl = false;
  }

  // Heuristics for low-end phones (2 GB RAM class, slow connections).
  // deviceMemory is capped at 8 by Chrome; <=2 GB devices report 2.
  // Core count alone is NOT a reliable signal (many desktops report 2–4),
  // so it is exposed but not used to force the fallback.
  const isLowEnd =
    (memoryGb !== null && memoryGb <= 2) ||
    saveData ||
    !webgl;

  cachedCapability = { isLowEnd, webgl, saveData, cores, memoryGb, osReducedMotion };
  return cachedCapability;
}

export function useDeviceCapability(): DeviceCapability {
  const [cap, setCap] = useState<DeviceCapability>(() => detectCapability());

  useEffect(() => {
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const update = () => {
      const next = detectCapability();
      setCap({ ...next, osReducedMotion: mq?.matches ?? next.osReducedMotion });
    };
    mq?.addEventListener?.("change", update);
    update();
    return () => mq?.removeEventListener?.("change", update);
  }, []);

  return cap;
}

export interface VisualMode {
  /** true = render real 3D; false = lightweight CSS fallback */
  mode3d: boolean;
  isLowEnd: boolean;
  webgl: boolean;
  osReducedMotion: boolean;
  pref: "auto" | "reduced" | "full";
}

/**
 * Decides between full 3D and the lightweight fallback.
 * Priority: explicit user setting > OS reduced-motion > device capability.
 */
export function useVisualMode(): VisualMode {
  const pref = useAppStore((s) => s.animationPref);
  const cap = useDeviceCapability();

  return useMemo(() => {
    let mode3d: boolean;
    if (pref === "reduced") mode3d = false;
    else if (pref === "full") mode3d = cap.webgl;
    else mode3d = cap.webgl && !cap.isLowEnd && !cap.osReducedMotion;
    return {
      mode3d,
      isLowEnd: cap.isLowEnd,
      webgl: cap.webgl,
      osReducedMotion: cap.osReducedMotion,
      pref,
    };
  }, [pref, cap]);
}
