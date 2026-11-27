import fs from "node:fs";
const FILE = "./src/data/services.json";
const data = JSON.parse(fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, ""));
const list = Array.isArray(data) ? data : data.services;
let removed = 0;
for (const s of list) {
  if (Array.isArray(s.providerIds)) {
    const kept = s.providerIds.filter((id) => !String(id).startsWith("sample-"));
    removed += s.providerIds.length - kept.length;
    s.providerIds = kept;
  }
}
fs.copyFileSync(FILE, FILE + ".bak");
fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Removed ${removed} dead office references from ${list.length} services`);