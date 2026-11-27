import fs from "node:fs";
import pkg from "@prisma/client";

const { PrismaClient } = pkg;
const db = new PrismaClient();
const FILE = "./src/data/providers.json";

const raw = fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, "");
const data = JSON.parse(raw);
const existing = new Set(data.providers.map((p) => p.id));

const approved = await db.officeSuggestion.findMany({ where: { status: "approved" } });
const closedWeek = { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" };

// Default services by office type (a starting guess - edit as you learn more)
const TYPE_SERVICES = {
  immigration: ["passport", "visa-residence-permit"],
  civil_registry: ["birth-certificate", "marriage-certificate", "divorce-registration", "death-certificate"],
  kebele: ["kebele-id", "lost-id-replacement", "birth-certificate", "marriage-certificate"],
  fayda_center: ["fayda-national-id", "lost-id-replacement"],
  tax_office: ["tin-registration", "tax-clearance"],
  trade_bureau: ["business-license", "trade-name-registration", "business-closure"],
  transport_authority: ["drivers-license", "vehicle-libre", "vehicle-inspection", "transport-driver-permit"],
  land_registry: ["land-title-deed", "property-transfer", "land-lease-registration", "urban-land-holding"],
  police_station: ["report-crime"],
  court: ["court-filing"],
  notary: ["notary-services", "power-of-attorney"],
};

let added = 0;
for (const s of approved) {
  const id = `community-${s.id}`;
  if (existing.has(id)) continue;

  const hoursNote = s.workingHours ? ` (Hours: ${s.workingHours})` : "";
  const addr = (s.address ?? "") + hoursNote;

  data.providers.push({
    id,
    name: { am: s.nameAm || s.name, om: s.nameOm || s.name, en: s.name },
    type: s.providerType || "other",
    serviceIds: s.serviceIds ? s.serviceIds.split(",").filter(Boolean) : (TYPE_SERVICES[s.providerType] ?? []),
    latitude: s.latitude,
    longitude: s.longitude,
    address: { am: addr, om: addr, en: addr },
    landmark: { am: s.landmark ?? "", om: s.landmark ?? "", en: s.landmark ?? "" },
    region: s.region ?? "",
    zone: s.zone ?? "",
    woreda: s.woreda ?? "",
    phone: s.phone ?? "",
    workingHours: closedWeek,
    lunchBreak: "",
    typicalBusyDays: [],
    accessibility: [],
    verifiedDate: "",
    verifiedBy: "unverified community suggestion",
    source: "community-suggestion",
    status: "active",
    isSample: false,
    offersOnline: false,
  });
  added++;
}

if (added > 0) {
  fs.copyFileSync(FILE, FILE + ".bak");
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
}
console.log(`Approved suggestions: ${approved.length}, newly added: ${added}`);
await db.$disconnect();