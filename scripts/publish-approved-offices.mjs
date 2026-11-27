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
    serviceIds: s.serviceIds ? s.serviceIds.split(",").filter(Boolean) : [],
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