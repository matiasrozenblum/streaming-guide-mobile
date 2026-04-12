You are a senior mobile engineer executing a multi-session story on La Guia del Streaming mobile app (React Native + Expo SDK 54).

## Story: $ARGUMENTS

Stories are long-running tasks that span multiple sessions. State is persisted in `STORY.md` at the repo root.

---

## Resume mode

If $ARGUMENTS is `resume` (i.e., `/story resume`):
1. Read `STORY.md` to restore context
2. Summarize current state: what was done, what's pending
3. Continue from where the story left off
4. Do NOT re-run phases that are already marked ✅

---

## Starting a new story

If STORY.md doesn't exist, create it with this template:

```markdown
# Story: <title>

## Status
Phase: 1 — Analysis
Started: <date>
Last updated: <date>

## Goal
<one paragraph describing what this story accomplishes>

## Phases
- [ ] Phase 1: Analysis
- [ ] Phase 2: Plan (approved by user)
- [ ] Phase 3: Implementation
- [ ] Phase 4: Review
- [ ] Phase 5: Validate
- [ ] Phase 6: Changelog
- [ ] Phase 7: Emulator deploy
- [ ] Phase 8: Feedback loop
- [ ] Phase 9: Merge to develop

## Branch
`feature/<name>`

## Key decisions
<!-- Record architecture decisions, API changes, platform-specific choices here -->

## Open questions
<!-- Things pending user input or backend changes -->

## Session log
<!-- Append a one-line summary after each session -->
```

---

## Workflow phases

### Phase 1 — Analysis
Use an Explore subagent:
- Which screens/components are affected?
- Similar patterns already in the codebase?
- New API endpoint needed or change to existing one?
- iOS vs Android concerns?
- Website reference in `streaming-guide-frontend`?

Update STORY.md: mark Phase 1 ✅, record key findings under "Key decisions".

---

### Phase 2 — Plan (checkpoint)

Present to user:
1. **Branch type**: `feature/`, `fix/`, `chore/`
2. **Files to create or modify**
3. **API changes**: endpoints, payloads, query params
4. **iOS vs Android impact**: safe area, navigation bar, platform-specific behavior
5. **State/cache impact**: Redux slices, CacheService TTLs
6. **Push notification impact** (if any)

**Wait for user approval before proceeding.**

Update STORY.md: mark Phase 2 ✅, record branch name and plan summary.

---

### Phase 3 — Implementation

Follow project conventions:
- Functional components + hooks only
- Colors: `getTheme('dark')` tokens from `src/theme/` — no hardcoded colors
- Safe area: `useSafeAreaInsets()`
- Platform checks: `Platform.OS === 'ios'` / `'android'`
- Tab bar height: 68px bottom padding where needed
- API calls via `src/services/`
- Cache via `CacheService`
- AsyncStorage keys prefixed with `@`
- Lists: `FlatList` or `FlashList` — not `ScrollView` for dynamic content
- Fonts: Inter/Roboto body, Outfit headings

Read each file before editing.

Update STORY.md after each significant change: what was implemented, what's left.

---

### Phase 4 — Review

Self-review:

**Correctness** — logic correct for iOS and Android? error handling on async?

**Performance** — `useMemo`/`useCallback` where needed? FlatList for lists?

**Accessibility** — `accessibilityLabel`, `accessibilityRole`, 44x44px touch targets?

**TypeScript** — no untyped `any`? props interfaces defined? API types match backend?

**Design fidelity** — matches website mobile layout? theme tokens only?

Severity: BLOCKER / WARNING / SUGGESTION / GOOD. Fix all BLOCKERs.

Update STORY.md: mark Phase 4 ✅.

---

### Phase 5 — Validate

```bash
npx tsc --noEmit
```

Fix all failures. Check: no stray `console.log`, no unused imports, no hardcoded colors, backend endpoints exist for new API calls.

Update STORY.md: mark Phase 5 ✅.

---

### Phase 6 — Changelog

Update `CHANGELOG.md` under `[Unreleased]`: Added / Changed / Fixed / Removed.

Update STORY.md: mark Phase 6 ✅.

---

### Phase 7 — Deploy to emulators

```bash
APP_VARIANT=staging npx expo run:android
APP_VARIANT=staging npx expo run:ios
```

Tell the user: "Changes are running on both emulators. Please review on Android and iOS and share your feedback."

Update STORY.md: mark Phase 7 ✅, record date.

---

### Phase 8 — Feedback loop

Wait for user feedback.
- Changes needed → back to Phase 3, update STORY.md, re-validate, re-deploy.
- Approved → Phase 9.

Append to STORY.md session log: `<date> — <one-line summary of what changed this session>`.

---

### Phase 9 — Merge to develop

1. Commit all changes
2. `git push origin <branch>`
3. Merge to develop:
   ```bash
   git checkout develop && git pull origin develop
   git merge <feature-branch>
   git push origin develop
   ```
4. Mark all phases ✅ in STORY.md
5. Ask: "Do you want to create a release? Use `/release X.Y.Z`."

---

## Important

- Update STORY.md at the end of **every session**, even partial ones.
- STORY.md is gitignored — it's your working memory across sessions.
- Never skip a phase without noting why in STORY.md.
