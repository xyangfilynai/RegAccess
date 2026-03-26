# Design Document: App Cleanup and Stabilization

## Overview

This is a minimum-change cleanup pass over the RegAccess React/TypeScript SPA. The goal is to remove dead code, fix silent bugs, eliminate duplication, and restore type correctness — without altering any user-visible behavior, regulatory logic, or API contracts.

Every change is small, independently reviewable, and verified by the existing test suite plus `tsc --noEmit` and `vite build`. No new features, no rewrites, no dependency swaps.

---

## Architecture

The app is a single-page React application with no routing library. Navigation is managed by a `Screen` union type in `App.tsx`. The assessment engine (`src/lib/assessment-engine/`) is pure logic with no React dependencies. Components are flat under `src/components/`.

The cleanup touches only the component and app layers. The assessment engine is explicitly out of scope.

```
src/
  App.tsx                  ← inline style consolidation, Screen type fix, ReviewPanel prop fix
  components/
    GatePage.tsx           ← DELETE
    HandoffPage.tsx        ← remove markedComplete state, remove duplicate header
    Icon.tsx               ← add arrowUp, menu, x; no other changes
    Layout.tsx             ← no changes (provides shared header)
    ReviewPanel.tsx        ← remove onEditBlock and onFeedback from interface
    ui.tsx                 ← remove ConfBadge export
  lib/                     ← NO CHANGES
tests/
  app-shell.spec.ts        ← update stale screen-order assertion
```

---

## Components and Interfaces

### Batch 1 — Dead Code Removal (lowest risk, no behavior change)

**1a. Delete `src/components/GatePage.tsx`**

The file is exported but never imported anywhere in `src/`, `tests/`, `vite.config.ts`, or `vitest.config.ts`. It references the `users` icon (which is also not in the icon map), but since the file is dead, both disappear together.

Verification: `grep -r "GatePage" src/ tests/` returns zero results before deletion. After deletion, `vite build` and `vitest --run` pass.

**1b. Remove `ConfBadge` export from `src/components/ui.tsx`**

`ConfBadge` is exported but never imported in any other file. Remove the export keyword and the component definition entirely.

Verification: `grep -r "ConfBadge" src/ tests/` returns zero results before removal.

**1c. Remove `markedComplete` state from `HandoffPage.tsx`**

`useState(false)` with a setter called in a button `onClick`, but the state value is never read anywhere in the component — no conditional renders, no JSX that uses it. Remove the `useState` declaration and the `setMarkedComplete(true)` call in the button handler.

Exact change:
- Remove: `const [markedComplete, setMarkedComplete] = useState(false);`
- Remove: `setMarkedComplete(true)` from the button's `onClick`
- The button itself and all other behavior remain unchanged.

**1d. Update stale test in `tests/app-shell.spec.ts`**

The test `"gate -> dashboard -> assess is the expected navigation order"` asserts `['gate', 'dashboard', 'assess']`. Gate is dead code. Update the test to reflect the actual current navigation model:

```ts
it('dashboard -> assess is the expected navigation order', () => {
  const screens = ['dashboard', 'assess'] as const;
  expect(screens).toEqual(['dashboard', 'assess']);
});
```

The test name and assertion both change. The test still passes and still serves as a structural contract.

---

### Batch 2 — Bug Fixes (adds missing icon definitions)

**2a. Add missing icon definitions to `src/components/Icon.tsx`**

Three icon names are referenced in live components but missing from the icons map, causing silent fallback to the `info` icon:

| Icon name | Used in | SVG to add |
|-----------|---------|------------|
| `arrowUp` | `QuestionCard.tsx` — `<Icon name={showSupport ? 'arrowUp' : 'arrowDown'} size={12} />` | Upward chevron (mirror of existing `arrowDown`) |
| `menu` | `Layout.tsx` — `<Icon name={sidebarOpen ? 'x' : 'menu'} size={20} />` | Hamburger (3 horizontal lines) |
| `x` | `Layout.tsx` — same expression | Close/X mark |

Exact additions to the `icons` map in `Icon.tsx`:

```ts
arrowUp: <polyline points="18,15 12,9 6,15" strokeWidth="2" stroke={color} fill="none"/>,
menu: <><line x1="3" y1="6" x2="21" y2="6" strokeWidth="2" stroke={color}/><line x1="3" y1="12" x2="21" y2="12" strokeWidth="2" stroke={color}/><line x1="3" y1="18" x2="21" y2="18" strokeWidth="2" stroke={color}/></>,
x: <><line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" stroke={color}/><line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" stroke={color}/></>,
```

`arrowUp` is the exact inverse of the existing `arrowDown` entry (`points="6,9 12,15 18,9"` → `points="18,15 12,9 6,15"`).

No other changes to `Icon.tsx`.

---

### Batch 3 — Type Fixes (restores TypeScript correctness)

**3a. Remove `onEditBlock` from `ReviewPanelProps` in `ReviewPanel.tsx`**

`onEditBlock: (blockIndex: number) => void` is declared as a required prop but:
- Never passed by `App.tsx` (the only caller)
- Never called inside the `ReviewPanel` component body
- Causing a TypeScript error at the `App.tsx` call site

Remove the prop from the interface. The component body already destructures without it (confirmed by reading the source — the destructure pattern in `ReviewPanel` does not include `onEditBlock`).

**3b. Remove `onFeedback` from `ReviewPanelProps` in `ReviewPanel.tsx`**

`onFeedback?: () => void` is declared as optional and is passed from `App.tsx`, but is never called inside the `ReviewPanel` component body. The prop is destructured but unused.

Remove from the interface and from the destructure pattern. `App.tsx` currently passes `onFeedback={() => setScreen('feedback')}` — remove that prop from the `<ReviewPanel>` call site in `App.tsx` as well.

**3c. Confirm `Screen` type in `App.tsx` does not include `'gate'`**

Re-reading the source confirms `type Screen = 'dashboard' | 'assess' | 'feedback' | 'handoff'` — `'gate'` is already absent from the type. No code change needed here. The stale assertion is in the test (handled in Batch 1d).

---

### Batch 4 — Duplication Elimination

**4a. Remove duplicate header from `HandoffPage.tsx`**

`HandoffPage` renders its own full `<header>` (logo img, "RegAccess" text, "AI/ML" badge) that is structurally identical to the header in `Layout.tsx`. `HandoffPage` does not use `Layout` — it renders its own full-page `div` with `minHeight: 100vh`.

Approach: Extract a shared `AppHeader` component into `src/components/AppHeader.tsx`, used by both `Layout.tsx` and `HandoffPage.tsx`.

`AppHeader` renders only the header bar (the `<header>` element with logo, brand name, and AI/ML badge). It accepts no props — the content is identical in both usages.

```tsx
// src/components/AppHeader.tsx
export const AppHeader: React.FC = () => (
  <header style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 var(--space-lg)',
    height: 64,
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-bg-elevated)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <img src="/logo.png" alt="RegAccess Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
        RegAccess
      </span>
      <span style={{
        fontSize: 11, fontWeight: 500, padding: '2px 6px',
        borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-muted)',
        color: 'var(--color-primary)', marginLeft: 4,
      }}>
        AI/ML
      </span>
    </div>
  </header>
);
```

`Layout.tsx` replaces its inline header logo/brand block with `<AppHeader />` (keeping the right-side controls — home button, counters, reset — as siblings in the header flex container, or by extending `AppHeader` to accept a `rightSlot` prop).

> **Design decision**: `Layout.tsx`'s header has right-side controls (home, counters, reset) that `HandoffPage`'s header does not. To avoid over-engineering, `AppHeader` renders only the left side (logo + brand). `Layout.tsx` keeps its existing header structure but imports the logo/brand block from `AppHeader` as a sub-component, or simply uses `AppHeader` for the left portion. The simplest approach that avoids duplication without restructuring `Layout.tsx` is to extract just the brand markup into a `BrandMark` component used in both places.

Revised approach — extract `BrandMark` (not a full header):

```tsx
// src/components/BrandMark.tsx  (or inline in ui.tsx)
export const BrandMark: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
    <img src="/logo.png" alt="RegAccess Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
      RegAccess
    </span>
    <span style={{
      fontSize: 11, fontWeight: 500, padding: '2px 6px',
      borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-muted)',
      color: 'var(--color-primary)', marginLeft: 4,
    }}>
      AI/ML
    </span>
  </div>
);
```

Both `Layout.tsx` and `HandoffPage.tsx` import and render `<BrandMark />` in their respective header elements. This is the minimum change that eliminates the duplication without restructuring either component's layout.

**4b. Consolidate repeated warning banner styles in `App.tsx`**

In `renderBlockContent()`, the warning banner `<div>` style object appears 3+ times verbatim:

```ts
{
  marginBottom: 16,
  padding: '12px 16px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-warning-bg)',
  border: '1px solid var(--color-warning-border)',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 10,
}
```

Extract to a file-scoped constant at the top of `App.tsx` (above the component):

```ts
const bannerStyle = {
  warning: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-warning-bg)',
    border: '1px solid var(--color-warning-border)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  } as React.CSSProperties,
  danger: {
    marginBottom: 16,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-danger-bg)',
    border: '1px solid var(--color-danger-border)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
  } as React.CSSProperties,
} as const;
```

Replace all inline occurrences with `style={bannerStyle.warning}` or `style={bannerStyle.danger}`. The De Novo advisory and PCCP banners use slightly different padding (`'10px 14px'`) and no flex layout — those are kept as-is or extracted to a separate `bannerStyle.advisory` variant. No visual change.

---

### Batch 5 — Unused Import Cleanup

After all the above changes, scan each modified file for newly-orphaned imports:

- `HandoffPage.tsx`: `useState` import — after removing `markedComplete`, check if `useState` is still used (it is, for `checks`). No change needed.
- `ReviewPanel.tsx`: after removing `onFeedback` from destructure, no import becomes unused.
- `App.tsx`: after removing `onFeedback` prop from `<ReviewPanel>` call site, no import becomes unused.
- `ui.tsx`: after removing `ConfBadge`, no import becomes unused (the component used only local React).

No import removals are expected, but each file should be checked with `tsc --noEmit` after its batch.

---

## Data Models

No data model changes. The `Screen` type already excludes `'gate'`. `ReviewPanelProps` loses two members. No new types are introduced.

```ts
// Before
interface ReviewPanelProps {
  determination: DeterminationResult;
  answers: Answers;
  blocks: Block[];
  getQuestionsForBlock: (blockId: string) => Question[];
  onEditBlock: (blockIndex: number) => void;  // ← REMOVE
  onFeedback?: () => void;                    // ← REMOVE
  onHandoff?: () => void;
  reviewerNotes?: ReviewerNote[];
  onAddNote?: (author: string, text: string) => void;
  onRemoveNote?: (noteId: string) => void;
}

// After
interface ReviewPanelProps {
  determination: DeterminationResult;
  answers: Answers;
  blocks: Block[];
  getQuestionsForBlock: (blockId: string) => Question[];
  onHandoff?: () => void;
  reviewerNotes?: ReviewerNote[];
  onAddNote?: (author: string, text: string) => void;
  onRemoveNote?: (noteId: string) => void;
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Icon rendering correctness

*For any* icon name in `['arrowUp', 'menu', 'x']`, rendering `<Icon name={iconName} />` should produce SVG content that is distinct from the `info` fallback SVG content.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 2: Assessment engine output stability

*For any* `Answers` object, the outputs of `computeDetermination`, `computeDerivedState`, `getBlocks`, and `getQuestions` must be identical before and after all cleanup changes — verified by the full existing test suite passing without modification to any engine file.

**Validates: Requirements 14.1, 14.2**

---

## Error Handling

All changes in this spec are removals or additions of small, isolated code. Error handling considerations:

- **GatePage deletion**: No error handling needed — the file is unreferenced.
- **Icon additions**: The `Icon` component already has a fallback (`icons[name] || icons.info`). Adding new entries to the map cannot break existing behavior.
- **Prop removals**: TypeScript will catch any missed call sites at compile time. The fix is to run `tsc --noEmit` after each batch.
- **BrandMark extraction**: If the new component fails to render, the header will be visually broken but no runtime error will be thrown. The risk is low — it's a pure presentational component with no props or state.
- **Style consolidation**: Inline style objects are pure data. Extracting them to constants cannot introduce runtime errors.

---

## Testing Strategy

### Verification approach

Each batch is verified independently before proceeding to the next:

1. `tsc --noEmit` — zero errors
2. `vitest --run` — zero failures
3. `vite build` — completes without errors

These three commands are the acceptance gate for every batch.

### Unit tests (specific examples)

The following specific example checks verify the structural outcomes of this cleanup:

**Example 1: GatePage is gone**
After Batch 1a, assert that `src/components/GatePage.tsx` does not exist (file system check or import resolution failure).

**Example 2: ConfBadge is not exported**
After Batch 1b, assert that importing `{ ConfBadge }` from `./ui` results in `undefined` (or a TypeScript error at compile time).

**Example 3: Icon map contains arrowUp, menu, x**
After Batch 2a, render `<Icon name="arrowUp" />`, `<Icon name="menu" />`, `<Icon name="x" />` and assert the rendered SVG `innerHTML` does not match the `info` icon's SVG content (a circle with a line).

**Example 4: Stale screen-order test is updated**
After Batch 1d, the test `"dashboard -> assess is the expected navigation order"` passes and the old test name `"gate -> dashboard -> assess..."` no longer exists.

**Example 5: Full test suite passes**
After all batches, `vitest --run` exits with code 0.

### Property-based tests

**Property 1: Icon rendering correctness** (see Correctness Properties)

Implementation: Use a parameterized test (or `it.each`) over `['arrowUp', 'menu', 'x']`. Render each with `@testing-library/react`, query the SVG element, and assert its `innerHTML` does not equal the `info` icon's `innerHTML`. Run for all three values.

Tag: `Feature: app-cleanup-stabilization, Property 1: icon rendering correctness`

**Property 2: Assessment engine output stability** (see Correctness Properties)

Implementation: The existing test suite in `tests/regassess-baseline-engine.spec.ts`, `tests/regassess-question-visibility.spec.ts`, and `tests/app-shell.spec.ts` collectively verify this property across a representative set of inputs. No new property test is needed — the existing tests are the oracle. The property is satisfied if and only if all existing engine tests pass after cleanup.

Tag: `Feature: app-cleanup-stabilization, Property 2: assessment engine output stability`

### Property-based testing library

Use `vitest`'s built-in `it.each` for parameterized cases. No additional PBT library is required for this cleanup spec — the properties are simple enough to be covered by parameterized examples. If a full PBT library is desired, `fast-check` is the recommended choice for TypeScript projects.

Minimum iterations: For Property 1, all 3 icon names are tested (exhaustive, not random). For Property 2, the existing test suite provides the coverage.

---

## Execution Order and Batching Strategy

Changes are ordered from lowest to highest risk. Each batch must pass all three verification commands before the next batch begins.

| Batch | Changes | Risk | Rollback |
|-------|---------|------|----------|
| 1 | Delete GatePage.tsx, remove ConfBadge, remove markedComplete state, update stale test | Very low — all pure removals | `git revert` of the batch commit |
| 2 | Add arrowUp, menu, x to Icon.tsx | Very low — additive only, cannot break existing icon renders | `git revert` |
| 3 | Remove onEditBlock and onFeedback from ReviewPanelProps; remove onFeedback from App.tsx call site | Low — TypeScript will catch any missed references | `git revert` |
| 4 | Extract BrandMark component; consolidate banner styles in App.tsx | Medium — touches rendering code | `git revert`; visual regression check |
| 5 | Unused import scan and cleanup | Very low | `git revert` |

### Rollback notes

- Batches 1–3 are pure removals or additions with no structural changes. Rollback is trivial.
- Batch 4 (BrandMark extraction) is the highest-risk change because it modifies rendered output. The risk is mitigated by the fact that `BrandMark` is a pure presentational component with no logic. If the visual output is wrong, `git revert` restores the original in seconds.
- No batch touches `src/lib/` — the assessment engine is fully protected.
- The `package.json` dependency audit confirmed no unused dependencies, so no `package.json` changes are needed.

### Dependency audit result

All 14 entries in `package.json` are confirmed used:

| Package | Used in |
|---------|---------|
| `react`, `react-dom` | All component files |
| `@testing-library/jest-dom` | `tests/setup.ts` |
| `@testing-library/react` | `tests/ui-workflow.spec.tsx`, `tests/feedback-survey.spec.tsx` |
| `@testing-library/user-event` | `tests/ui-workflow.spec.tsx` |
| `@types/react`, `@types/react-dom` | TypeScript compilation |
| `@vitejs/plugin-react` | `vite.config.ts` |
| `jsdom` | `vitest.config.ts` (test environment) |
| `typescript` | Build toolchain |
| `vite` | `vite.config.ts` |
| `vitest` | All test files |

No dependency removals are needed.
