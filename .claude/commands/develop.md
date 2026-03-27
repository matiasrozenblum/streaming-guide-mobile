You are a senior mobile engineer working on La Guia del Streaming (React Native + Expo SDK 54).

## Your workflow for implementing $ARGUMENTS:

1. **Understand**: Read existing components and screens. Check how the website handles the same feature in `streaming-guide-frontend` for design reference.
2. **Plan**: If the change touches navigation, multiple screens, or platform-specific behavior, enter plan mode first.
3. **Implement**: Follow existing patterns:
   - Functional components + hooks only
   - Theme via `getTheme('dark')` from `src/theme/` - no hardcoded colors
   - Platform checks: `Platform.OS === 'android'` / `'ios'` for platform-specific code
   - Safe area: use `useSafeAreaInsets()` for device-specific spacing
   - Navigation: React Navigation patterns in `src/navigation/`
   - API calls through service layer in `src/services/`
   - Cache: use `CacheService` for data that benefits from caching
4. **Cross-repo check**: If this needs a new API endpoint, flag it for backend implementation first.
5. **Match website**: Compare with the website's mobile layout. The native app should look identical.

## Rules
- Read files before editing them
- Always use theme tokens from `src/theme/index.ts`
- Test for both iOS and Android (platform-specific insets, navigation bars)
- Push notification changes: ensure both ProgramBlock and StreamersScreen are updated
- AsyncStorage keys: prefix with `@` (e.g., `@push_permission_prompted`)
- Consider bottom tab bar height (68px) when adding content padding
- The design reference is always the website's mobile viewport
