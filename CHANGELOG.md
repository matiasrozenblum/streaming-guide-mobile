# Changelog

Todas las modificaciones importantes de este proyecto se documentarán en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/)
y este proyecto utiliza [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added

### Changed

### Removed

### Fixed

---

## [1.0.2] - 2026-03-26

### Added
- Push notification permissions: request on first launch + on subscribe if denied
- Push permission check on both program and streamer subscriptions
- Alert with "Go to Settings" when notifications are denied
- SSE live status updates (replaces polling)
- Notification bell on programs with subscription toggle
- Login modal accessible from any screen
- Banner carousel with auto-scroll
- Category filter tabs with bottom indicators
- Day selector for weekly schedule navigation
- Streamer cards with live status and subscription support
- Holiday and seasonal dialogs
- PostHog analytics integration
- Legal footer
- AsyncStorage cache with stale-while-revalidate pattern

### Changed
- Optimized initial load using V2 today endpoint (5.2x faster)
- Platform-specific safe area handling (Android insets.bottom vs iOS)
- Tab bar sizing conditional on platform

### Fixed
- Bottom tab bar height on iOS (removed unnecessary Android insets)
- Push notifications on Android 13+ (POST_NOTIFICATIONS permission handling)

## [1.0.1] - 2026-03-20

### Added
- Initial App Store release
- Schedule grid with channel logos and program blocks
- YouTube video player integration
- Streamers screen with Twitch/Kick integration
- User authentication (email + password)
- Dark theme matching website design
