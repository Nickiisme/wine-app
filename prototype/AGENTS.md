# Mobile Prototype Agent Guide

## Prototype Instructions

### Wine Explorer Product Decisions

- Profile menu rows share the same single-line title typography and row height. Place drinking-activity descriptions and cellar counts on the right in small muted text before the chevron, never below the title.

- Profile includes “饮酒足迹” with record-derived drinking days, tasting counts, frequency charts, and a selectable monthly calendar. Count multiple tastings on one date as one drinking day, use tasting dates, and never infer consumption volume or reward drinking streaks.
- Tasting dates are chosen above the experience questions, default to today, and cannot be future dates. Keep the chosen calendar date (`tasted_on`) separate from the creation timestamp; use it for timelines, footprints, and tasting badges. Editing preserves field provenance unless that field is explicitly changed. Single-record deletion is soft deletion; exclude deleted records from aggregates and never undo cellar stock movements. Do not claim cloud cleanup or account erasure is available until the server workflow is deployed and verified.

- The home screen is an immersive, vertically scrolling grape atlas rather than a dashboard or task list.
- The home grape atlas shows unlocked varieties, 6–8 rule-based exploration suggestions, and a link to a separate all-varieties page; do not render the full catalog on the home route. With no records, suggest the six beginner classics. Recommendations invite comparison and never assert a user preference.
- The catalog has 24 data-defined core varieties in four chapters. Normalize Chinese/English aliases and count each variety at most once per record. Recognized non-core varieties enter the user's “特别发现” collection upon saving; unknown or uncertain values do not. A first special discovery gets a one-time success message, and details without vetted catalog content show only recorded facts and a pending-information message.
- Use warm ivory paper, wine red, muted sage, generous whitespace, and small botanical grape illustrations.
- Unlocked varieties each use a distinct, botanically differentiated illustration. Locked varieties all use one generic muted grape treatment while clearly showing the varietal name and `待探索` state.
- Unlocking is immediate and restrained: update the node and show a short confirmation, without growth, fill, or elaborate reveal animation.
- Keep bottom navigation to Explore, a central record action, and Profile. Explore switches between the grape atlas and region map.
- Keep the grape-atlas / region-map switcher sticky at the top after the user scrolls past the home greeting.
- The region-map tab supports scrolling the greeting out of view until the atlas tabs pin at the top, exposing a taller map. At world scale, a vertical swipe on the map may scroll the page; at enlarged scales, drag continues to pan the map. Cellar purchase forms keep their save/add action in a separate bottom bar that clears the visible keyboard and safe area.
- Present stage-based guidance such as “light up your first grape” and “explore your next glass” as dismissible phone-scoped overlays, not inline cards that interrupt the atlas layout.
- When a guest opens Settings, lead directly with separate Login and Register choices. Do not show cloud-sync, data-ownership, or other signed-in account-management details until the user is authenticated.
- In signed-in Settings, omit the static cloud-sync and data-ownership rows; keep actionable sync-error messages visible. On a selected-region map view, show the region name only in the header and omit the redundant tasting count and zoom-text action; keep the grape facts and tasting-notes entry.
- Successful authentication must remain successful if profile upsert, tasting reload, or cellar reload fails. Report synchronization issues separately in signed-in Settings, load records in the background, and clear the previous identity's records when switching accounts. Ignore stale account-load responses.
- Do not use progress bars, percentages, streaks, checklists, lessons, coins, rankings, or persistent task cards.
- A new tasting record starts with no year, grape, country, region, preference, body value, or flavor selected. Preserve field provenance (`user_selected`, `label_scan`, `inferred`, or `default`) and confirmation state; only explicitly confirmed data may contribute to personal preference calculations.
- Allow low-input `quick_save` records, but require at least one photo, wine-information field, user experience field, or note. Personal feedback must use only confirmed `user_selected` experience fields; keep varietal knowledge and typical aromas visibly separate from user taste conclusions.
- On the tasting screen, let a beginner choose body directly without an extra activation step, and give preference, body, and flavor choices clear tap feedback. After the first record saves, show the actual “初次举杯” badge artwork immediately in the festive popup; show any first taste insight on the underlying success screen so earning the badge requires no second tap.
- The tasting screen's four question headings stand without instructional helper lines; the optional note heading is “记录更多”. Body is a five-stop, directly draggable and tappable slider (not a progress indicator); keep its selection optional, preserve the existing five stored values, and allow clearing it.
- In the tasting flavor selector, selected groups use the existing visual state without an inline “已选” label; the heading may show a concise numeric count instead.
- Keep the tasting screen's save action visible above the bottom safe area while the note and photos scroll; do not add decorative red dots to selected taste choices.
- Keep the tasting screen's title and back button pinned above its scrolling questions. Do not show a generic “all fields start empty” helper on the manual confirmation screen; keep the scan-specific confirmation explanation only when a label photo exists.
- Use the same pinned header height and top alignment on the confirmation and tasting screens. The tasting save action belongs at the bottom of the visible app viewport, including after the phone's real keyboard closes; do not let hidden preview-keyboard state lift it into the form.
- On the region map, pinch/double-tap zoom enlarges the geography while country labels stay at a readable fixed size. Long bilingual selections and picker searches must not zoom or horizontally expand the mobile page.
- Wine-information pickers (grapes, countries, regions) should be compact at rest, around 62% of the phone viewport with internally scrolling options; expand while searching to keep search and completion controls visible.
- Keep the 24-core grape atlas distinct from wine-entry coverage. In tasting and cellar confirmation, search the curated grape/region suggestions and offer a clearly labeled original-text entry when a name is missing; custom grapes are saved but remain outside verified atlas/badge recognition until cataloged. Require a country before entering a custom region; do not claim the suggestion list covers every global variety or appellation.
- In both wine-confirmation flows, searchable pickers use a stable phone-scoped surface anchored to the bottom even while typing; do not leave a floating gap below the picker. Keep the search field visible while only the option list scrolls, and return controls to their normal positions when the real keyboard closes.
- In Profile > Footprints, tasting records open the newest-first timeline directly. Grapes and regions first open their own record-derived summaries, then a grape or country/region opens the same timeline filtered to that selection. Summary likes and recurring flavors must come only from confirmed, user-selected experience fields.
- Record edit/delete actions stay in a drawer revealed by a 500ms long press or right swipe; vertical scrolling must not reveal it. Keep an accessible overflow button and deletion confirmation. Wine-label capture supports an inline camera preview, retake and photo confirmation, with system-camera/gallery fallback; release camera tracks on capture, closing, or leaving the page.
- The world wine footprint map keeps pinch/double-tap zoom and drag, but does not display the instructional sentence about these gestures.
- Wine-label capture uses a full-height camera surface: close at the top, live view with four label-frame corners and one instruction, then an ivory bottom panel with album, circular shutter, and a small manual-entry link. Preserve retake, photo confirmation, system-camera fallback, and camera-track cleanup for both tasting and cellar entry.
- Opening wine-label capture automatically requests camera permission and starts the live preview after approval; do not require an extra start-camera tap. If permission fails or is declined, keep retry, system camera, album, and manual entry available.
- Preserve the world footprint map below zoom 1.6 exactly: the original six countries, counts, anchor positions, labels, colors, center, and default scale remain unchanged. Enable additional countries only at 1.6/2.2, country regions at 2.6, and recorded wines at 4. Keep these thresholds and static geography in map configuration; aggregate user records separately. Collision-controlled high-zoom labels prioritize recorded places and retain an accessible fallback for hidden or unlocated labels. Never invent coordinates for user-defined regions or wines.
- Profile includes “我的藏酒” with in-cellar and consumed bottle counts. Cellar entries and tasting records are separate: adding cellar inventory must not light up grape/region footprints. Opening a bottle writes an immutable movement, never deletes the entry, and a cellar tasting is saved with the inventory decrement in one database transaction. Unconfirmed or unentered wine facts must not be fabricated in the cellar flow.
- Profile uses a compact personal-dashboard hierarchy: consolidate record, grape, and region counts once near the identity block, with the record count itself opening 品鉴记录; prioritize 我的藏酒 and 品鉴日历 as the primary rows without repeating the record-list entry; keep Settings in the top-right gear and retain flavor/share as secondary destinations. Preserve the ivory and wine-red palette, tactile badge artwork, and every existing destination when changing this layout.
- Profile badges use small, tactile hexagonal metal-and-enamel artwork inspired by the supplied badge references, adapted to the ivory, wine-red, and sage palette. Keep badge art simple and legible at phone size. Show full color only when earned; show subdued art with real progress or conditions otherwise. Badge awards come from saved records, not static display data.
- Badge reward popups and profile badges must use the same image asset. Keep the image sized for its rendered use and the reward entrance brief so the award appears promptly after a successful save.

In ChatGPT Work Mode, run `sites-preview start "$PWD"`, open `http://terminal.local:4173/` in the cloud browser, and verify the rendered app and its primary interactions. Keep that preview open and tell the user to inspect it in the cloud browser; do not present the local URL as a user-facing chat link. In Codex Desktop, run the local server yourself, open the preview in the in-app browser, and provide the clickable local URL. Do not deploy to Sites unless the user explicitly asks to share, publish, or deploy. Do not give the user server-start instructions when you can run it.

Before planning or implementing any mobile-app change, read this `AGENTS.md` in full. It is the source of truth for the template's runtime and component guidance.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Editing Boundary

- Build app-specific UI in `src/Prototype.tsx` and `src/prototype.css`.
- Treat `src/App.tsx`, `src/main.tsx`, `src/styles.css`, `src/mobile/`, `public/assets/iphone/`, `public/assets/android/`, `public/assets/status/`, `vite.config.ts`, `worker/index.js`, and `scripts/prepare-sites-build.mjs` as protected runtime files. Do not edit, replace, remove, or recreate them unless the user explicitly asks to change the mobile runtime itself. For an explicit runtime change, update the affected lock hashes only after verifying the new runtime behavior.
- Run `npm run check:runtime` before preview or handoff. If it fails, restore the protected runtime instead of weakening or bypassing the check.
- `npm run build` preserves the mobile runtime and prepares the static Cloudflare Worker output required by Sites. Before a Sites handoff, confirm `dist/client/index.html`, `dist/server/index.js`, `dist/.openai/hosting.json`, and source `.openai/hosting.json` exist, then run `npm run test:sites`. Do not replace this project with a Vinext starter.

## Runtime Contract

- Preserve the mobile device runtime unless the user's task explicitly asks otherwise. Do not replace it with a standalone page. Visual fidelity applies to app-owned content inside the device screen, not to template-owned device chrome.
- Keep `App` composed around `PhoneFrame` -> `KeyboardProvider`, with `StatusBar`, app content, `HomeIndicator`, and `KeyboardDock` mounted inside the phone frame. `StatusBar` and the iOS home indicator are overlaid device chrome. When the Android keyboard is closed, the app viewport reserves the protected navigation-bar region instead of painting behind it. When the Android keyboard is open, preserve the current full-screen keyboard layout: its asset includes the IME navigation strip and the separate black navigation bar is hidden. iOS screens continue to paint behind the home-indicator area and own their safe-area content padding.
- Preserve the `iPhone` / `Pixel 10` device picker and both calibrated device presets. The Pixel screen is `427 x 952`; its `32 x 32` camera circle and `public/assets/android/navigation-bar.svg` bottom navigation bar are protected device chrome, not app content.
- Preserve the device picker's intentionally lightweight Codex styling in the top-right corner: its trigger wrapper is borderless and transparent, its trigger sizes to content, and its right-aligned menu uses the compact 3px inset plus the specified hairline and elevation shadow layers. Keep the prototype root and default app screen white.
- Preserve `StatusBar` as live device chrome, including its platform-specific typography, source status-icon assets, and spacing. Pixel 10 uses Roboto, Android indicators, and 32px top, left, and right padding. iPhone uses its iOS indicators, system typography, and calibrated spacing. Do not hardcode screenshot times like `9:41` into the status bar, replace its real-time clock, or move status bar content into app markup unless the user explicitly asks for a fixed/mock device time.
- `PhoneFrame` owns the calibrated device frame, screen portal, device picker, camera cutout, and custom cursor. Keep device assets in `public/assets/iphone/` and `public/assets/android/`; if an asset fails to load, repair the asset path or restore the asset instead of removing the frame, keyboard, or image render.
- Use `MobileScroll` directly for simple single-screen prototypes. Use `FlowStack` for conventional multi-screen flows whose routes can own their fixed header and footer; when using it, define each route as a `FlowScreen`: `{ id, header?, headerHeight?, footer?, footerHeight?, render }`, and use `flow.push(screen)`, `flow.pop()`, and `flow.replace(screen)` from `FlowStack` render callbacks or `useFlow()` instead of introducing another router.
- Use `Carousel` for a carousel, horizontal rail, swipeable cards, image or media strip, horizontally scrollable cards, chip rail, or other horizontal collection.
- For a layered app shell—such as a persistent composer, independently presented sheet, pushed/peek sidebar, or app-wide transition—compose directly in `Prototype.tsx` rather than forcing it through `FlowStack`. Keep app-owned fixed chrome as sibling layers outside `MobileScroll`.
- When using `FlowScreen`, put route-owned fixed headers or footers in `FlowScreen.header` or `FlowScreen.footer`. Set `headerHeight` to the visible app-toolbar height; `FlowStack` adds the device's top safe-area/status-bar inset automatically. Do not include `StatusBar` or its height in the header. Set `footerHeight` to the full app-footer height. `FlowScreen.footer` is an overlay, not reserved layout space; screens using it must add their own bottom content padding such as `padding-bottom: calc(var(--flow-footer-height) + var(--mobile-safe-area-height) + 24px)` so final content can scroll above the footer while still painting behind it.
- Render only scrollable content inside `MobileScroll`; it is for content that should move with scroll and rubber-band overscroll. Keep app-owned headers, nav bars, tabs, composers, and overlays outside it. This keeps scroll physics, safe areas, keyboard insets, scrollbars, and drag click suppression active without letting content paint under fixed chrome.
- Buttons, links, cards, and images inside `MobileScroll` should still allow drag scrolling when the pointer moves beyond tap slop. Use `data-scroll-drag="ignore"` only for rare controls that must own the drag gesture themselves.
- Do not add `var(--keyboard-height)` to ordinary screen/content padding inside `MobileScroll`; the scroll viewport already shrinks above the simulated keyboard. For custom fixed composers, search bars, or toast chrome, use `useKeyboardInsets().bottomInset`. It is relative to the app viewport: Android returns `0` while the closed-keyboard viewport already reserves navigation, then returns the keyboard height while open; iOS continues to clear the home indicator while closed and ride directly above the keyboard while open. Do not pin custom bottom chrome to `bottom: 0` or only `keyboardHeight`.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for every text-entry control. A raw `input` or `textarea` disconnects focus, keyboard animation, safe-area insets, and attached surfaces.
- Use `BottomSheet` for phone-scoped sheets. Its props are `open`, `onOpenChange`, `title`, optional `description`, optional `snap`, and `children`; it renders through the phone screen portal and dismisses the keyboard before opening.

## Horizontal Carousels

- Use `Carousel` for horizontally draggable cards, images, media, chips, or other horizontal collections. Do not recreate these with `overflow-x`, custom pointer handlers, or a generic div.
- `Carousel` can be nested directly inside `MobileScroll`. It owns horizontal gestures and automatically yields vertical gestures to the parent.
- Never put `data-scroll-drag="ignore"` on or around a `Carousel`; doing so prevents vertical parent scrolling when a gesture begins inside it.
- Do not add CSS scroll snapping to `Carousel`; its runtime owns momentum and release motion.
- Use `data-scroll-drag="ignore"` only when a control must prevent parent scrolling in every drag direction.

See `src/mobile/COMPONENTS.md` for the full component and gesture contract.

## Keyboard Rule

The simulated keyboard is a separate top-layer component. Before presenting anything that behaves like iOS navigation or modal UI, dismiss it first.

Call `keyboard.hide()` before:

- pushing, popping, or replacing FlowStack routes
- opening bottom sheets, action sheets, dialogs, menus, or navigation sheets
- starting transitions where the destination should not inherit text-input focus

`FlowStack` already hides the keyboard for `push`, `pop`, and `replace`. `BottomSheet` already hides it before opening. If you add new modal/sheet/navigation primitives, follow the same rule.

When a composer, search surface, or other keyboard-attached component closes, call `keyboard.hide()` in the same event before changing that component's open state. Position attached surfaces from `useKeyboardInsets()` rather than a separate timer or visibility flag so both dismiss together.

When any text-entry control loses focus, dismiss the simulated keyboard. If the control is custom or does not use the runtime's keyboard-aware fields, handle its blur event and call `keyboard.hide()` explicitly. Keep the keyboard open only when focus is moving directly to another text-entry control that should share the same keyboard session.

## Interaction Rules

- Do not trigger buttons or inputs after a pointer has become a drag. Preserve the drag suppression behavior in `MobileScroll`.
- Do not allow native browser image/file dragging inside the phone frame. Preserve the phone-level `dragstart` suppression and non-draggable image styles so scroll drags that begin on images still scroll the prototype.
- Use `KeyboardInput`, `KeyboardTextarea`, or `MobileTextField` for text entry so the simulated keyboard and safe-area insets stay connected.
- Fixed phone chrome should not animate with pushed screens. Screen content can animate; the status bar, camera cutout, and preview chrome should stay put.
- Keep the keyboard below the home indicator/safe area layer in z-index, and above ordinary app UI while visible.
- Keep the home indicator as the topmost safe-area layer in the z-index above everything else in the prototype.
- After saving a tasting, return to the grape atlas before showing rewards. New badges appear first; then show the saved-grape card as a phone-scoped 3D flip overlay. Keep typical-aroma guidance out of the card and present it only after dismissal as a non-blocking three-second toast.
- Tasting-record edit and delete actions stay hidden at rest. Reveal their right-side drawer by long press or a left swipe; a right swipe closes it. Do not render persistent edit/delete or overflow-menu buttons on record cards.
- Editing a tasting record must reuse the existing `确认酒款 → 你的感受` flow with the record prefilled. Save by updating the same record; do not introduce a separate record-editor page or bottom sheet.
