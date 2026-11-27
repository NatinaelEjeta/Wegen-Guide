import fs from "node:fs";
const FILE = "./src/data/providers.json";
const data = JSON.parse(fs.readFileSync(FILE, "utf8").replace(/^\uFEFF/, ""));
const before = data.providers.length;
const kept = data.providers.filter((p) => !p.isSample && !String(p.id).startsWith("sample-"));
fs.copyFileSync(FILE, FILE + ".bak");
data.providers = kept;
fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log(`Removed ${before - kept.length}, kept ${kept.length}`);