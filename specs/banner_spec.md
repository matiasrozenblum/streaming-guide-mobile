# Banner Spec: Collapsible Header Animation

## Objective
Implement a collapsible banner header on the `HomeScreen` that responds to the vertical scrolling of the `ScheduleGrid`. The banner should shrink and fade out as the user scrolls down, and expand/fade in when scrolling back up to the top. This mimics the "shrinking header" behavior common in mobile apps and the web version.

## Technical Details

### 1. Animated Scroll Value
- **Source of Truth:** The vertical scroll offset (`scrollY`) of the `FlashList` in `ScheduleGrid`.
- **Implementation:** Use `React Native Animated` API (or `Reanimated` if performance requires it, but `Animated` is sufficient for simple opacity/transform).
- **Binding:** Attach an `Animated.event` listener to the `onScroll` prop of the `FlashList`.

### 2. Banner Component Updates
- **File:** `src/components/BannerCarousel.tsx`
- **Props:** Accept an `animatedValue` (scrollY) prop.
- **Render:** Wrap the main container in an `Animated.View`.
- **Interpolation:**
  - **Opacity:**
    - Input Range: `[0, 100]` (scroll distance in pixels)
    - Output Range: `[1, 0]` (fully visible to invisible)
    - Extrapolate: `Clamp`
  - **Height / Scale:**
    - Input Range: `[0, 100]`
    - Output Range: `[BANNER_HEIGHT, 0]` (full height to zero)
    - Extrapolate: `Clamp`
  - **TranslateY:**
    - Input Range: `[0, 100]`
    - Output Range: `[0, -50]` (slide up slightly as it fades)
    - Extrapolate: `Clamp`

### 3. ScheduleGrid Integration
- **File:** `src/components/ScheduleGrid/ScheduleGrid.tsx`
- **State:** Lift the `scrollY` animated value to this component or `HomeScreen` to pass it down.
- **Render:**
  - The `BannerCarousel` is currently rendered as an item in the `FlashList` (`type: 'BANNER'`). This causes it to scroll *with* the list content naturally.
  - **Change Required:** To make it "sticky" but collapsing, it might be better placed *outside* the `FlashList` as a sibling, with the list having `contentContainerStyle={{ paddingTop: BANNER_HEIGHT }}`.
  - **Alternative (Simpler):** Keep it in the list but animate its style. However, standard list items don't "stick" or collapse easily without jarring reflows.
  - **Proposed Solution:** Move `BannerCarousel` out of the `FlashList` data. Place it absolutely positioned or as a sibling above the list. Use `Animated.ScrollView` or `Animated.FlashList` onScroll event to drive the banner's height/opacity.

  **New Layout Structure (HomeScreen):**
  ```tsx
  <View style={{ flex: 1 }}>
    <AnimatedBanner scrollY={scrollY} />
    <ScheduleGrid onScroll={Animated.event(...)} ... />
  </View>
  ```

  **ScheduleGrid Prop Updates:**
  - Add `onScroll` prop to pass the event handler back up (or accept `scrollY` animated value to attach directly).
  - Add `contentContainerStyle` with top padding equal to `MAX_BANNER_HEIGHT` so the first list item isn't hidden behind the banner initially.

### 4. Interactions
- **Touching the Banner:** It should remain touchable when visible.
- **Scroll Sync:** Ensure horizontal scrolling of the grid (time axis) doesn't interfere with the vertical collapse trigger.

## Expected Outcome
- **Scroll Down:** Banner smoothly shrinks and fades out. The sticky header (Dates/Categories) moves up and pins to the top *under* the status bar (or replaces the banner area).
- **Scroll Up:** Banner expands and fades in.
- **Performance:** 60fps animations using native driver where possible (opacity, transform). Height animation might need non-native driver or layout animation, but opacity/translate is preferred for smoothness.
