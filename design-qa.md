**Design QA**

- Source visual truth: `/var/folders/97/_xk916z5461gmldt5xzpfsg00000gn/T/codex-clipboard-1ae76372-b321-4907-9643-bd3698865dc3.png`
- Implementation screenshots: `/Users/nicki/Documents/ChatGPT/wine-app/docs/evidence/save-celebration-card.png` and `/Users/nicki/Documents/ChatGPT/wine-app/docs/evidence/save-knowledge-toast.png`
- Combined comparison: `/Users/nicki/Documents/ChatGPT/wine-app/docs/evidence/save-redesign-comparison.png`
- Viewport: 393 × 852 CSS px, deviceScaleFactor 1; implementation captures are 393 × 852 px.
- Source dimensions: 870 × 1464 px. It was proportionally normalized to 506 × 852 px in the combined comparison without cropping.
- State: original full-page saved-grape result compared with the intentional redesign: grape-atlas homepage beneath a saved-grape dialog after its flip animation has settled. The knowledge guidance is separately checked in its visible toast state.

**Findings**

- No actionable P0, P1, or P2 issues remain.
- Fonts and typography: the existing serif display hierarchy and sans-serif utility copy are preserved. The dialog title remains the dominant message, and the smaller feedback copy wraps without truncation.
- Spacing and layout rhythm: the 338 px dialog fits the 393 px app screen with balanced 28 px side margins. Illustration, title, feedback, and CTA retain a clear vertical sequence; neither the card nor the toast collides with bottom navigation.
- Colors and visual tokens: the wine red, warm paper, pale rose feedback panel, border, and shadow remain consistent with the existing app. The dimmed, blurred atlas is still identifiable as the destination state.
- Image quality and asset fidelity: the existing grape illustration is reused with `object-fit: contain`; it is not stretched or replaced. Badge artwork behavior is unchanged.
- Copy and content: “下次品尝时可以留意” is absent from the unlock card and appears only in the subsequent toast. System knowledge remains explicitly distinguished from the user's own taste conclusion.
- Accessibility and interaction: the card is an accessible modal dialog, focus moves to its CTA, the knowledge bubble is announced as a polite status message, reduced-motion users receive a near-instant transition, and the toast is non-blocking.

**Comparison History**

- Initial capture occurred at animation frame zero, so the overlay and toast were visually transparent even though Playwright considered them visible. This was a capture-timing problem, not an implementation defect.
- Fix: captured the card after 700 ms and the toast after 350 ms. The post-fix screenshots show the settled states at the exact app viewport.

**Primary Interactions Tested**

- Manual record → choose grape → save.
- Automatic return to the grape-atlas homepage.
- Saved-grape card appears and excludes the knowledge guidance.
- Dismissing the card reveals the knowledge toast.
- Toast is removed after three seconds.
- Page and console errors checked: none.

**Follow-up Polish**

- P3: on very long grape names, consider a slightly smaller title size after observing real production content; current tested content fits comfortably.

final result: passed
