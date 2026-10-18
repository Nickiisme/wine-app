# Label-camera layout QA — 2026-10-18

- Source visual truth: `/var/folders/97/_xk916z5461gmldt5xzpfsg00000gn/T/codex-clipboard-b6b91b96-70ff-4026-8c6f-366b917dfeef.png` (864 × 1821).
- Implementation screenshot: `camera-layout-preview.png` (393 × 720 CSS/pixel crop, no device chrome; browser viewport 1280 × 720).
- Implementation: http://127.0.0.1:4175/ in Codex in-app browser.
- Captured state: camera not activated. Reference shows live video; no fake bottle photograph is used. Follow-up change: opening capture now automatically requests camera permission and starts video after approval. The saved screenshot predates this behavior change; fresh real-camera evidence remains pending.

## Comparison and checks

Source and implementation were opened together. Proportional comparison only: viewport heights differ and the live-video state has not been captured, so this is not a completed same-state fidelity review.

- Typography: existing system type retained; centered title, clear white framing instruction, small manual-entry link.
- Layout: full-height capture surface, four-corner guide, ivory bottom controls; album and round shutter remain visible without scrolling at 393 × 720.
- Tokens: warm ivory, wine-red controls, white live-view controls; no surrounding app redesign.
- Assets: Radix icons and real camera video element retained. No generated or placeholder bottle imagery.
- Copy: the single framing instruction follows the request. Extra mock helper text and decorative panel handle omitted intentionally. System-camera fallback retained to preserve functionality.
- Iteration: first rendered capture revealed low instruction contrast due to an inherited paragraph color. Explicit white applied; `camera-layout-preview.png` is the post-fix evidence, with readable white instruction.
- Interactions checked: record entry opens capture; manual entry opens the existing empty confirmation form; returning and reopening works. Full reload loads the new layout. Camera/gallery/retake code paths retained, but hardware capture and file selection were not exercised.
- Console: one earlier Vite hot-reload error remains in captured logs. Full reload and reopening succeeded; build/type checks pass. No conclusion about hardware-camera console behavior.
- Checks: runtime integrity passed (28 protected files); TypeScript and production build passed; 20 existing business/auth/catalog/map/lifecycle tests passed.

## Remaining verification

Real camera permission, live-frame composition, capture, retake, gallery import, and recognition must be checked on the user's phone. No permission was granted or personal photo uploaded during this visual change. Full same-state visual QA remains blocked pending that check.

final result: blocked
