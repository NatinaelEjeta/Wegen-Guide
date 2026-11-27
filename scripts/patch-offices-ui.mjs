import fs from "node:fs";
const FILE = "./src/components/offices/NearestOffices.tsx";
let c = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");

function rep(from, to) {
  const n = c.split(from).length - 1;
  if (n !== 1) throw new Error("Anchor found " + n + " times (expected 1): " + from.slice(0, 80));
  c = c.replace(from, () => to);
}

if (c.includes("RouteTrace")) {
  console.log("already patched");
  process.exit(0);
}

// 1. imports
rep(
  '} from "@/lib/geo";',
  '} from "@/lib/geo";\n' +
    'import { getServices } from "@/lib/data";\n' +
    'import { useAutoLocate } from "@/lib/hooks/useAutoLocate";\n' +
    'import { RouteTrace } from "@/components/offices/RouteTrace";\n' +
    'import { OfficeSuggestionForm } from "@/components/offices/OfficeSuggestionForm";\n' +
    'import { emptyMessage, emptyTexts } from "@/lib/officeMessages";\n' +
    'import type { EmptyKind } from "@/lib/officeMessages";'
);

// 2. language + service name helpers
rep("  const { t } = useI18n();\n  const online = useOnline();", "  const { t, lang, pick } = useI18n();\n  const online = useOnline();");

// 3. auto-locate when the browser already allowed location
rep(
  "  const { status: geoStatus, position, accuracy, request, clear } = useGeolocation();",
  "  const { status: geoStatus, position, accuracy, request, clear } = useGeolocation();\n  useAutoLocate();"
);

// 4. a chosen area now works together with location
rep("  const usingArea = !usingDistance && (!!region || !!zone || !!woreda);", "  const usingArea = !!region || !!zone || !!woreda;");
rep(
  "    if (position) return sortByDistance(list, position); // adds distanceKm + bearing, sorted\n" +
    "    if (usingArea) return filterByArea(list, region, zone, woreda).map((p) => ({ ...p, distanceKm: NaN, bearing: 0 }));\n" +
    "    return list.map((p) => ({ ...p, distanceKm: NaN, bearing: 0 }));",
  "    const scoped = usingArea ? filterByArea(list, region, zone, woreda) : list;\n" +
    "    if (position) return sortByDistance(scoped, position); // adds distanceKm + bearing, sorted\n" +
    "    return scoped.map((p) => ({ ...p, distanceKm: NaN, bearing: 0 }));"
);

// 5. values for the messages
rep(
  "  const showMapToggle = online && MAPS_KEY_PRESENT && !isLowEnd && providers.length > 0;",
  "  const service = serviceId ? getServices().find((s) => s.id === serviceId) : undefined;\n" +
    '  const serviceName = service ? pick(service.name) : "";\n' +
    '  const areaName = [woreda, zone, region].find(Boolean) ?? "";\n' +
    "  const filtersOn = filters.openNow || filters.accessible || filters.online || filters.maxKm > 0;\n" +
    "  const roughKm = accuracy && accuracy > 5000 ? Math.round(accuracy / 1000) : 0;\n" +
    '  const roughText = roughKm > 0 ? emptyTexts(lang).rough.replace("{km}", String(roughKm)) : "";\n' +
    "  const emptyKind: EmptyKind =\n" +
    '    enriched.length > 0 && filtersOn\n      ? "filters"\n      : usingArea\n        ? serviceName\n          ? "serviceInArea"\n          : "anyInArea"\n        : serviceName\n          ? "serviceNone"\n          : "none";\n\n' +
    "  const showMapToggle = online && MAPS_KEY_PRESENT && !isLowEnd && providers.length > 0;"
);

// 6. rough-location warning
rep(
  '        {geoStatus === "denied" && (',
  '        {geoStatus === "ready" && position && roughKm > 0 && (\n' +
    '          <p className="mt-2 flex items-start gap-1.5 text-[12px] leading-snug text-amber-800 dark:text-amber-200">\n' +
    '            <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />\n' +
    "            {roughText}\n" +
    "          </p>\n" +
    "        )}\n\n" +
    '        {geoStatus === "denied" && ('
);

// 7. trace button on every office card
rep(
  "            <TripTracker provider={p} serviceId={serviceId} />",
  "            <RouteTrace provider={p} />\n            <TripTracker provider={p} serviceId={serviceId} />"
);

// 8. clear empty-state message
rep(
  '        {providers.length === 0 && (\n' +
    '          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">\n' +
    '            {t("office.noneMatch")}\n' +
    "          </div>\n" +
    "        )}",
  "        {providers.length === 0 && (\n" +
    '          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">\n' +
    "            <p>{emptyMessage(lang, emptyKind, { service: serviceName, area: areaName })}</p>\n" +
    '            {emptyKind === "filters" ? (\n' +
    '              <Button variant="outline" size="sm" className="mt-3" onClick={() => setFilters(DEFAULT_FILTERS)}>\n' +
    "                {emptyTexts(lang).clearFilters}\n" +
    "              </Button>\n" +
    "            ) : (\n" +
    '              <div className="mt-3 flex flex-col items-center gap-2">\n' +
    '                <p className="text-[12px]">{emptyTexts(lang).suggestHint}</p>\n' +
    "                <OfficeSuggestionForm serviceIds={serviceId ? [serviceId] : []} />\n" +
    "              </div>\n" +
    "            )}\n" +
    "          </div>\n" +
    "        )}"
);

fs.writeFileSync(FILE, c, "utf8");
console.log("NearestOffices patched");