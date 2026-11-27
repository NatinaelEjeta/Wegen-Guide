import type {
  CategoryId,
  Provider,
  Service,
  ServiceCategory,
} from "@/lib/types";
import servicesData from "@/data/services.json";
import providersData from "@/data/providers.json";
import {
  fuzzyAllWordsMatch,
  normalizeForSearch,
} from "@/lib/i18n/normalize";

export const CATEGORIES = servicesData.categories as ServiceCategory[];
export const SERVICES = servicesData.services as Service[];
export const PROVIDERS = providersData.providers as Provider[];

/** Popular services for the home strip (order matters). */
export const POPULAR_IDS = [
  "fayda-national-id",
  "passport",
  "drivers-license",
  "business-license",
  "birth-certificate",
  "kebele-id",
  "marriage-certificate",
  "land-title-deed",
];

export function getCategories(): ServiceCategory[] {
  return CATEGORIES;
}

export function getCategory(id: CategoryId): ServiceCategory | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getServices(): Service[] {
  return SERVICES;
}

export function getServicesByCategory(categoryId: CategoryId): Service[] {
  return SERVICES.filter((s) => s.category === categoryId);
}

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function getProviders(): Provider[] {
  return PROVIDERS;
}

export function getProvider(id: string): Provider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getProvidersForService(serviceId: string): Provider[] {
  return PROVIDERS.filter((p) => p.serviceIds.includes(serviceId));
}

export function countServicesByCategory(categoryId: CategoryId): number {
  return SERVICES.filter((s) => s.category === categoryId).length;
}

/**
 * Forgiving full-text search across all languages (am/om/en).
 * Matches names and short descriptions, tolerant to case, spacing,
 * Ethiopic punctuation and small typos (edit-distance ≤ 2).
 */
export function searchServices(query: string): Service[] {
  const q = normalizeForSearch(query);
  if (!q || q.length < 2) return [];
  return SERVICES.filter((s) => {
    const haystack = normalizeForSearch(
      [
        s.name.am,
        s.name.om,
        s.name.en,
        s.shortDescription.am,
        s.shortDescription.om,
        s.shortDescription.en,
      ].join(" ")
    );
    if (q.split(" ").every((w) => haystack.includes(w))) return true;
    return fuzzyAllWordsMatch(haystack, q);
  });
}
