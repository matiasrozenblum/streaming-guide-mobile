# La Guia del Streaming - Mobile App

## Project Overview
React Native mobile app (iOS + Android) built with Expo.
Must match the website's mobile layout as closely as possible.

## Tech Stack
- **Framework**: Expo SDK 54, React Native 0.81, React 19
- **Navigation**: React Navigation (bottom tabs + native stack)
- **UI**: React Native Paper 5
- **State**: Redux Toolkit + AsyncStorage (local cache)
- **Push**: Firebase Cloud Messaging (@react-native-firebase/messaging)
- **Auth**: Google Sign-In, Apple Authentication, JWT
- **Video**: react-native-youtube-iframe
- **Analytics**: PostHog React Native
- **Dates**: dayjs

## App Variants (`APP_VARIANT` env in `app.config.ts`)
- `development` - `com.laguiadelstreaming.app.dev`
- `staging` - `com.laguiadelstreaming.app.staging`
- `production` - `com.laguiadelstreaming.app`

## Design Tokens (Must Match Website)
- Dark: bg `#0f172a`, surface `#1e293b`, primary `#3b82f6`
- Text: primary `#f1f5f9`, secondary `#cbd5e1`
- Live: `#F44336`, Offline: `#6B7280`
- Theme in `src/theme/index.ts` (`getTheme('dark')`)
- Currently dark mode only

## Coding Conventions
- Functional components + hooks only
- Theme: always use `getTheme()` tokens, no hardcoded colors in new code
- Platform-specific: use `Platform.OS` checks (e.g., safe area insets for Android vs iOS)
- Push: permission requested on first launch + on subscribe if denied
- SSE: `useLiveStatus` hook for real-time live status
- Cache: `CacheService` with AsyncStorage, TTL, stale-while-revalidate
- Navigation: TabNavigator (Canales, Streamers) inside AppNavigator

## Key Paths
- `src/screens/` - HomeScreen, StreamersScreen
- `src/components/` - Header, ScheduleGrid/, ProgramBlock, BannerCarousel, CategorySelector
- `src/hooks/` - usePushNotifications, useLiveStatus
- `src/services/` - API services (schedule, device, streamer, subscriptions, cache)
- `src/navigation/` - TabNavigator, AppNavigator, NavigationService
- `src/context/` - AuthContext, LoginModalContext, VideoPlayerContext
- `src/theme/` - Theme tokens and configuration
- `app.config.ts` - Expo config with variant support

## Scripts
- `npm run start:staging` - Dev server (staging variant)
- `npm run ios:staging` / `android:staging` - Run on platform
- `npm run build:ios` / `build:android` - EAS build

## Cross-Repo Context
- Backend: `streaming-guide-backend` (NestJS on Railway)
- Frontend: `streaming-guide-frontend` (design reference)
- Staging API: `https://streaming-guide-backend-staging.up.railway.app`
- When the website's mobile layout changes, replicate in this app
