import fs from "node:fs";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const db = new PrismaClient();

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REFRESH = args.includes("--refresh");
const ONLY_TYPED = args.includes("--only-typed");
const limitArg = args.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
const CACHE = "./scripts/.osm-cache.json";
const perArg = args.find((a) => a.startsWith("--per-type="));
const PER_TYPE = perArg ? Number(perArg.split("=")[1]) : Infinity;

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
  if (has(/land|cadastre| land admin|መሬት/i)) return "land_registry";
  if (has(/notary|ኖተሪ/i)) return "notary";
  if (has(/water|electric|power|utility|ውሃ|ኤሌክትሪክ/i)) return "utility_office";
  if (t.amenity === "townhall" || has(/sub[- ]?city|city admin|municipal|ክፍለ ከተማ|ከተማ አስተዳደር/i)) return "city_administration";
  return "other";
}

const cut = (v, n) => (v ? String(v).trim().slice(0, n) || undefined : undefined);

const data = await load();
const existing = new Set(
  (
    await db.officeSuggestion.findMany({
      where: { note: { startsWith: "Source: OpenStreetMap" } },
      select: { note: true },
    })
  ).map((r) => r.note)
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

  const isEthiopic = /[\u1200-\u137F]/.test(name);
  const parts = name.split("|").map((s) => s.trim()).filter(Boolean);
  const hasEthiopic = (s) => [...s].some((ch) => ch.charCodeAt(0) >= 0x1200 && ch.charCodeAt(0) <= 0x137f);
  const latinPart = parts.find((s) => !hasEthiopic(s));
  const ethiopicPart = parts.find((s) => hasEthiopic(s));
  const displayName = latinPart ?? ethiopicPart ?? name;
  rows.push({
    name: displayName.slice(0, 120),
    nameAm: cut(t["name:am"] ?? (isEthiopic ? ethiopicPart ?? name : undefined), 120),
    nameOm: cut(t["name:om"], 120),
    providerType: type,
    serviceIds: "",
    latitude: Number(lat.toFixed(5)),
    longitude: Number(lng.toFixed(5)),
    address: cut([t["addr:housenumber"], t["addr:street"], t["addr:suburb"], t["addr:city"]].filter(Boolean).join(", "), 200),
    phone: cut((t.phone || t["contact:phone"] || "").split(";")[0], 40),
    workingHours: cut(t.opening_hours, 120),
    note: ref,
    status: "pending",
  });
}

const counts = {};
const batch = rows
  .filter((r) => (counts[r.providerType] = (counts[r.providerType] || 0) + 1) <= PER_TYPE)
  .slice(0, LIMIT);
const byType = {};
for (const r of batch) byType[r.providerType] = (byType[r.providerType] || 0) + 1;

console.log("\nSkipped:", skipped);
console.log(`Ready to import: ${batch.length} (of ${rows.length} usable)`);
console.log("By type:", byType);
console.log("\nSamples:");
for (const r of batch.slice(0, 8)) console.log(` - [${r.providerType}] ${r.name} (${r.latitude}, ${r.longitude})`);

if (WRITE && batch.length > 0) {
  const res = await db.officeSuggestion.createMany({ data: batch });
  console.log(`\nSaved ${res.count} pending suggestions. Review them in the admin screen.`);
} else {
  console.log("\nDry run - nothing saved. Add --write to save.");
}
await db.$disconnect();