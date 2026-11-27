"use client";

import { useEffect } from "react";
import { useGeoStore } from "@/lib/hooks/useGeolocation";

let tried = false;

/**
 * If the browser has ALREADY granted location permission for this site, fetch a fix
 * without another tap (once per page load). Never prompts; "Clear" keeps working.
 */
export function useAutoLocate() {
  const status = useGeoStore((s) => s.status);
  const request = useGeoStore((s) => s.request);

  useEffect(() => {
    if (tried || status !== "idle") return;
    tried = true;
    const perms = typeof navigator !== "undefined" ? navigator.permissions : undefined;
    if (!perms?.query) return;
    perms
      .query({ name: "geolocation" })
      .then((res) => {
        if (res.state === "granted") void request();
      })
      .catch(() => {});
  }, [status, request]);
}