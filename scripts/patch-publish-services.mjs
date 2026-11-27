import fs from "node:fs";
const FILE = "./scripts/publish-approved-offices.mjs";
let c = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
if (c.includes("TYPE_SERVICES")) { console.log("already patched"); process.exit(0); }

function rep(from, to) {
  const n = c.split(from).length - 1;
  if (n !== 1) throw new Error("Anchor found " + n + " times (expected 1): " + from.slice(0, 60));
  c = c.replace(from, () => to);
}

rep("let added = 0;", `// Default services by office type (a starting guess - edit as you learn more)
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

let added = 0;`);

rep(`serviceIds: s.serviceIds ? s.serviceIds.split(",").filter(Boolean) : [],`,
    `serviceIds: s.serviceIds ? s.serviceIds.split(",").filter(Boolean) : (TYPE_SERVICES[s.providerType] ?? []),`);

fs.writeFileSync(FILE, c, "utf8");
console.log("publish script patched");