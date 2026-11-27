import fs from "node:fs";
const FILE = "./src/components/admin/OfficeSuggestionsAdmin.tsx";
let c = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
if (c.includes("s.woreda")) { console.log("already patched"); process.exit(0); }
function rep(from, to) {
  const n = c.split(from).length - 1;
  if (n !== 1) throw new Error("Anchor found " + n + " times: " + from.slice(0, 60));
  c = c.replace(from, () => to);
}
rep("  note?: string | null;\n", "  note?: string | null;\n  region?: string | null;\n  zone?: string | null;\n  woreda?: string | null;\n");
rep(
  "            {s.note ? <p>Note: {s.note}</p> : null}",
  '            {s.region ? <p>Area: {[s.woreda, s.zone, s.region].filter(Boolean).join(", ")}</p> : null}\n            {s.note ? <p>Note: {s.note}</p> : null}'
);
fs.writeFileSync(FILE, c, "utf8");
console.log("admin list patched");