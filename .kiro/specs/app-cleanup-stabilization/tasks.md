# Implementation Plan: App Cleanup and Stabilization

## Overview

Five ordered batches of cleanup changes, each independently verifiable. Work from lowest to highest risk. Run `tsc --noEmit`, `vitest --run`, and `vite build` after each batch before proceeding.

## Tasks

- [x] 1. Batch 1 — Dead Code Removal
  - [x] 1.1 Delete `src/components/GatePage.tsx`
    - Confirm zero references: `grep -r "GatePage" src/ tests/` must return nothing
    - Delete the file
    - _Requirements: 1.1, 1.2_
  - [ ]* 1.2 Verify GatePage is gone
    - Assert `src/components/GatePage.tsx` does not exist (file system check)
    - _Requirements: 1.1_
  - [x] 1.3 Remove `ConfBadge` export from `src/components/ui.tsx`
    - Confirm zero import references: `grep -r "ConfBadge" src/ tests/` must return nothing
    - Remove the `export` keyword and the `ConfBadge` component definition entirely
    - _Requirements: 2.1, 2.2_
  - [x] 1.4 Remove `markedComplete` state from `HandoffPage.tsx`
    - Remove `const [markedComplete, setMarkedComplete] = useState(false);`
    - Remove `setMarkedComplete(true)` from the button's `onClick` handler
    - Leave the button and all other behavior unchanged
    - _Requirements: 4.1, 4.2_
  - [x] 1.5 Update stale screen-order test in `tests/app-shell.spec.ts`
    - Rename test from `"gate -> dashboard -> assess is the expected navigation order"` to `"dashboard -> assess is the expected navigation order"`
    - Update assertion from `['gate', 'dashboard', 'assess']` to `['dashboard', 'assess']`
    - _Requirements: 10.3, 11.1, 11.2_
  - [x] 1.6 Checkpoint — verify Batch 1
    - Run `tsc --noEmit` — zero errors
    - Run `vitest --run` — zero failures
    - Run `vite build` — completes without errors
    - Ensure all tests pass, ask the user if questions arise.

- [x] 2. Batch 2 — Bug Fixes (add missing icon definitions)
  - [x] 2.1 Add `arrowUp`, `menu`, and `x` icon definitions to `src/components/Icon.tsx`
    - Add to the `icons` map:
      - `arrowUp`: upward chevron — mirror of existing `arrowDown` (`points="18,15 12,9 6,15"`)
      - `menu`: hamburger — three horizontal `<line>` elements at y=6, y=12, y=18
      - `x`: close mark — two diagonal `<line>` elements crossing at center
    - No other changes to `Icon.tsx`
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 2.2 Write property test for icon rendering correctness (Property 1)
    - **Property 1: Icon rendering correctness**
    - **Validates: Requirements 6.1, 6.2, 6.3**
    - Use `it.each` over `['arrowUp', 'menu', 'x']`
    - Render each with `@testing-library/react`, query the SVG, assert `innerHTML` does not match the `info` fallback SVG
    - Add to `tests/ui-workflow.spec.tsx` or a new `tests/icon.spec.tsx`
  - [x] 2.3 Checkpoint — verify Batch 2
    - Run `tsc --noEmit` — zero errors
    - Run `vitest --run` — zero failures
    - Run `vite build` — completes without errors
    - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Batch 3 — Type Fixes
  - [x] 3.1 Remove `onEditBlock` from `ReviewPanelProps` in `ReviewPanel.tsx`
    - Delete `onEditBlock: (blockIndex: number) => void;` from the interface
    - Confirm the component body does not destructure or call `onEditBlock`
    - _Requirements: 3.1, 3.2, 7.1, 7.2_
  - [x] 3.2 Remove `onFeedback` from `ReviewPanelProps` in `ReviewPanel.tsx` and its call site in `App.tsx`
    - Delete `onFeedback?: () => void;` from the `ReviewPanelProps` interface
    - Remove `onFeedback` from the destructure pattern inside `ReviewPanel`
    - Remove `onFeedback={() => setScreen('feedback')}` from the `<ReviewPanel>` call in `App.tsx`
    - _Requirements: 3.3_
  - [x] 3.3 Checkpoint — verify Batch 3
    - Run `tsc --noEmit` — zero errors
    - Run `vitest --run` — zero failures
    - Run `vite build` — completes without errors
    - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Batch 4 — Duplication Elimination
  - [x] 4.1 Extract `BrandMark` component into `src/components/BrandMark.tsx`
    - Create `src/components/BrandMark.tsx` exporting a `BrandMark: React.FC` with no props
    - Component renders: logo `<img>`, "RegAccess" `<span>`, and "AI/ML" badge `<span>` — matching the markup currently duplicated in `Layout.tsx` and `HandoffPage.tsx`
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 4.2 Replace duplicate header markup in `Layout.tsx` and `HandoffPage.tsx` with `<BrandMark />`
    - In `Layout.tsx`: import `BrandMark` and replace the logo/brand inline block with `<BrandMark />`
    - In `HandoffPage.tsx`: import `BrandMark` and replace the logo/brand inline block with `<BrandMark />`
    - Visual output must remain identical
    - _Requirements: 8.1, 8.2, 8.3_
  - [x] 4.3 Consolidate repeated warning banner inline styles in `App.tsx`
    - Add a file-scoped `bannerStyle` constant above the component with `warning` and `danger` variants (as `React.CSSProperties`)
    - Replace all matching inline style objects in `renderBlockContent` with `style={bannerStyle.warning}` or `style={bannerStyle.danger}`
    - Visually identical output — no layout or color changes
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 4.4 Checkpoint — verify Batch 4
    - Run `tsc --noEmit` — zero errors
    - Run `vitest --run` — zero failures
    - Run `vite build` — completes without errors
    - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Batch 5 — Unused Import Cleanup
  - [x] 5.1 Scan all modified files for orphaned imports
    - `HandoffPage.tsx`: confirm `useState` is still used (for `checks` state); no removal needed
    - `ReviewPanel.tsx`: confirm no import became unused after removing `onFeedback`
    - `App.tsx`: confirm no import became unused after removing `onFeedback` prop
    - `ui.tsx`: confirm no import became unused after removing `ConfBadge`
    - Remove any import that is now unused
    - _Requirements: 12.1, 12.2_
  - [x] 5.2 Final checkpoint — full suite
    - Run `tsc --noEmit` — zero errors
    - Run `vitest --run` — zero failures
    - Run `vite build` — completes without errors
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster pass
- Each batch must fully pass all three verification commands before the next batch begins
- No files under `src/lib/` are touched — the assessment engine is out of scope
- Property tests validate universal correctness; unit tests validate specific examples
