# Analysis Report: Streaming Guide Mobile App

## Overview
This document outlines the analysis of the current `streaming-guide-mobile` application in comparison to the web version (`streaming-guide-frontend`). The goal is to identify discrepancies in behavior, UI/UX issues, and areas for improvement to achieve a smooth, native-app experience.

## 1. Banner Carousel Behavior
### Current Implementation
- The `BannerCarousel` is a static component rendered above the `ScheduleGrid`.
- It scrolls horizontally but does not react vertically to the main scroll view.
- **Issue:** Users report "flickering" when scrolling. This is likely due to the `FlashList` re-rendering or layout calculations when the banner is part of the list header but not optimized for native scroll interactions.
- **Missing Feature:** The banner does not "shrink" or collapse upon scrolling down, unlike the web version (or typical mobile patterns like WhatsApp/Twitter headers).

### Expected Behavior
- As the user scrolls down the `ScheduleGrid`, the `BannerCarousel` should smoothly shrink in height and fade out opacity until it disappears or becomes a minimal sticky header.
- Scrolling up should restore it.
- This interaction must be performant (using `Animated` or `Reanimated` with native drivers) to avoid jank.

## 2. Signup / Login Process
### Current Implementation
- Handled via `LoginModal` with steps: Email -> Code -> Profile -> Password.
- **Issue 1 (Keyboard):** The keyboard overlaps critical UI elements (inputs, "Continue" button), especially on smaller screens.
- **Issue 2 (Date Picker):** The date picker (likely native or modal) conflicts with the keyboard. When the keyboard is open, the picker might not be visible or might push the layout incorrectly.
- **Issue 3 (Layout Shift):** Dismissing the keyboard or showing the picker causes layout shifts that push the "Continue" button off-screen.
- **Issue 4 (Gender Selection):** The backend expects specific values (e.g., `male`, `female`), but the frontend might be sending display labels (`Masculino`, `Femenino`) or incorrect keys, causing registration failures.

### Expected Behavior
- **Keyboard Handling:** The modal should use `KeyboardAvoidingView` or `KeyboardAwareScrollView` to ensure the active input and action buttons remain visible.
- **Date Picker:** Interacting with the date picker should automatically dismiss the keyboard first.
- **Gender Data:** The selection component must map display labels to the exact enum values required by the V2 API.

## 3. Data Fetching & V2 Endpoints
- **Observation:** The app correctly uses V2 endpoints (`/channels/with-schedules/today/v2`) which are optimized for mobile.
- **Strategy:**
  - **Live Status:** The app merges "today" data with "week" data to keep live status fresh. This is a good pattern.
  - **Performance:** Initial load uses a "stale-while-revalidate" strategy (cache first, then network). This is excellent for perceived performance.

## 4. General UI/UX & Native Feel
- **Scrolling:** The horizontal `ScheduleGrid` (time axis) and vertical list (channels) must be synchronized perfectly. The current implementation uses `Animated.event` for sync, which is correct but needs tuning for the banner interaction.
- **Safe Area:** Ensure `SafeAreaView` is used correctly on all screens (especially modals) to avoid notches/home indicators.

## Action Plan
1. **Refactor Banner:** Implement a collapsing header animation linked to the scroll Y offset of the `FlashList`.
2. **Fix Login Modal:** Wrap the content in a keyboard-aware container. Fix the gender value mapping. Ensure date picker visibility.
3. **Verify API Data:** Double-check that all `POST` bodies (registration, login) match the V2 API expectations exactly.
