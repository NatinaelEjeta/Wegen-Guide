# Task 2-c — Service detail screen (6 tabs, checklist + celebration, voice, reminders, tips)

Agent: 2-c (service view)
Status: DONE

## Files created (only inside src/components/service/)
1. `ServiceView.tsx` — default export `ServiceView({ serviceId, initialTab })` (+ named alias `ServiceView` for AppShell compatibility, same pattern as 2-b)
2. `ProgressRing.tsx` — SVG ring 72px / stroke 7, `stroke="var(--et-green)"`, CSS transition on stroke-dashoffset, center `${checked}/${total}`, role="progressbar"
3. `CelebrationOverlay.tsx` — AnimatePresence overlay, 24 confetti pieces (useMemo on `open`, Math.random client-only since overlay starts closed; skipped when useReducedMotion), spring pop Check badge, t("celebration.*") buttons
4. `DocumentsTab.tsx` — checklist + progress + mark/uncheck all + reminder dialog + reminder list + CelebrationOverlay
5. `StepsTab.tsx` — vertical timeline, expandable details (first step expanded), whileInView once, ping on step 0, reduced-motion aware
6. `FeesTab.tsx` — fee rows, amber chip for amounts containing "PLACEHOLDER" or "~", column header, pay hint, sourceLink chip (min-h-[44px])
7. `OfficeTab.tsx` — provider cards; open/closed via `WEEKDAYS[(getDay()+6)%7]`, temporarily_closed/moved badges, busy-day chips (weekday.*Short), wheelchair, call (tel:), per-card voice (own useSpeech, wg-voice-speaking), share via navigator.share -> clipboard + toast("share.copied"), verified line
8. `MistakesTab.tsx` — amber mistake rows
9. `TipsTab.tsx` — useQuery GET /api/tips (queryKey ["tips", serviceId]), skeletons/empty/error states, useMutation POST { targetType:"service", targetId, text, language:lang } with toasts + invalidate; maxLength 400 to match API limit (route rejects >400)

## Wiring verified
- Tabs: shadcn Tabs controlled by activeTab (initialTab ?? "documents"); horizontal scroll via `wg-scroll-x` wrapper, TabsList `bg-muted h-11`, triggers rounded-full with FileText/ListOrdered/Banknote/MapPin/AlertTriangle/MessageSquare icons (size-3.5).
- Tab change calls `useAppStore.getState().replaceTop({ name: "service", serviceId, tab })` — replaces (never pushes) so hardware back returns to previous screen. Celebration CTA does setActiveTab("office") + replaceTop.
- Checklist persists through zustand persist (`checklists[serviceId]` via toggleDoc/setAllDocs). Celebration fires when progress crosses to 1 (prevProgress ref, so not on first load of an already-complete checklist).
- Voice FAB: fixed bottom-20 right-4 z-30, size-13 (52px), hidden when `!supported`, toggles speak/stop of `buildServiceText(service, lang, activeTab, providers)`; Square icon + wg-voice-speaking while speaking; aria-labels service.voiceRead / service.voiceStop; speech stopped on tab change. Per-provider voice buttons use buildProviderText with labels { hours: office.workingHours, phone: common.call, landmark: office.landmark }.
- Reminder: datetime-local Input -> addReminder({ id: crypto.randomUUID fallback Date.now(), serviceId, serviceLabel: pick(name), date, fired:false }) + toast("service.reminderSaved") + best-effort Notification.requestPermission (guarded for old void-returning browsers). Existing reminders listed with delete buttons.
- Hero: Card rounded-3xl overflow-hidden, gradient `from-primary/12 via-transparent to-[#f7c600]/15`, ServiceObject3D size="lg" onActivate={bump} (bump increments key to re-run entrance), fayda/online/estimatedTime/contentPending notes, Disclaimer with lastVerified at bottom.
- Missing service id: card with t("home.noResults") + back Button (store.back()).
- All hooks run before the early return; content wrapped in `mx-auto max-w-xl px-4 pb-24 pt-4`.

## Contracts verified
- Only existing en.json keys used (service.*, steps.*, fees.*, office.*, officeStatus.*, providerType.*, weekday.*[Short], mistakes.*, tips.*, celebration.*, share.copied, common.call/share/close, home.noResults, nav.back).
- API contract cross-checked against existing `src/app/api/tips/route.ts` (GET returns `{ tips }`, POST 5-400 chars) — maxLength set to 400.
- `bunx tsc --noEmit` filtered on components/service -> zero errors (remaining project errors are pre-existing in examples/ and skills/, unrelated).
- No dev/build/lint run. No files touched outside src/components/service/ (+ this record). No emojis; no hard-coded user-facing text (only t()/pick()/data fields; "Fayda" proper noun).
- Reduced motion: framer `useReducedMotion()` guards timeline/overlay/expand animations; confetti omitted; global wg-reduce-motion CSS covers the rest.
