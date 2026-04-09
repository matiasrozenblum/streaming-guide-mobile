You are a senior mobile engineer executing a task on La Guia del Streaming mobile app (React Native + Expo SDK 54).

## Task: $ARGUMENTS

---

## Phase 1 — Analysis

Use an Explore subagent to understand the task scope:
- Which screens/components are affected?
- Are there similar patterns already in the codebase to follow?
- Does this require a new API endpoint or change to an existing one?
- Are there platform-specific concerns (iOS vs Android)?
- Are there any UI components on the website (`streaming-guide-frontend`) to reference?

---

## Phase 2 — Plan (checkpoint)

Before writing any code, present a plan to the user:

1. **Branch type**: `feature/`, `fix/`, `chore/`
2. **Files to create or modify**
3. **API changes**: new endpoints, changed payloads, new query params
4. **iOS vs Android impact**: platform-specific behavior, safe area, navigation bar
5. **State/cache impact**: Redux slices, CacheService TTLs affected
6. **Push notification impact** (if any)

**Wait for user approval before proceeding.**

---

## Phase 3 — Implementation

Follow project conventions strictly:
- Functional components + hooks only
- Colors: always use `getTheme('dark')` tokens from `src/theme/` — no hardcoded colors
- Safe area: `useSafeAreaInsets()` for device-specific spacing
- Platform checks: `Platform.OS === 'ios'` / `'android'`
- Tab bar height: account for 68px bottom padding where needed
- Navigation: React Navigation patterns in `src/navigation/`
- API calls: through service layer in `src/services/`
- Cache: use `CacheService` for data that benefits from caching
- AsyncStorage keys: prefix with `@` (e.g., `@push_permission_prompted`)
- Lists: use `FlatList` or `FlashList` for long lists, never `ScrollView` for dynamic content
- Fonts: Inter/Roboto for body, Outfit for headings

Read each file before editing it.

---

## Phase 4 — Review

Self-review the changes against these criteria:

**Correctness**
- Logic correct for both iOS and Android?
- Async operations have error handling?
- State updates don't cause unnecessary re-renders?

**Performance**
- No missing `useMemo` / `useCallback` on expensive operations?
- Large lists use FlatList/FlashList?
- Images properly sized and cached?

**Accessibility**
- Interactive elements have `accessibilityLabel`?
- `accessibilityRole` set correctly (button, header, image, etc.)?
- Touch targets at least 44x44px?

**TypeScript**
- No `any` unless explicitly justified with a comment?
- Props interfaces defined for all components?
- API response types match actual backend shape?

**Design fidelity**
- Matches website mobile layout?
- Uses theme tokens exclusively?
- Dark theme colors correct?

Report findings with severity: BLOCKER / WARNING / SUGGESTION / GOOD.
Fix all BLOCKERs before proceeding.

---

## Phase 5 — Validate

Run in sequence:

```bash
npx tsc --noEmit
```

Report any failures and fix them before continuing.

Also verify manually:
- No `console.log` left (except tagged `[Push]` or `[Perf]` logs)
- No unused imports
- No hardcoded colors
- Cross-repo: if new API calls were added, confirm the backend endpoint exists

---

## Phase 6 — Changelog

Update `CHANGELOG.md`:
- Add entry under `[Unreleased]` section
- Categorize as Added / Changed / Fixed / Removed
- Keep it concise — one line per change

---

## Phase 7 — Deploy to emulators

Run both emulators with the staging variant:

```bash
APP_VARIANT=staging npx expo run:android
APP_VARIANT=staging npx expo run:ios
```

Tell the user: "Changes are running on both emulators. Please review on Android and iOS and share your feedback."

---

## Phase 8 — Feedback loop

Wait for user feedback from the emulators.
- If changes needed: go back to Phase 3, implement, re-validate, re-run emulators.
- If approved: proceed to Phase 9.

---

## Phase 9 — Merge to develop

Once the user approves:

1. Commit all changes with a descriptive message
2. Push the feature branch: `git push origin <branch>`
3. Merge to develop:
   ```bash
   git checkout develop && git pull origin develop
   git merge <feature-branch>
   git push origin develop
   ```
4. Ask the user: "Do you want to create a release? If so, use `/release X.Y.Z` to trigger the full release workflow (CHANGELOG, EAS builds, PR to main)."
