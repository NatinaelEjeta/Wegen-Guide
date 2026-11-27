import fs from "node:fs";
const add = {
  en: { "geo.nearbyArea": "No office is listed under this exact area. Showing offices near its centre; they may be just outside it." },
  am: { "geo.nearbyArea": "በዚህ አካባቢ የተመዘገበ ቢሮ የለም። በአካባቢው መሃል አቅራቢያ ያሉ ቢሮዎች ይታያሉ፤ ከአካባቢው ውጭ ሊሆኑ ይችላሉ።" },
  om: { "geo.nearbyArea": "Naannoo kana jalatti waajjirri galmaa'e hin jiru. Waajjiraalee giddugala naannoo kanaatti dhiyoo jiran agarsiifamaa jiru; naannoo kana ala ta'uu danda'u." },
};
for (const lang of Object.keys(add)) {
  const file = `./src/lib/i18n/locales/${lang}.json`;
  const json = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  Object.assign(json, add[lang]);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n", "utf8");
  console.log(lang, "ok");
}