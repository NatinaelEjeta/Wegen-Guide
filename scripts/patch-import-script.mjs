import fs from "node:fs";
const FILE = "./scripts/import-osm-offices.mjs";
let c = fs.readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
if (c.includes("PER_TYPE")) { console.log("already patched"); process.exit(0); }

function rep(from, to) {
  const n = c.split(from).length - 1;
  if (n !== 1) throw new Error("Anchor found " + n + " times (expected 1): " + from.slice(0, 70));
  c = c.replace(from, () => to);
}

// --per-type option
rep(
  'const CACHE = "./scripts/.osm-cache.json";',
  'const CACHE = "./scripts/.osm-cache.json";\n' +
  'const perArg = args.find((a) => a.startsWith("--per-type="));\n' +
  "const PER_TYPE = perArg ? Number(perArg.split(\"=\")[1]) : Infinity;"
);

// split "English | Amharic" names
rep(
  "  rows.push({\n",
  '  const parts = name.split("|").map((s) => s.trim()).filter(Boolean);\n' +
  "  const hasEthiopic = (s) => [...s].some((ch) => ch.charCodeAt(0) >= 0x1200 && ch.charCodeAt(0) <= 0x137f);\n" +
  "  const latinPart = parts.find((s) => !hasEthiopic(s));\n" +
  "  const ethiopicPart = parts.find((s) => hasEthiopic(s));\n" +
  "  const displayName = latinPart ?? ethiopicPart ?? name;\n" +
  "  rows.push({\n"
);
rep("    name: name.slice(0, 120),", "    name: displayName.slice(0, 120),");
rep(
  '    nameAm: cut(t["name:am"] ?? (isEthiopic ? name : undefined), 120),',
  '    nameAm: cut(t["name:am"] ?? (isEthiopic ? ethiopicPart ?? name : undefined), 120),'
);

// cap per type
rep(
  "const batch = rows.slice(0, LIMIT);",
  "const counts = {};\n" +
  "const batch = rows\n" +
  "  .filter((r) => (counts[r.providerType] = (counts[r.providerType] || 0) + 1) <= PER_TYPE)\n" +
  "  .slice(0, LIMIT);"
);

fs.writeFileSync(FILE, c, "utf8");
console.log("import script patched");