# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
### Changed
### Fixed
### Removed

---

## [1.0.6] - 2026-04-12

### Added
- Datadog RUM integration: dual-tracks all events (screen views, custom actions, user identification) alongside PostHog and Firebase Analytics, enriching every action with user context (id, gender, age, age_group, role) matching the web frontend

### Fixed
- Style override indicator (team colors) now renders as a compact dot in overlapping/stacked program blocks instead of a full band that clutters the compressed view
- Schedule lane assignment uses greedy interval graph coloring (matching the web), fixing lane over-count when non-overlapping programs shared a common overlap partner

---

## [1.0.5] - 2026-04-07

### Fixed
- Overlapping programs in the same channel row now stack vertically instead of
  rendering on top of each other — matches the web layout (equal-height sub-rows,
  sorted by start time)
- Pull-to-refresh broken on iOS after 1.0.3 — bounces were disabled which suppressed
  the pull gesture; now enables bouncing on iOS when a refresh handler is present
- Programs longer than 6 hours are now split into equal-width segments so the title
  is always visible within the viewport — matches web mobile behavior (6h threshold)
- Past/future/live styling for program blocks and time header when viewing non-today days
- Android text clipping in overlapping (stacked) program blocks
- Duplicate schedule IDs when navigating to non-today days — mergeTodayIntoWeek
  was including multi-day schedules from the today/v2 endpoint causing React key conflicts

---

## [1.0.4] - 2026-04-06

### Fixed
- Overlapping programs in the same channel row now stack vertically instead of
  rendering on top of each other — matches the web layout (equal-height sub-rows,
  sorted by start time)
- Pull-to-refresh broken on iOS — `bounces={false}` was silently suppressing the
  pull gesture; now enables bouncing on iOS when a refresh handler is present
- Programs longer than 6 hours are now split into equal-width segments that each
  show the program title, matching the web layout and ensuring titles are always
  visible within the viewport
- Fixed multi stream program block UI
- Fixed past, present and future styles


---

## [1.0.3] - 2026-04-03

### Added
- Post-auth subscribe: when a logged-out user taps the bell or subscribe button,
  the action is queued and executed automatically after successful login/register
- Pull-to-refresh spinner now uses brand colors (blue spinner on dark background)
  instead of the default system style

### Changed
- Profile screen: gender field is now editable via dropdown menu
- Profile screen: birth date is now editable via native DateTimePicker (same UX
  as registration flow)
- Profile screen: removed redundant title/back button (header handled by navigation)
- Profile screen: password fields no longer auto-capitalize
- Profile screen: success feedback now uses an in-app Snackbar instead of a
  system Alert
- After account deletion, user is redirected to the home screen instead of staying
  on the (now meaningless) Profile screen
- Holiday dialog now shown only once per day — not on every app reload

### Fixed
- Day selector buttons (L/M/X/J/V/S/D) now work correctly regardless of vertical
  scroll position — fixed via nav overlay approach that avoids the React Native
  stickyHeaderIndices touch-offset bug on Android
- EN VIVO FAB now correctly positioned on Android with 3-button navigation bar
  (dynamic bottom inset via useSafeAreaInsets)
- EN VIVO button now resets to today's day when viewing a different day, matching
  web behavior
- YouTube live stream video no longer freezes and disappears after ~3 minutes —
  removed androidLayerType: 'hardware' which caused Android compositor layer
  recycling; added auto-remount recovery for both Android (onRenderProcessGone)
  and iOS (onContentProcessDidTerminate)
- Splash screen background no longer shows a white box behind the logo on iOS —
  dark background baked directly into the splash asset
- Birth date timezone bug: date no longer shows one day off due to UTC midnight
  parsing — normalized to local noon on both load and picker selection
- Push notification permission dialog on Android was silently skipped for users
  who had the permission flag set before the fix — switched to expo-notifications
  API which is more reliable on Android 13+; flag now set after the dialog returns
- On logout, FCM token is unregistered from the backend so push notifications
  are no longer delivered to signed-out users
- Bell (notification) button in program tooltip now always appears on the right
  side, regardless of whether a playlist/stream button is present
