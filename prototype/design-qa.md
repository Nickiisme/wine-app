# Design QA

- Source visual truth: `/Users/nicki/.codex/generated_images/01a132f8-eee2-7920-a503-793e02a85727/exec-d846be24-5720-430f-978c-622bbd6e8d59.png`
- Implementation: `http://localhost:4173/`
- Viewport: 1400 × 1200 browser viewport; phone screen verified at 393 × 852 CSS px, device scale factor 1
- Source pixels: 853 × 1898; implementation phone viewport: 393 × 852 CSS px
- Density normalization: compared at the phone-content level; the source is a taller concept image and the new detail states have no direct source frame
- State: unlocked grape bottom sheet and France region zoom view
- Browser evidence: in-app browser capture at 393 × 852; primary interactions tested; browser console checked with no warnings or errors

## Full-view comparison

The new states preserve the established cream paper background, burgundy accents, compact typography, rounded controls, and bottom navigation. The content density remains intentionally lighter than the original concept image, matching the later direction to reduce illustration dominance.

## Focused-region comparison

Focused checks were performed on the grape detail sheet and the enlarged country map. The grape image remains secondary to the text, while the country view retains the same map-card visual language and clearly exposes a back action. A direct pixel match is not applicable because neither interaction state exists in the source image.

## Findings

- No P0/P1/P2 issues remain.
- Typography: hierarchy and small-label weights are consistent with the existing app.
- Spacing: the detail sheet and country map use the existing compact rhythm without crowding.
- Colors: existing wine, paper, line, and muted tokens are reused.
- Image quality: existing grape assets remain sharp at the reduced 92 px detail size.
- Copy: unlocked, locked, and regional exploration states are explicit and concise.

## Interaction checks

- Clicking an unlocked grape opens its introduction, tasting count, and encountered regions.
- Clicking a locked grape opens a clear “待探索” explanation without revealing a detailed profile.
- Clicking a country enlarges the map into its regional view.
- The enlarged map returns to the world map through the top-left back control.
- Browser console: no warnings or errors.

## Comparison history

- Initial pass: no actionable P0/P1/P2 findings in the two added interaction states.

## Follow-up polish

- P3: future region nodes can use real geographic positions once production map data is introduced.

## Badge redesign check (2026-10-15)

- Source visual truth: `/var/folders/97/_xk916z5461gmldt5xzpfsg00000gn/T/codex-clipboard-2e15a296-c7e6-4033-81a5-0c017259aa4a.png` and the companion close-up reference supplied in chat.
- Implementation screenshot: `/Users/nicki/Documents/ChatGPT/wine-app/prototype/tmp/badges-profile-preview.png`.
- Viewport: 1280 × 720 desktop browser displaying the app's phone-width profile surface. Source: 941 × 1592 pixels; implementation screenshot: 1280 × 720 pixels. Comparison is of medal material and shape, not full-screen layout or pixel alignment.
- State: new user, five locked badges. Earned artwork was also inspected as individual transparent assets at full resolution.
- Full-view comparison: reference has a dark gallery and large medals; the app keeps its established ivory profile and compact carousel. The adapted medals preserve the hexagonal silhouette, raised metal rim, enamel center, and restrained embossed symbol.
- Focused-region comparison: the three visible locked medals show their contours and distinct symbols at phone size. The reference's brighter metal treatment is reserved for earned badges; grayscale clearly marks locked items.
- Typography: existing app heading and label hierarchy retained. Badge labels are short and fit within each carousel item.
- Spacing: medal, title, and condition form a readable vertical group without crowding the footprint section.
- Colors: burgundy, sage, ivory, and champagne gold adapt the reference's metal/enamel language to the current app palette.
- Image quality: five transparent 1024 px medal assets display cleanly at 82 px; no visible background rectangle or stretching.
- Copy: each badge names a concrete condition; the section shows the real earned count.
- Browser check: profile navigation and carousel render; no console warnings or errors.
- Comparison history: initial locked-state capture made medals too faint; opacity increased from .32 to .52 and the final profile was captured again.
- Remaining gap: the live account has no saved records, so earned and in-progress states were verified from their assets and rendering rules rather than a live record sequence.

final result: passed
