import fs from "node:fs";
const add = {
  en: {
    "office.unverifiedBadge": "Unverified community suggestion",
    "office.hoursUnconfirmed": "Opening hours not confirmed",
  },
  am: {
    "office.unverifiedBadge": "ያልተረጋገጠ የማህበረሰብ ጥቆማ",
    "office.hoursUnconfirmed": "የሥራ ሰዓት አልተረጋገጠም",
  },
  om: {
    "office.unverifiedBadge": "Yaada hawaasaa kan hin mirkanoofne",
    "office.hoursUnconfirmed": "Sa'aatiin hojii hin mirkanoofne",
  },
};
for (const lang of Object.keys(add)) {
  const file = `./src/lib/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  Object.assign(json, add[lang]);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(lang, "ok");
}