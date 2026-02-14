# Banner Spec: Two-State Collapsible Header

## Objective
Refine the collapsible banner behavior on `HomeScreen`. The banner currently "stutters" and has flaky intermediate states. The goal is to enforce a strict **two-state behavior**:
1. **Visible (Top):** When the user is at the very top of the list (`scrollY = 0`).
2. **Hidden (Scrolled):** As soon as the user scrolls down (`scrollY > 0`), the banner should animate out completely.
3. **Transition:** A smooth but decisive transition between these two states. The banner should *never* remain partially collapsed or "stuck" in the middle.

## Technical Details

### 1. Scroll Detection
- **Source of Truth:** The vertical scroll offset (`scrollY`) of the `FlashList` in `ScheduleGrid`.
- **Implementation:** `Animated.event` or `Reanimated` scroll handler.
- **Logic:**
  - Track `scrollY`.
  - Trigger transition based on a minimal threshold (e.g., `10px`).
  - If `scrollY > THRESHOLD`, set banner state to `HIDDEN`.
  - If `scrollY <= THRESHOLD` (scrolling back to top), set banner state to `VISIBLE`.

### 2. Animation Strategy
- **File:** `src/components/BannerCarousel.tsx` or a wrapper component (e.g., `CollapsibleBanner`).
- **State:** Use a derived animated value (0 or 1) driven by the scroll position, or a simple `useState` boolean triggered by the scroll listener (if performance allows, though direct Animated/Reanimated logic is preferred for 60fps).
- **Transitions:**
  - **Expand (Visible):** Animate height from `0` to `BANNER_HEIGHT` and opacity `0` to `1`.
  - **Collapse (Hidden):** Animate height from `BANNER_HEIGHT` to `0` and opacity `1` to `0`.
  - **Timing:** Fast, smooth spring or timing animation (e.g., `duration: 300ms`).
  - **Crucial:** The animation must complete fully. No "scrubbing" behavior where the user's finger drags the banner height. The scroll action acts as a *trigger* for the state change.

### 3. ScheduleGrid Integration
- **Structure:**
  ```tsx
  <View style={{ flex: 1 }}>
    <CollapsibleBanner isVisible={isAtTop} />
    <ScheduleGrid onScroll={handleScroll} ... />
  </View>
  ```
- **Handling Scroll:**
  - The `ScheduleGrid` (FlashList) needs to report its scroll position.
  - Since we want a "trigger" behavior, we might need `onScroll` to update a shared value or state.
  - **Refinement:** To avoid jitter, use a small hysteresis or "throttle".
    - `scrolling down` -> Hide immediately.
    - `scrolling up` -> Only show when *reaching* the top (e.g., `scrollY < 5`).
  - **Sticky Header:** The `DaySelector` / `CategorySelector` (sticky header) must pin to the top of the screen seamlessly as the banner disappears.

### 4. Layout & Stutter Fix
- **Cause of Stutter:** Currently, the banner is likely part of the list header. When it resizes, the list content jumps or recalculates layout sluggishly.
- **Fix:** Move the banner **outside** the `FlashList`. It should be a sibling component above the list.
- **Pushing Content:**
  - The list should **not** have a top padding that equals the banner height (otherwise there's a gap when banner hides).
  - Instead, the Banner pushes the List down. When Banner height -> 0, List moves up naturally.
  - *Wait:* If Banner is sibling and shrinks, List moves up. This is correct.
  - **Sync:** The tricky part is ensuring the scroll momentum doesn't fight the layout change.
  - **Alternative (Overlay):**
    - List has `contentContainerStyle={{ paddingTop: BANNER_HEIGHT }}`.
    - Banner is `absolute` positioned at top.
    - When scrolling down, Banner fades out/translates up.
    - *Problem:* Sticky headers in the list (Days/Categories) would need to stick *below* the banner or at top:0.
    - *Decision:* The standard approach is simpler: Sibling layout.
      - `<Animated.View style={{ height: animatedHeight }}><Banner /></Animated.View>`
      - `<FlashList ... />`
      - When `animatedHeight` changes, the FlashList layout updates. This might cause a jump if not careful.
      - **Best for smoothness:**
        - Keep Banner in the list header? No, that's the current flaky behavior.
        - **Revised:**
          - Banner is `absolute` positioned behind the list? No.
          - **Preferred:** Use `Animated.View` wrapping the banner.
          - Use `LayoutAnimation` or Reanimated for the height change.

## Expected Outcome
- **User starts at top:** Banner visible.
- **User scrolls down:** Banner immediately animates to closed (height 0). Sticky header (Days) pins to top.
- **User scrolls middle:** Banner remains hidden.
- **User scrolls to top:** As `scrollY` hits 0, Banner animates open.
- **Feel:** Snappy, predictable. No partial visibility.
