import fs from "node:fs";
const text = {
  en: "Office details may be incomplete or out of date. Distances are straight-line estimates. Call to confirm before you go.",
  am: "የቢሮ መረጃ ያልተሟላ ወይም ጊዜው ያለፈበት ሊሆን ይችላል። ርቀቱ በቀጥታ መስመር የሚገመት ነው። ከመሄድዎ በፊት ደውለው ያረጋግጡ።",
  om: "Odeeffannoon waajjiraa guutuu hin ta'in ykn yeroo darbe ta'uu danda'a. Fageenyi tilmaama sararaa kallattii dha. Osoo hin deemin bilbilaa mirkaneeffadhu.",
};
for (const lang of Object.keys(text)) {
  const file = `./src/lib/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  json["office.listNote"] = text[lang];
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(lang, "ok");
}