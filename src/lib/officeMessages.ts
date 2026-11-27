import type { Lang } from "@/lib/types";

export type EmptyKind = "filters" | "serviceInArea" | "anyInArea" | "serviceNone" | "none";

type Messages = Record<EmptyKind, string> & {
  clearFilters: string;
  suggestHint: string;
  rough: string;
};

const MESSAGES: Record<"en" | "am" | "om", Messages> = {
  en: {
    filters: "No office matches these filters.",
    serviceInArea: "There is no {service} office listed in {area}.",
    anyInArea: "No offices are listed in {area}.",
    serviceNone: "There is no {service} office listed yet.",
    none: "No offices are listed yet.",
    clearFilters: "Clear filters",
    suggestHint: "Know an office here? You can suggest it.",
    rough: "Your location is only approximate (about {km} km), so distances may be wrong. Choose your area below for better results.",
  },
  am: {
    filters: "ከእነዚህ ማጣሪያዎች ጋር የሚስማማ ቢሮ የለም።",
    serviceInArea: "በ{area} ውስጥ የ{service} ቢሮ አልተመዘገበም።",
    anyInArea: "በ{area} ውስጥ የተመዘገበ ቢሮ የለም።",
    serviceNone: "የ{service} ቢሮ እስካሁን አልተመዘገበም።",
    none: "እስካሁን የተመዘገበ ቢሮ የለም።",
    clearFilters: "ማጣሪያዎችን አጽዳ",
    suggestHint: "እዚህ ቢሮ ያውቃሉ? መጠቆም ይችላሉ።",
    rough: "ቦታዎ ግምታዊ ብቻ ነው (ወደ {km} ኪ.ሜ)፤ ርቀቶች ትክክል ላይሆኑ ይችላሉ። ለተሻለ ውጤት ከታች አካባቢዎን ይምረጡ።",
  },
  om: {
    filters: "Waajjirri calaqqisiiseen kana wajjin deemu hin jiru.",
    serviceInArea: "{area} keessa waajjirri {service} galmaa'e hin jiru.",
    anyInArea: "{area} keessa waajjirri galmaa'e hin jiru.",
    serviceNone: "Waajjirri {service} ammaaf galmaa'e hin jiru.",
    none: "Ammaaf waajjirri galmaa'e hin jiru.",
    clearFilters: "Calaqqisiisaa haqi",
    suggestHint: "Waajjira as jiru beektaa? Yaada kennuu dandeessa.",
    rough: "Iddoon kee tilmaama qofa (km {km} ta'a); fageenyi dogoggora ta'uu danda'a. Bu'aa gaarii argachuuf naannoo kee gadi filadhu.",
  },
};

const pickMessages = (lang: Lang): Messages => MESSAGES[lang as keyof typeof MESSAGES] ?? MESSAGES.en;

export function emptyMessage(
  lang: Lang,
  kind: EmptyKind,
  vars: { service?: string; area?: string }
): string {
  return pickMessages(lang)[kind]
    .replace("{service}", vars.service ?? "")
    .replace("{area}", vars.area ?? "");
}

export function emptyTexts(lang: Lang) {
  const m = pickMessages(lang);
  return { clearFilters: m.clearFilters, suggestHint: m.suggestHint, rough: m.rough };
}