# Wegen Guide — ወገን ጋይድ

A progressive web app (PWA) that gives ordinary Ethiopians step-by-step guides
for government services — the documents you need, the steps in order, the
fees, the nearest office — so people arrive prepared and make **one trip**.

- **Languages**: አማርኛ (default) · Afaan Oromoo · English — switchable on the
  first screen and from the header at any time. Ge'ez-capable font
  (Noto Sans Ethiopic, self-hosted).
- **Signature**: every service has its own lightweight 3D animated object
  (React Three Fiber), with automatic CSS-animation fallbacks on low-end
  phones, battery saver, or reduced-motion.
- **Offline-first**: service worker caches the shell, fonts, icons and data;
  checklists, reminders and progress live on the device (localStorage).
- **Community**: anonymous tips per service, held for moderation, published
  from the built-in admin view.

> **Status: Phases 1–3 complete** (per the agreed build order). Working:
> i18n (am/om/en), home + categories, **all 50 services with full trilingual
> guides**, 3D scenes + fallbacks, voice reading, checklist + celebration,
> reminders, PWA offline, community tips + moderation admin, **nearest
> offices with on-device distance sorting, manual region→zone→woreda
> fallback, filters, Google Maps integration (embedded map when an API key
> is configured, Google Maps deep links always) and live trip tracking with
> arrival detection, ETA-vs-closing warnings, final document check and
> local trip history**. The embedded map activates by adding a Google Maps
> key (see §8) — without one the app uses the key-free deep-link path.

---

## 1. Quick start

```bash
bun install
bun run db:push        # create/update the SQLite database (prisma)
bun run dev            # http://localhost:3000
bun run lint           # eslint
```

The database file lives in `db/` (SQLite via Prisma; `DATABASE_URL` in
`.env`). Community tips and office suggestions are stored there; all guide
content is plain JSON files (below).

---

## 2. Project structure

```
prisma/schema.prisma        # CommunityTip, OfficeSuggestion (+ placeholder auth tables)
db/                         # SQLite database file
public/
  manifest.json             # PWA manifest (installable, standalone)
  sw.js                     # service worker (network-first runtime cache + shell)
  icons/                    # app icons (generated) + icon-source.png
  fonts/                    # Noto Sans Ethiopic variable font (woff2, 3 subsets)
src/
  data/
    services.json           # ALL 50 services — fully written, trilingual
    providers.json          # 17 clearly-labeled SAMPLE offices (do not trust)
  lib/
    types.ts                # Service/Provider/Localized/View/TripRecord types
    store.ts                # zustand store: settings, view router, checklists,
                            # reminders, trip history (all local-only)
    geo.ts                  # Haversine distance/bearing, office-hours status
                            # parser, Google Maps deep links, admin-area lists
    tripStore.ts            # active trip + watchPosition lifecycle (in-memory)
    i18n/                   # provider + locales/{am,om,en}.json + fuzzy search helpers
    data.ts                 # typed getters over services.json / providers.json
    hooks/                  # useOnline, useSpeech, useGeolocation, useDeviceCapability
    voice.ts                # screen-text builders for Web Speech reading
    db.ts                   # prisma client
  components/
    common/                 # AppShell (view router), Header, Footer, OfflineBanner,
                            # Disclaimer, LanguageDialog, OfficesView, Providers, icon
    home/                   # LanguageGate, HomeView, CategoryView, ServiceMiniCard
    offices/                # NearestOffices (location + manual area + filters),
                            # ProviderCard (distance, status, deep links),
                            # OfficeMap (lazy Maps JS embed, key-gated),
                            # TripTracker (live trip panel)
    service/                # ServiceView + 6 tabs, ProgressRing, CelebrationOverlay
    object/ObjectFallback.tsx   # CSS-only animated objects (low-end fallback)
    three/                  # SceneCanvas (perf-capped R3F canvas), ServiceObject3D,
                            # sceneRegistry, palette.ts, scenes/*.tsx (8 scenes)
    settings/               # SettingsView (+ trip history), PrivacyView
    admin/AdminView.tsx     # stats + tip moderation queue
    pwa/ServiceWorkerRegister.tsx
  app/
    page.tsx                # renders AppShell (the ONLY user-visible route)
    layout.tsx, globals.css # theme (Ethiopian palette), fonts, fallback animations
    api/tips/route.ts       # GET published tips · POST anonymous tip (→ pending)
    api/admin/tips/route.ts # GET list+stats · PATCH publish/reject (NO AUTH — see §7)
```

---

## 3. Content model (single source of truth = JSON)

### services.json (`src/data/services.json`)

`categories[]` — id, name (am/om/en), lucide `icon`, `tint`.
`services[]` — each service:

| field | notes |
|---|---|
| `id` | stable slug, e.g. `passport` |
| `category` | one of the category ids |
| `name`, `shortDescription` | `{ am, om, en }` |
| `requiredDocuments[]` | `{ id, text{am,om,en}, optional? }` |
| `steps[]` | `{ id, icon(lucide name), title{am,om,en}, detail?{am,om,en} }` |
| `fees[]` | `{ id, label{am,om,en}, amount: "…", note? }` — amounts are PLACEHOLDER strings |
| `providerIds[]` | office ids from providers.json |
| `estimatedTime` | `{ am, om, en }` |
| `commonMistakes[]` | `{ id, text{am,om,en} }` |
| `lastVerified` | ISO date — shown next to every requirement/fee |
| `sourceLink` | optional official URL |
| `usesFayda` | shows the "Fayda ID likely needed" note |
| `canBeDoneOnline` | shows the "Can I do this online?" (Mesob) note |
| `objectType` | which animated object to use (see registry) |
| `contentStatus` | `"ready"` = full guide; `"pending"` = structure only |
| `popular` | appears in the home "Popular services" strip |

### providers.json (`src/data/providers.json`)

Every field from the spec: id, name (am/om/en), type, serviceIds,
latitude/longitude, address/landmark (am/om/en), region/zone/woreda, phone,
`workingHours` (per weekday `"8:30-12:30, 13:30-17:30"` or `"closed"`),
`lunchBreak`, `typicalBusyDays`, `accessibility`, `googlePlaceId?`,
`verifiedDate`, `verifiedBy`, `source`, `status`
(`active | temporarily_closed | moved`), **`isSample: true`** (renders the
"Sample office" badge), `offersOnline`.

> **All 17 bundled providers are labeled samples** with placeholder
> coordinates/phones. Never publish them as real. Replace them with
> verified offices using the steps below.

### Nearest offices & trip tracking (how it works)

- **Distance** is computed **on-device** with the Haversine formula
  (`src/lib/geo.ts`) — the sorted list works fully offline.
- **Location is requested only when the user taps** "Use my location"
  (am/om explanation included). The position lives in memory only
  (`useGeoStore`) — never persisted, never uploaded. If permission is
  denied or unsupported, a manual **region → zone → woreda** picker
  (built from providers.json) filters the list instead.
- **Filters**: open now · accessible · online-possible · within 5/10/25 km.
- **Status badges** (Open / Closing soon / Closed / Temporarily closed /
  Moved / lunch break) are derived from `workingHours` + `status` at local
  device time — no network calls.
- **Map**: on capable online devices, a "Show map" button lazy-loads the
  Maps JavaScript API (one script, one canvas). Pins are colored per office
  type; tapping opens a bottom drawer with the three travel modes (walking
  route is drawn via the Directions service when online) plus deep links.
  On low-end/data-saver devices, without a key, or offline → light mode:
  the office card's **Walk / Car / Bus** buttons and "Open in Google Maps"
  are plain deep links that work with zero API usage.
- **Trip tracking** (`TripTracker` + `src/lib/tripStore.ts`): "Start trip"
  (walking default) → `watchPosition` with battery-friendly settings
  (≤10 s updates; ≤30 s + a note when the Battery API reports < 20 % and
  not charging). Shows remaining distance, compass bearing and ETA; warns
  when the ETA lands **after closing time** or **inside the lunch break**;
  at ~100 m it flips to "You have arrived!" with the service's final
  document checklist. **Stop tracking** is always visible; stopping writes
  a `TripRecord` to local history (Settings → "Trip history"), never
  uploaded.

### Add a service (no code changes)

1. Open `src/data/services.json`.
2. Copy an existing `"ready"` service as a template, give it a new `id`,
   set `category`, write `name`/`shortDescription` in the three languages.
3. Fill documents/steps/fees/mistakes (or leave `[]` and set
   `contentStatus: "pending"` — the UI shows a friendly "being prepared"
   state).
4. Set `objectType` to one of the registered scene types
   (`src/components/three/sceneRegistry.ts`); unregistered types render the
   generic CSS fallback automatically.
5. List offices in `providerIds` that actually provide it.
6. Set `lastVerified` to today. Save — the dev server hot-reloads.

### Add a provider (no code changes)

1. Open `src/data/providers.json`, copy a block.
2. New `id`, real name/address/landmark in the three languages, type,
   `serviceIds`, **verified** latitude/longitude (from an official source or
   a site visit — do not guess), phone, `workingHours`, busy days,
   accessibility.
3. Set `isSample: false` **only** when the data has been verified, and fill
   `verifiedBy`, `verifiedDate`, `source`.
4. Reference it from the matching services' `providerIds`.

### Add a language

1. Create `src/lib/i18n/locales/<code>.json` (copy `en.json`, translate).
2. In `src/lib/types.ts`: add the code to `Lang`, `LANGS`, `LANG_LABELS`,
   `LANG_SHORT`, `LANG_SPEECH` (BCP-47 tag for voice reading).
3. In `src/lib/i18n/index.tsx`: import and register the dictionary.
4. Add the language to the data files' `Localized` objects only if you need
   content in it (missing fields fall back `lang → en → am`).

---

## 4. 3D objects (and their low-end fallbacks)

Each `objectType` maps to a lazy-loaded R3F scene
(`src/components/three/scenes/`) **and** a pure-CSS animated fallback
(`src/components/object/ObjectFallback.tsx` + `wg-*` classes in
`globals.css`). Phase 1 ships 8 scenes: `holographic-card` (Fayda),
`skyline-card` (kebele ID), `passport-booklet`, `paper-scroll` (birth),
`ribbon-rings` (marriage), `neon-road-card` (driver's license),
`shop-awning` (business license), `house-diorama` (land title). The
remaining 27 spec types fall back to the generic document animation until
their phases.

Performance rules already implemented: single small canvas per screen, DPR
capped at 1.5, antialias off on low-end, `low-power` GPU hint, render loop
paused when the object is off-screen or the app is backgrounded, scenes
code-split, no 3D when: `prefers-reduced-motion`, save-data, ≤2 GB RAM, or
no WebGL — and a manual "Reduce animations" toggle (Auto/On/Off) in
Settings.

---

## 5. Voice reading

The speaker button on service screens and office cards uses the **Web
Speech API** (`src/lib/hooks/useSpeech.ts`): text is built per screen/tab in
the selected language (`src/lib/voice.ts`), chunked by sentence, spoken at
0.92× rate. Amharic voices are rare on phones; the hook falls back to a
close relative voice and finally to any available one. Recorded-audio
fallback files can later be dropped per screen if needed.

---

## 6. PWA / offline

- `public/manifest.json` — installable, standalone, Ethiopic-safe.
- `public/sw.js` — precaches the shell, then network-first caches every
  same-origin GET (always fresh online, cached copy offline, cached `/`
  shell as navigation fallback). Old caches are purged on activate.
- Offline banner appears automatically; the office list explains that map
  and directions need internet; Settings shows "content saved for offline"
  timestamp; the footer shows an "Available offline" chip when the SW is
  controlling the page.
- Checklist progress, reminders, language and settings persist in
  localStorage via zustand (`wegen-guide-v1`).

## 7. Community tips & moderation

- Users post anonymous tips (5–400 chars, language-tagged) → stored with
  `status: pending`. Nothing is published unreviewed.
- Admin view (footer → Admin): stats, filterable queue, Publish/Reject.
- The PATCH endpoint has **no auth in this demo build**. Before real
  deployment, protect it (e.g. NextAuth credential/session check at the top
  of `src/app/api/admin/tips/route.ts`, or an `ADMIN_TOKEN` header checked
  against an env var) and remove the admin entry from the footer.

## 8. Google Maps Platform (implemented, key-gated)

The integration uses: **Maps JavaScript API** (lazy-loaded embedded map with
per-type pins and a details drawer) and the **Directions service** for route
drawing; **Places API** remains optional (only for providers with a
`googlePlaceId`, not used by default). Our `providers.json` stays the
source of truth — Google data never overwrites it.

**Without a key** the app is still fully usable: distance-sorted lists,
manual area filtering and per-office **Google Maps deep links**
(`maps/dir/?api=1…`, `maps/search/?api=1…`) work with zero API usage.

How to get and secure the key:

1. Create a project in Google Cloud Console → enable *Maps JavaScript API*
   and *Directions API* (add *Places API* only if needed).
2. Create an **HTTP-referrer-restricted** browser key
   (`https://yourdomain/*`) and enable **per-API restriction**.
3. Put it in `.env` as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — the "Show map"
   button then loads the JS API lazily, only when tapped (saves
   data/battery). Low-end/data-saver devices always get light mode.
4. Keep any server-side keys in non-public env vars — never ship them to
   the client.
5. Set daily quota caps and billing alerts in Cloud Console.

Cost control checklist: referrer+API restrictions, daily quotas, billing
alerts, one directions request per user action, cache route results where
the ToS allow, "light map mode" on low-end devices (list + deep link
`https://www.google.com/maps/dir/?api=1&destination=lat,lng` instead of the
embedded map), no Places calls unless a `googlePlaceId` exists.

## 9. Deploy

```bash
bun run build        # next build + standalone output
bun run start        # runs the standalone server (see package.json)
```

- Serve over **HTTPS** (service worker + geolocation require it).
- Keep `DATABASE_URL` pointing at a persisted SQLite file (or migrate the
  two moderation tables to any Prisma-supported DB).
- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable the embedded map
  (optional — deep links work without it). Review CSP headers.

## 10. Low-end Android test checklist (real device)

- [ ] First load over throttled 3G < 3 s after first visit (SW cache).
- [ ] Toggles: Battery saver / Data saver → CSS fallback objects instead of
      WebGL (no black rectangles).
- [ ] "Reduce animations" → On: 3D gone, checklist/celebration still work.
- [ ] Large-text mode: nothing overlaps at 18.5px root font.
- [ ] Checklist ticks survive app kill and reload; celebration fires once.
- [ ] Voice reading in Amharic (note: many phones lack an am voice — verify
      graceful fallback sound/skip).
- [ ] Airplane mode: banner appears, guides/offices/tips still open, call
      buttons work, map note explains offline state.
- [ ] Offline reload of `/` serves the cached shell (no dinosaur).
- [ ] GPS: outdoor accuracy, permission-denied → manual region/zone/woreda
      picker works, distance list still renders offline (Haversine).
- [ ] Trip tracking: start → updates every ~10 s, arrival flips at ~100 m
      with final checklist, "Stop tracking" always reachable, history row
      appears in Settings; battery saver reduces update frequency.
- [ ] ETA warnings: start a trip near closing time → after-close/lunch
      warning appears.
- [ ] Slow network: tips POST retry messaging; no spinners that never end.
- [ ] Install to home screen; standalone window, correct icon + splash.

## 11. Privacy commitments (implemented)

No accounts, no personal data. Checklists/reminders/trip history stay on
device. Location is requested only when the user taps a location or
"Start trip" button, explained in the local language, kept in memory only
(never persisted, never uploaded); only route-request coordinates reach
Google. The embedded map is opt-in ("Show map") and skipped entirely on
low-end devices. Community tips and office suggestions are anonymous and
moderated. Privacy policy screen (`privacy.p*` keys) mentions Google Maps
usage.
