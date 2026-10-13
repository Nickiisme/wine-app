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

final result: passed
