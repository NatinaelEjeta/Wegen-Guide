import type { Lang, Localized, Service, Provider, ServiceTabId } from "@/lib/types";
import { getProvidersForService } from "@/lib/data";
import { WEEKDAYS } from "@/lib/types";

/** pick a translated field with fallback */
function L(value: Localized | undefined, lang: Lang): string {
  if (!value) return "";
  return value[lang] || value.en || value.am || "";
}

/**
 * Builds a plain-text version of a service screen so the
 * Web Speech API can read it aloud in the selected language.
 */
export function buildServiceText(
  service: Service,
  lang: Lang,
  tab: ServiceTabId,
  providers?: Provider[]
): string {
  const parts: string[] = [];
  parts.push(L(service.name, lang));
  parts.push(L(service.shortDescription, lang));

  if (tab === "documents") {
    parts.push(L({ am: "የሚያስፈልጉ ሰነዶች", om: "Docsii barbaachisoo", en: "Required documents" }, lang));
    service.requiredDocuments.forEach((d, i) => {
      parts.push(`${i + 1}. ${L(d.text, lang)}`);
    });
  } else if (tab === "steps") {
    parts.push(L({ am: "ደረጃዎች", om: "Tarkaanfiiwwan", en: "Steps" }, lang));
    service.steps.forEach((s, i) => {
      parts.push(`${i + 1}. ${L(s.title, lang)}`);
      if (s.detail) parts.push(L(s.detail, lang));
    });
  } else if (tab === "fees") {
    parts.push(L({ am: "ክፍያዎች", om: "Kaffaltiilee", en: "Fees" }, lang));
    service.fees.forEach((f) => {
      parts.push(`${L(f.label, lang)}: ${f.amount}`);
    });
  } else if (tab === "office") {
    const list = providers ?? getProvidersForService(service.id);
    if (list.length) {
      parts.push(L({ am: "ቢሮዎች", om: "Waajjira", en: "Offices" }, lang));
      list.forEach((p) => {
        parts.push(L(p.name, lang));
        parts.push(L(p.address, lang));
        if (p.phone) parts.push(`${L({ am: "ስልክ", om: "Bilbilaa", en: "Phone" }, lang)} ${p.phone}`);
      });
    } else {
      parts.push(L({ am: "ቢሮ አልተገኘም", om: "Waajjiran hin argamne", en: "No office listed yet" }, lang));
    }
  } else if (tab === "mistakes") {
    parts.push(L({ am: "የተለመዱ ስህተቶች", om: "Dogoggora beekamaa", en: "Common mistakes" }, lang));
    service.commonMistakes.forEach((m, i) => parts.push(`${i + 1}. ${L(m.text, lang)}`));
  }

  parts.push(
    L(
      {
        am: "የመጨረሻውን ማረጋገጫ ሁልጊዜ ከኦፊሴላዊው ቢሮ ያድርጉ።",
        om: "Yeroo hundaa waajjira sirreeffamaa waliin mirkaneessaa.",
        en: "Always confirm with the official office.",
      },
      lang
    )
  );
  return parts.filter(Boolean).join(". ");
}

/** Build an office's spoken text (name, address, landmark, hours, phone). */
export function buildProviderText(
  provider: Provider,
  lang: Lang,
  labels: { hours: string; phone: string; landmark: string }
): string {
  const parts: string[] = [L(provider.name, lang), L(provider.address, lang)];
  parts.push(`${labels.landmark}: ${L(provider.landmark, lang)}`);
  const todayKey = WEEKDAYS[(new Date().getDay() + 6) % 7];
  parts.push(`${labels.hours}: ${provider.workingHours[todayKey] ?? "-"}`);
  if (provider.phone) parts.push(`${labels.phone}: ${provider.phone}`);
  return parts.filter(Boolean).join(". ");
}
