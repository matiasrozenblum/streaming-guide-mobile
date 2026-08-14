# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.19] - 2026-08-13

### Fixed
- **Deslogueo silencioso a los 7 días**: el par access/refresh se guardaba con dos escrituras secuenciales a `SecureStore`. Si la segunda fallaba, el dispositivo quedaba con access token y sin refresh token; una semana después vencía el access, el interceptor de 401 no encontraba refresh y destruía la sesión **sin siquiera llamar a `/auth/refresh`** — un logout sin ningún rastro del lado servidor. Ahora el par se persiste como un único valor JSON, así que la escritura es todo-o-nada y un estado a medio escribir no puede existir. Las sesiones creadas por builds anteriores se migran en la primera lectura.
- **Logout ante errores transitorios**: el `catch` del interceptor borraba los tokens ante *cualquier* fallo del refresh. Ahora solo un 401/403 del backend (o un refresh token genuinamente ausente) termina la sesión; sin conexión, 5xx, respuestas malformadas y fallos de storage dejan los tokens intactos. La escritura de tokens salió del bloque que dispara el logout: un refresh exitoso que no se llega a persistir ya no se confunde con un fallo de autenticación.
- **Push notifications tras el logout**: el registro de push se re-creaba justo después del teardown de sesión. `usePushNotifications` espera hasta 10s a que aparezca el token de FCM, y esa espera podía sobrevivir al logout; como `POST /push/fcm/subscribe` no requiere auth, la re-suscripción funcionaba aun sin sesión. Ahora se re-verifica el estado de auth después de la espera y se aborta si `registerDevice` falló.
- **Dispositivos que quedaban suscriptos para siempre**: `clearSession()` solo corre en la *transición* de logueado a deslogueado, así que un dispositivo que perdía sus tokens entre arranques nunca se desregistraba. Se reconcilia el estado de push en el arranque, lo que además reintenta un unsubscribe que haya fallado al momento del logout. Los dispositivos ya afectados se reparan solos en el primer arranque de esta versión.

### Changed
- **Refresh proactivo al volver a foreground**: antes el refresh solo ocurría de forma reactiva ante un 401, así que los tokens rotaban como mucho una vez cada 7 días y la ventana de 14 días contaba desde el login y no desde el último uso — un usuario activo cada pocos días igual se deslogueaba el día 14. Ahora la sesión se renueva mientras la app se use.
- `registerDevice` ahora envía `platform` y `appVersion`. El backend siempre los aceptó pero nunca se mandaban, dejando `devices.app_version` en NULL para todas las filas e impidiendo saber qué builds siguen en uso.
- `refreshSession()` ya no vuelve a ejecutar todo el flujo de login (que disparaba un evento `login_success` en cada refresh) ni destruye la sesión ante cualquier error.

### Removed
- `src/services/auth.service.ts`, código muerto sin ninguna referencia.

---

## [1.0.18] - 2026-07-25

### Added
- **Zapping tutorial — 2 tooltips de onboarding**: se muestran en la primera apertura del reproductor un tooltip que apunta al botón de zapping, y al abrir el panel de zapping un segundo tooltip que indica que se puede cambiar de canal tocando uno de los canales en vivo. Ambos se persisten en `AsyncStorage` (claves `tooltip_zapping_player_v1` y `tooltip_zapping_panel_v1`) y, si el usuario está autenticado, se sincronizan con el backend vía `POST /users/me/seen-features` para no repetirse en otros dispositivos.

---

## [Unreleased]

### Added
- Datadog Mobile Session Replay enabled with 20% sample rate
- Timezone adaptation: schedule grid now shows times in the user's local timezone for users outside Argentina; 24/7 channels remain timezone-agnostic and always show the live badge + correct stream URL
### Changed
- `mergeTodayIntoWeek` now uses Buenos Aires time (not device local time) to correctly refresh live status for non-ART users
### Fixed
- Analytics events: added `|| 'unknown'` fallback to `channel_name` in `streamer_service_click` event (FavoritesScreen)
- BannerCarousel: replaced `pagingEnabled` with `snapToInterval` to fix previous banner bleeding on left edge during swipe
- ProgramBlock: pass `channelName` as required prop from ProgramRow so analytics events always receive the real channel name
- Android sticky nav: restored overlay for correct touch targets; overlay position driven by Animated.Value (native driver) for smooth scroll tracking with no jump or double-header
- Android sticky nav: category row scroll position preserved when overlay activates; `Animated.timing(duration:0)` correctly resets overlay position after programmatic scroll-to-top on category change
- iOS sticky nav: removed overlay (was never needed on iOS), eliminating category scroll reset and wrong-day highlight when banner scrolled away
- Schedules: deduplicate by composite key after timezone localization to prevent React key collisions from spanning virtual events
### Removed

---

## [1.0.9] - 2026-06-03

### Added
- Zona de overflow en el schedule grid: muestra programas de 00:00–03:59 del día siguiente al final de la grilla
- Indicador visual de programa especial (weekly override): dot naranja o pill con texto "¡Hoy!" / "¡Especial!" / "Cancelado"

### Fixed
- Bordes de program blocks en zona de overflow ahora reflejan correctamente el estado (en vivo, pasado, futuro)
- Badge LIVE en zona de overflow: se muestra cuando el reloj está entre 00:00–03:59 y el programa está en vivo
- Cálculo de `isPast` para programas de overflow corregido (comparación en escala extendida de 28h)
- Corte de palabras en bloques angostos: los títulos ya no se parten en medio de una palabra

---

## [1.0.7] - 2026-04-14

### Added
- Datadog Mobile Session Replay enabled with 20% sample rate

### Fixed
- Analytics events: `channel_name` now passes the real channel name in all program events (`program_subscribe`, `program_unsubscribe`, `click_youtube_live`, `click_youtube_deferred`) — previously always `'unknown'` because `program.channel` was not included in the API response
- Analytics events: added `|| 'unknown'` fallback to `channel_name` in `streamer_service_click` event (FavoritesScreen)
- BannerCarousel: replaced `pagingEnabled` with `snapToInterval` to eliminate adjacent banner bleeding on left edge during swipe; fixed `BANNER_WIDTH` calculation to account for 1px border on each side

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
