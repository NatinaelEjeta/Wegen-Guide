// Wegen Guide — shared types
// All user-facing content is stored as Localized objects, never hard-coded.

export type Lang = "am" | "om" | "en";

export const LANGS: Lang[] = ["am", "om", "en"];

/** Self-names of languages (proper nouns — not translated). */
export const LANG_LABELS: Record<Lang, string> = {
  am: "አማርኛ",
  om: "Afaan Oromoo",
  en: "English",
};

/** Short chips shown in headers. */
export const LANG_SHORT: Record<Lang, string> = { am: "አማ", om: "ORO", en: "EN" };

/** BCP-47 tags used for Web Speech API. */
export const LANG_SPEECH: Record<Lang, string> = {
  am: "am-ET",
  om: "om-ET",
  en: "en-US",
};

/** A translated string. Never hard-code text; always use Localized. */
export type Localized = { am: string; om: string; en: string };

export type ObjectType =
  | "holographic-card"
  | "skyline-card"
  | "passport-booklet"
  | "globe-plane"
  | "neon-road-card"
  | "car-booklet"
  | "paper-scroll"
  | "ribbon-rings"
  | "paper-folder"
  | "shop-awning"
  | "calculator-coins"
  | "bar-chart-building"
  | "house-diorama"
  | "blueprint-house"
  | "shield-badge"
  | "scales"
  | "pen-signing"
  | "book-cap"
  | "heart-shield"
  | "shield-syringe"
  | "lightbulb"
  | "water-glass"
  | "phone-signal"
  | "handshake-contract"
  | "coin-stack-clock"
  | "umbrella-family"
  | "farm-field"
  | "map-pin";

export type CategoryId =
  | "identity"
  | "travel"
  | "transport"
  | "business"
  | "land"
  | "justice"
  | "education"
  | "health"
  | "utilities"
  | "work"
  | "farming";

export interface ServiceCategory {
  id: CategoryId;
  name: Localized;
  /** lucide-react icon name */
  icon: string;
  /** tailwind color classes for the chip (green/amber/red tasteful accents) */
  tint: "green" | "amber" | "red" | "stone" | "teal" | "orange" | "lime";
}

export interface ServiceDoc {
  id: string;
  text: Localized;
  optional?: boolean;
}

export interface ServiceStep {
  id: string;
  title: Localized;
  detail?: Localized;
  /** lucide-react icon name for the step */
  icon?: string;
}

export interface ServiceFee {
  id: string;
  label: Localized;
  /** PLACEHOLDER string, e.g. "Free (verify)" or "~250 ETB (verify at office)" */
  amount: string;
  note?: Localized;
}

export interface ServiceMistake {
  id: string;
  text: Localized;
}

export interface Service {
  id: string;
  category: CategoryId;
  name: Localized;
  shortDescription: Localized;
  requiredDocuments: ServiceDoc[];
  steps: ServiceStep[];
  fees: ServiceFee[];
  providerIds: string[];
  estimatedTime: Localized;
  commonMistakes: ServiceMistake[];
  /** ISO date — shown next to every fee/requirement */
  lastVerified: string;
  sourceLink: string;
  usesFayda: boolean;
  canBeDoneOnline: boolean;
  objectType: ObjectType;
  /** 'ready' = full guide; 'pending' = structure filled, content being prepared */
  contentStatus: "ready" | "pending";
  /** appears in the "Popular services" strip */
  popular?: boolean;
}

export type ProviderType =
  | "kebele"
  | "woreda"
  | "city_administration"
  | "immigration"
  | "tax_office"
  | "court"
  | "police_station"
  | "health_center"
  | "utility_office"
  | "fayda_center"
  | "transport_authority"
  | "trade_bureau"
  | "land_registry"
  | "notary"
  | "civil_registry"
  | "other";

/** e.g. mon: "8:30-12:30, 13:30-17:30" or "closed" */
export type ProviderHours = Record<string, string>;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface Provider {
  id: string;
  name: Localized;
  type: ProviderType;
  serviceIds: string[];
  latitude: number;
  longitude: number;
  address: Localized;
  landmark: Localized;
  region: string;
  zone: string;
  woreda: string;
  phone: string;
  workingHours: ProviderHours;
  lunchBreak: string;
  typicalBusyDays: string[];
  /** e.g. wheelchair_access */
  accessibility: string[];
  googlePlaceId?: string;
  verifiedDate: string;
  verifiedBy: string;
  source: string;
  status: "active" | "temporarily_closed" | "moved";
  isSample: boolean;
  /** can some part of this office's services be done online */
  offersOnline: boolean;
}

export type ServiceTabId =
  | "documents"
  | "steps"
  | "fees"
  | "office"
  | "mistakes"
  | "tips";

export interface Reminder {
  id: string;
  serviceId: string;
  serviceLabel: string;
  /** ISO datetime */
  date: string;
  fired: boolean;
}

/** One completed trip, stored locally on the phone only (Phase 3). */
export interface TripRecord {
  id: string;
  providerId: string;
  serviceId?: string;
  /** ISO datetime */
  startedAt: string;
  endedAt: string;
  arrived: boolean;
}

/** Client-side view router (single-route PWA). */
export type View =
  | { name: "home" }
  | { name: "category"; categoryId: CategoryId }
  | { name: "service"; serviceId: string; tab?: ServiceTabId }
  | { name: "offices" }
  | { name: "settings" }
  | { name: "admin" }
  | { name: "privacy" };

export type AnimationPref = "auto" | "reduced" | "full";

export interface CommunityTip {
  id: string;
  targetType: "service" | "provider";
  targetId: string;
  text: string;
  language: Lang;
  status: "pending" | "published" | "rejected" | "expired";
  createdAt: string;
  moderatedAt?: string;
}

/** Distance result computed on device (Phase 2). */
export interface ProviderWithDistance extends Provider {
  distanceKm: number;
}
