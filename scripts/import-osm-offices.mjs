import fs from "node:fs";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const db = new PrismaClient();

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const num = (n, d) => {
  const a = args.find((x) => x.startsWith(n + "="));
  return a ? Number(a.split("=")[1]) : d;
};
const WRITE = flag("--write");
const REFRESH = flag("--refresh");
const ONLY_TYPED = flag("--only-typed");
const PER_REGION = num("--per-region", Infinity);
const PER_TYPE = num("--per-type", Infinity); // max per type inside each region
const LIMIT = num("--limit", Infinity);
const CACHE = "./scripts/.osm-cache.json";

const QUERY = `[out:json][timeout:90];
area["ISO3166-1"="ET"][admin_level=2]->.a;
(
  nwr["office"="government"](area.a);
  nwr["amenity"="townhall"](area.a);
  nwr["amenity"="courthouse"](area.a);
  nwr["amenity"="police"](area.a);
);
out center tags;`;

async function load() {
  if (!REFRESH && fs.existsSync(CACHE)) {
    console.log("Using cached OpenStreetMap download (use --refresh to download again)");
    return JSON.parse(fs.readFileSync(CACHE, "utf8"));
  }
  console.log("Downloading from Overpass (one request)...");
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "WegenGuide-import/1.0 (https://github.com/NatinaelEjeta/Wegen-Guide)",
    },
    body: "data=" + encodeURIComponent(QUERY),
  });
  if (!res.ok) throw new Error("Overpass returned " + res.status + " - wait a few minutes and try again");
  const json = await res.json();
  fs.writeFileSync(CACHE, JSON.stringify(json));
  return json;
}

/* ---------- area from the nearest woreda centre (approximate) ---------- */
const admin = JSON.parse(fs.readFileSync("./src/data/admin-areas.json", "utf8").replace(/^\uFEFF/, ""));
const cands = [];
for (const [list, contested] of [[admin.regions, false], [admin.contestedAreas || [], true]]) {
  for (const r of list) {
    for (const z of r.zones) {
      for (const w of z.woredas) {
        if (typeof w.lat === "number" && typeof w.lng === "number") {
          cands.push({ region: r.name, zone: z.name, woreda: w.name, lat: w.lat, lng: w.lng, contested });
        }
      }
    }
  }
}
const rad = (d) => (d * Math.PI) / 180;
function km(aLat, aLng, bLat, bLng) {
  const h = Math.sin(rad(bLat - aLat) / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(rad(bLng - aLng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
function areaOf(lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const c of cands) {
    const d = km(lat, lng, c.lat, c.lng);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (!best || best.contested || bestD > 80) return {};
  return { region: best.region, zone: best.zone, woreda: best.woreda };
}

/* ---------- office type from tags / name ---------- */
function typeOf(t) {
  const names = [t.name, t["name:en"], t["name:am"]].filter(Boolean).join(" ");
  const has = (re) => re.test(names);
  if (t.amenity === "police") return "police_station";
  if (t.amenity === "courthouse" || t.government === "justice") return "court";
  if (t.government === "tax" || has(/\b(tax|revenue)\b|ገቢ/i)) return "tax_office";
  if (t.government === "register_office" || has(/vital|civil registr|registrar|ወሳኝ/i)) return "civil_registry";
  if (has(/kebele|qebele|ቀበሌ/i)) return "kebele";
  if (has(/woreda|wereda|ወረዳ/i)) return "woreda";
  if (has(/immigration|passport|ኢሚግሬሽን/i)) return "immigration";
  if (has(/fayda|national id|\bnidp\b|መታወቂያ/i)) return "fayda_center";
  if (has(/transport|vehicle|driving|ትራንስፖርት/i)) return "transport_authority";
  if (has(/trade|business|ንግድ/i)) return "trade_bureau";
  if (has(/land|cadastre|መሬት/i)) return "land_registry";
  if (has(/notary|ኖተሪ/i)) return "notary";
  if (has(/water|electric|power|utility|ውሃ|ኤሌክትሪክ/i)) return "utility_office";
  if (t.amenity === "townhall" || has(/sub[- ]?city|city admin|municipal|ክፍለ ከተማ|ከተማ አስተዳደር/i)) return "city_administration";
  return "other";
}

const cut = (v, n) => (v ? String(v).trim().slice(0, n) || undefined : undefined);
const hasEthiopic = (s) => [...s].some((ch) => { const k = ch.charCodeAt(0); return k >= 0x1200 && k <= 0x137f; });

const data = await load();
const existing = new Set(
  (await db.officeSuggestion.findMany({ where: { note: { startsWith: "Source: OpenStreetMap" } }, select: { note: true } })).map((r) => r.note)
);

const rows = [];
const skipped = { noName: 0, noCoords: 0, outside: 0, already: 0, untyped: 0 };
for (const el of data.elements) {
  const t = el.tags || {};
  const name = (t.name || t["name:en"] || t["name:am"] || "").trim();
  if (!name) { skipped.noName++; continue; }
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") { skipped.noCoords++; continue; }
  if (lat < 3 || lat > 15.5 || lng < 32.5 || lng > 48.5) { skipped.outside++; continue; }
  const ref = `Source: OpenStreetMap ${el.type}/${el.id}`;
  if (existing.has(ref)) { skipped.already++; continue; }
  const type = typeOf(t);
  if (ONLY_TYPED && type === "other") { skipped.untyped++; continue; }

  const parts = name.split("|").map((s) => s.trim()).filter(Boolean);
  const latinPart = parts.find((s) => !hasEthiopic(s));
  const ethiopicPart = parts.find((s) => hasEthiopic(s));
  const displayName = latinPart ?? ethiopicPart ?? name;
  const area = areaOf(lat, lng);

  rows.push({
    name: displayName.slice(0, 120),
    nameAm: cut(t["name:am"] ?? ethiopicPart, 120),
    nameOm: cut(t["name:om"], 120),
    providerType: type,
    serviceIds: "",
    latitude: Number(lat.toFixed(5)),
    longitude: Number(lng.toFixed(5)),
    address: cut([t["addr:housenumber"], t["addr:street"], t["addr:suburb"], t["addr:city"]].filter(Boolean).join(", "), 200),
    phone: cut((t.phone || t["contact:phone"] || "").split(";")[0], 40),
    workingHours: cut(t.opening_hours, 120),
    region: area.region,
    zone: area.zone,
    woreda: area.woreda,
    note: ref,
    status: "pending",
  });
}

/* ---------- spread across regions: cap per region, mix types, interleave regions ---------- */
const UNKNOWN = "(area unknown)";
const groups = new Map();
for (const r of rows) {
  const k = r.region || UNKNOWN;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
function interleaveByType(list) {
  const buckets = new Map();
  for (const r of list) {
    if (!buckets.has(r.providerType)) buckets.set(r.providerType, []);
    buckets.get(r.providerType).push(r);
  }
  const arrs = [...buckets.values()].map((a) => a.slice(0, PER_TYPE));
  const out = [];
  let more = true;
  for (let i = 0; more; i++) {
    more = false;
    for (const a of arrs) if (i < a.length) { out.push(a[i]); more = true; }
  }
  return out;
}
const lists = [...groups.values()].map((l) => interleaveByType(l).slice(0, PER_REGION));
const batch = [];
for (let i = 0; batch.length < LIMIT; i++) {
  let any = false;
  for (const l of lists) {
    if (i < l.length && batch.length < LIMIT) { batch.push(l[i]); any = true; }
  }
  if (!any) break;
}

const table = {};
for (const [k, l] of groups) {
  table[k] = { usable: l.length, selected: batch.filter((r) => (r.region || UNKNOWN) === k).length };
}
console.log("\nSkipped:", skipped);
console.log(`Ready to import: ${batch.length} (of ${rows.length} usable)`);
console.log("\nBy region (area = nearest woreda centre, approximate):");
console.table(table);
const missing = admin.regions.map((r) => r.name).filter((n) => !groups.has(n));
if (missing.length) console.log("Regions with no OpenStreetMap offices found:", missing.join(", "));
console.log("\nSamples:");
for (const r of batch.slice(0, 12)) console.log(` - [${r.providerType}] ${r.name} | ${r.woreda ?? "?"}, ${r.region ?? "?"}`);

if (WRITE && batch.length > 0) {
  const res = await db.officeSuggestion.createMany({ data: batch });
  console.log(`\nSaved ${res.count} pending suggestions. Review them in the admin screen.`);
} else {
  console.log("\nDry run - nothing saved. Add --write to save.");
}
await db.$disconnect();