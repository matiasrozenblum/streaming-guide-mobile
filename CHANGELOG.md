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

## [1.0.3] - 2026-03-29

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
