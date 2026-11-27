# Task 2-b — Home-screen components

Agent: 2-b (home components)
Status: DONE

## Files created (only these four)
1. `src/components/home/LanguageGate.tsx` — default export `LanguageGate` (+ named alias `LanguageGate` for AppShell compatibility)
2. `src/components/home/HomeView.tsx` — default export `HomeView` (+ named alias `HomeView`)
3. `src/components/home/CategoryView.tsx` — default export `CategoryView` (+ named alias `CategoryView`)
4. `src/components/home/ServiceMiniCard.tsx` — default export `ServiceMiniCard`

## Key decisions
- AppShell.tsx (agent 2-a) imports named exports; spec asked for defaults. Exported BOTH styles from my three view files — no edits to other agents' files.
- Featured hero rotates POPULAR_IDS every 4.5s via setInterval; paused via `visibilitychange` listener (tabVisible state) and skipped entirely when `useVisualMode().mode3d === false`. Whole card is a single `<button aria-label={pick(featured.name)}>` with no extra label text; ServiceObject3D `onActivate` also wired (store dedupes identical consecutive views).
- Search: local `q` state; `q.trim().length >= 2` renders ONLY results (ServiceMiniCard grid or `home.noResults` muted card).
- Category tint chips duplicated as static literal class maps in HomeView + CategoryView (cannot create shared files outside the allowed list) so Tailwind keeps all classes.
- `Reveal` (whileInView fade-up 0.28s, once) and `FadeSwap` helpers defined locally per file; all framer-motion animations skipped when `useReducedMotion()` is true (initial={false} / plain div).
- Fayda dot on popular strip: `role="img"` + aria-label + sr-only text; ServiceMiniCard badges: BadgeCheck/Globe icons size 12 + sr-only text + aria-label + title.
- Amber "Featured" badge (bg-[#f7c600] text-[#3f3000], Sparkles icon) top-left of hero; gradient strip `from-primary/15 via-transparent to-[#f7c600]/20`.

## Contracts verified
- Only existing en.json keys used: app.name, app.tagline, gate.title, gate.subtitle, gate.choose (aria-only), gate.hint, gate.offlineNote, home.searchPlaceholder, home.searchResults, home.noResults, home.welcome, home.subtitle, home.featured, home.popular, home.categories, common.serviceCount ({count}), service.faydaBadge, service.onlineBadge, service.contentPending.
- All navigation through `useAppStore((s) => s.navigate)` — navigate({name:"service",serviceId}) / navigate({name:"category",categoryId}).
- Tap targets: language buttons min-h-14 (56px), search input h-12, popular cards min-h via h-24 object + p-3 (>44px), category cards min-h-24 + p-4, ServiceMiniCard p-4 with size-20 object (>44px). All cards are keyboard-focusable buttons with aria-labels.
- `bunx tsc --noEmit` filtered on `components/home` -> zero errors. No dev/build/lint run. No emojis, no hard-coded user-facing text (LANG_LABELS and "Fayda" are proper nouns per spec).
