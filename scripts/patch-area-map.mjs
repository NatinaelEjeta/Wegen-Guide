import fs from "node:fs";

const files = {
  geo: "./src/lib/geo.ts",
  near: "./src/components/offices/NearestOffices.tsx",
  map: "./src/components/offices/OfficeMap.tsx",
};
const src = {};
for (const k of Object.keys(files)) src[k] = fs.readFileSync(files[k], "utf8").replace(/\r\n/g, "\n");

if (src.geo.includes("export function nearestArea")) {
  console.log("already patched");
  process.exit(0);
}

function rep(key, from, to) {
  const n = src[key].split(from).length - 1;
  if (n !== 1) throw new Error(files[key] + ": anchor found " + n + " times (expected 1): " + from.slice(0, 70));
  src[key] = src[key].replace(from, () => to);
}

/* ---------- geo.ts: nearest area + chosen-area centre ---------- */
rep("geo", "/** Sort providers by distance", `/** Nearest woreda centre to a point (offline). Null when none is within 120 km. */
export function nearestArea(
  from: LatLng
): { region: string; zone: string; woreda: string; distanceKm: number } | null {
  let best: { region: string; zone: string; woreda: string; distanceKm: number } | null = null;
  for (const r of ADMIN_REGIONS) {
    for (const z of r.zones) {
      for (const w of z.woredas) {
        if (w.lat === undefined || w.lng === undefined) continue;
        const d = haversineKm(from, { lat: w.lat, lng: w.lng });
        if (!best || d < best.distanceKm) best = { region: r.name, zone: z.name, woreda: w.name, distanceKm: d };
      }
    }
  }
  return best && best.distanceKm <= 120 ? best : null;
}

/** Centre point of the chosen zone/woreda (null when only a region is chosen). */
export function areaCenter(region: string, zone: string, woreda: string): LatLng | null {
  return areaCircle(region, zone, woreda)?.center ?? null;
}

/** Sort providers by distance`);

/* ---------- NearestOffices.tsx ---------- */
rep("near", `  sortByDistance,
} from "@/lib/geo";`, `  sortByDistance,
  nearestArea,
  areaCenter,
} from "@/lib/geo";`);

rep("near", `  const areaName = [woreda, zone, region].find(Boolean) ?? "";`, `  const nearest = useMemo(() => (position ? nearestArea(position) : null), [position]);
  const areaName =
    [woreda, zone, region].find(Boolean) ??
    (nearest ? [nearest.woreda, nearest.region].filter(Boolean).join(", ") : "");
  const chosenCenter = areaCenter(region, zone, woreda);`);

rep("near", `      : usingArea
        ? serviceName`, `      : areaName
        ? serviceName`);

rep("near",
  "const showMapToggle = online && MAPS_KEY_PRESENT && !isLowEnd && providers.length > 0;",
  "const showMapToggle = online && MAPS_KEY_PRESENT && !isLowEnd && (providers.length > 0 || !!position || !!chosenCenter);");

rep("near",
  `{(geoStatus === "denied" || geoStatus === "unsupported" || manualOpen) && (`,
  `{(geoStatus === "denied" || geoStatus === "unsupported" || manualOpen || roughKm > 0) && (`);

rep("near",
  `{geoStatus !== "denied" && geoStatus !== "unsupported" && !manualOpen && (`,
  `{geoStatus !== "denied" && geoStatus !== "unsupported" && !manualOpen && !(roughKm > 0) && (`);

rep("near",
  `<OfficeMap providers={providers} userPos={position} onClear={() => setMapVisible(false)} />`,
  `<OfficeMap
          providers={providers}
          userPos={position}
          center={chosenCenter}
          accuracyM={accuracy}
          areaLabel={areaName}
          onClear={() => setMapVisible(false)}
        />`);

/* ---------- OfficeMap.tsx ---------- */
rep("map", `export function OfficeMap({
  providers,
  userPos,
  onClear,
}: {
  providers: Provider[];
  userPos: LatLng | null;
  onClear: () => void;
}) {`, `export function OfficeMap({
  providers,
  userPos,
  center = null,
  accuracyM = null,
  areaLabel = "",
  onClear,
}: {
  providers: Provider[];
  userPos: LatLng | null;
  /** centre of the area the person chose (optional) */
  center?: LatLng | null;
  /** location accuracy in metres (optional) */
  accuracyM?: number | null;
  areaLabel?: string;
  onClear: () => void;
}) {`);

rep("map", `  const [routing, setRouting] = useState(false);`, `  const [routing, setRouting] = useState(false);
  const cLat = center?.lat ?? null;
  const cLng = center?.lng ?? null;`);

rep("map", `        if (points.length > 0) {
          map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
        }`, `        if (userPos && accuracyM && accuracyM > 500) {
          L.circle([userPos.lat, userPos.lng], {
            radius: accuracyM,
            color: "#0e7b45",
            weight: 1,
            fillColor: "#0e7b45",
            fillOpacity: 0.08,
            interactive: false,
          }).addTo(map);
        }
        if (cLat !== null && cLng !== null) {
          const areaDot = L.circleMarker([cLat, cLng], {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            fillColor: "#b45309",
            fillOpacity: 1,
          }).addTo(map);
          if (areaLabel) areaDot.bindTooltip(areaLabel);
          points.push([cLat, cLng]);
        }
        if (providers.length === 0 && points.length > 0) {
          const focus: [number, number] =
            cLat !== null && cLng !== null ? [cLat, cLng] : points[points.length - 1];
          const zoom =
            cLat !== null ? 11 : !accuracyM ? 13 : accuracyM > 50000 ? 8 : accuracyM > 20000 ? 9 : accuracyM > 5000 ? 11 : 13;
          map.setView(focus, zoom);
        } else if (points.length > 0) {
          map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
        }`);

rep("map", `  }, [providers, userPos]);`, `  }, [providers, userPos, cLat, cLng, accuracyM, areaLabel]);`);

for (const k of Object.keys(files)) fs.writeFileSync(files[k], src[k], "utf8");
console.log("patched: geo.ts, NearestOffices.tsx, OfficeMap.tsx");