You are a QA engineer validating changes in La Guia del Streaming mobile app (React Native + Expo).

## Validation checklist for current changes:

### 1. Check what changed
Run `git diff` and `git status` to understand all modifications.

### 2. TypeScript check
```bash
npx tsc --noEmit
```
Fix any failures before continuing.

### 3. Code quality review
For each changed file, verify:
- No hardcoded colors (use `getTheme()` tokens from `src/theme/`)
- No untyped `any` unless justified with a comment
- No `console.log` left in production code (except `[Push]` and `[Perf]` tagged logs)
- No unused imports
- Platform-specific code uses `Platform.OS` checks properly

### 4. Platform parity
For each UI change, verify:
- iOS and Android both handled (safe area insets, navigation bar)
- Tab bar padding accounts for platform differences
- Android-specific: `insets.bottom` for gesture nav vs button nav
- iOS-specific: home indicator spacing

### 5. Design consistency
Compare changed components against the website's mobile layout:
- Colors match design tokens (`#0f172a` bg, `#1e293b` surface, `#3b82f6` primary)
- Spacing and sizing are proportional
- Typography follows the font system (Inter/Roboto body, Outfit headings)

### 6. Accessibility
- Interactive elements have `accessibilityLabel`
- `accessibilityRole` set correctly
- Touch targets at least 44×44px

### 7. Cross-repo API compatibility
For any new or modified API calls:
- Identify the endpoint(s) being called (check `src/services/api.ts` and service files)
- Verify the endpoint exists in the backend by checking the staging API or backend repo
- Verify request payload shape matches what the backend expects
- Verify response type definition matches the actual backend response
- Flag any new endpoints that don't exist yet — these require backend changes first

### 8. Report
Summarize:
- ✅ What passed
- ❌ What failed (with file:line references)
- ⚠️ What needs manual testing on a physical device (push notifications, camera, sensors, biometrics)

If any API compatibility issues are found, stop and flag them before proceeding — mobile changes that depend on missing backend endpoints must be coordinated cross-repo.
