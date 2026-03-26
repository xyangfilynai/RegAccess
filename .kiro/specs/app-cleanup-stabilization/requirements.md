# Requirements Document

## Introduction

This spec covers a cleanup and stabilization pass of the RegAccess codebase — a React/TypeScript single-page application for FDA regulatory change-assessment of AI/ML medical devices. The goal is to improve maintainability, correctness, and simplicity **without changing any current user-visible behavior, business logic, API contracts, or working features**.

The work is organized into five categories: dead code removal, duplication elimination, bug and type fixes, dependency reduction, and structural simplification. All changes must be proven safe before execution, and the app must build, typecheck, lint, and pass all tests after each logical batch.

---

## Glossary

- **App**: The RegAccess React SPA (`src/App.tsx` and all files it imports).
- **Assessment_Engine**: The pure-logic module at `src/lib/assessment-engine/` (types, computeDetermination, computeDerivedState, getQuestions, getBlocks, changeTaxonomy).
- **Dead_Code**: Any export, import, variable, function, component, file, or branch that is provably unreachable or unreferenced in the current build and test surface.
- **Regression**: Any change in observable behavior — UI output, determination logic, test results, or build output — that was not present before the cleanup.
- **Safe_Removal**: Deletion of code confirmed unused by exhaustive import/reference search across `src/`, `tests/`, `vite.config.ts`, `vitest.config.ts`, and `package.json`.
- **Stale_Comment**: A comment that describes behavior that no longer exists, references removed code, or is factually incorrect about the current implementation.
- **Type_Error**: A TypeScript diagnostic error or `any`-typed value that weakens type safety without justification.

---

## Requirements

### Requirement 1: Remove Dead Files and Unreferenced Components

**User Story:** As a developer, I want dead files removed from the repository, so that I can navigate the codebase without encountering misleading or confusing unused code.

#### Acceptance Criteria

1. THE App SHALL NOT contain `src/components/GatePage.tsx` after cleanup, because it is exported but never imported anywhere in `src/` or `tests/`.
2. WHEN a file is identified as a candidate for removal, THE Cleanup_Process SHALL confirm zero import references across all `.ts`, `.tsx`, `vite.config.ts`, and `vitest.config.ts` files before deleting it.
3. IF a file has no import references but is referenced in `package.json` scripts or build config, THEN THE Cleanup_Process SHALL retain it and document why.

---

### Requirement 2: Remove Unused Exports

**User Story:** As a developer, I want unused exports eliminated, so that the public API surface of each module is minimal and accurate.

#### Acceptance Criteria

1. THE `src/components/ui.tsx` module SHALL NOT export `ConfBadge` after cleanup, because it is exported but never imported in any other file.
2. WHEN an export is identified as unused, THE Cleanup_Process SHALL verify it is not re-exported through a barrel file or consumed by tests before removing it.
3. THE `src/lib/content/regulatory-sources.ts` module SHALL NOT expose `sourceCitations` as a module-level variable accessible outside the file after cleanup; it is already `const`-scoped and not exported, but its internal usage SHALL be confirmed correct.

---

### Requirement 3: Remove Unused Props and Dead Interface Members

**User Story:** As a developer, I want component interfaces to reflect only props that are actually used, so that callers are not confused by props that have no effect.

#### Acceptance Criteria

1. THE `ReviewPanelProps` interface SHALL NOT include `onEditBlock` after cleanup, because it is declared as required but never passed by `App.tsx` or any test, and is never called inside `ReviewPanel`.
2. WHEN a required prop is removed from an interface, THE Cleanup_Process SHALL update all call sites and test renders that previously omitted it (since TypeScript would have been reporting an error).
3. THE `ReviewPanelProps` interface SHALL NOT include `onFeedback` after cleanup if it is confirmed that `onFeedback` is declared in the interface but never called inside the `ReviewPanel` component body (it is passed from `App.tsx` but the component body does not invoke it).

---

### Requirement 4: Remove Unused State

**User Story:** As a developer, I want component state variables that are never read to be removed, so that components are simpler and easier to reason about.

#### Acceptance Criteria

1. THE `HandoffPage` component SHALL NOT declare `markedComplete` state after cleanup if the only write to it is a button `onClick` and the only read is a conditional render that can be confirmed as the sole consumer — unless that conditional render is intentional and visible to users.
2. WHEN a state variable is removed, THE Cleanup_Process SHALL verify the associated setter and any conditional renders that depend on it are also removed.

---

### Requirement 5: Remove Unused Icon Names

**User Story:** As a developer, I want the Icon component to only define icons that are actually used, so that the icon map stays lean and easy to audit.

#### Acceptance Criteria

1. THE `Icon` component SHALL NOT define icon keys for `users`, `arrowUp`, `menu`, or `x` if those names are not present in the icon map and are referenced only in dead code (e.g., `GatePage.tsx`).
2. WHEN an icon key is confirmed used only in dead code, THE Cleanup_Process SHALL remove both the dead code reference and the icon definition together as a single atomic change.
3. IF an icon name is referenced in a live component but missing from the icon map (causing silent fallback to `info`), THEN THE Cleanup_Process SHALL add the missing icon definition rather than remove the reference.

---

### Requirement 6: Fix Missing Icon Definitions (Bug Fix)

**User Story:** As a developer, I want all icon names referenced in live components to have actual SVG definitions, so that icons render correctly instead of silently falling back to the `info` icon.

#### Acceptance Criteria

1. WHEN `Icon` is called with `name="arrowUp"` in `QuestionCard.tsx`, THE Icon_Component SHALL render a correct upward-pointing chevron, not the `info` fallback.
2. WHEN `Icon` is called with `name="menu"` or `name="x"` in `Layout.tsx` (mobile sidebar toggle), THE Icon_Component SHALL render the correct hamburger and close icons respectively.
3. THE Icon_Component SHALL define `arrowUp`, `menu`, and `x` icon paths after this fix.

---

### Requirement 7: Fix the `onEditBlock` Required-Prop Type Error

**User Story:** As a developer, I want TypeScript to not report errors on valid call sites, so that the build is clean and type safety is meaningful.

#### Acceptance Criteria

1. THE TypeScript compiler SHALL NOT report an error on the `ReviewPanel` usage in `App.tsx` related to a missing required `onEditBlock` prop after cleanup.
2. IF `onEditBlock` is removed from the interface (per Requirement 3), THEN THE Cleanup_Process SHALL confirm no remaining call site passes it.
3. IF `onEditBlock` is made optional instead of removed, THEN THE Cleanup_Process SHALL confirm the component body handles the `undefined` case correctly.

---

### Requirement 8: Eliminate Duplicated Header Markup

**User Story:** As a developer, I want the app header to be defined in one place, so that branding changes only need to be made once.

#### Acceptance Criteria

1. THE `HandoffPage` component SHALL NOT contain its own full header markup (logo, brand name, AI/ML badge) after cleanup, because `Layout.tsx` already renders an identical header for the assessment flow.
2. WHEN the duplicate header is removed from `HandoffPage`, THE visual output of the handoff page SHALL remain identical to its current appearance.
3. THE `HandoffPage` SHALL use the shared `Layout` component or a shared header sub-component rather than duplicating the header HTML.

---

### Requirement 9: Consolidate Repeated Inline Style Patterns

**User Story:** As a developer, I want repeated inline style objects to be defined once and reused, so that visual consistency is easier to maintain.

#### Acceptance Criteria

1. THE `App.tsx` file SHALL NOT contain two or more identical inline style objects for the contextual warning banners in `renderBlockContent` after cleanup; repeated banner patterns SHALL be extracted to a shared helper or constant within the file.
2. WHEN inline styles are consolidated, THE visual output SHALL remain pixel-identical to the current output.
3. THE consolidation SHALL NOT introduce a new shared component file unless the pattern is used across more than one component file.

---

### Requirement 10: Remove Stale `screen` Type Value

**User Story:** As a developer, I want the `Screen` type in `App.tsx` to only contain values that are actually used, so that the type accurately documents the app's navigation model.

#### Acceptance Criteria

1. THE `Screen` type in `App.tsx` SHALL NOT include `'gate'` after cleanup, because the gate screen was removed from the navigation flow but the type value was not cleaned up.
2. WHEN the `'gate'` value is removed from the `Screen` type, THE TypeScript compiler SHALL NOT report new errors.
3. THE test in `tests/app-shell.spec.ts` that asserts `['gate', 'dashboard', 'assess']` as the screen order SHALL be updated to reflect the actual current navigation model (`['dashboard', 'assess']`).

---

### Requirement 11: Fix Stale Test Assertion

**User Story:** As a developer, I want tests to accurately reflect the current system behavior, so that passing tests are meaningful and not misleading.

#### Acceptance Criteria

1. THE test `"gate -> dashboard -> assess is the expected navigation order"` in `tests/app-shell.spec.ts` SHALL be updated or removed after cleanup, because `GatePage` is dead code and `gate` is not a real screen in the current app.
2. WHEN a test is updated, THE updated test SHALL still pass with `vitest --run`.
3. THE Cleanup_Process SHALL NOT remove tests that cover live behavior; only tests that assert dead or incorrect behavior SHALL be changed.

---

### Requirement 12: Remove Unused Imports

**User Story:** As a developer, I want no unused imports in any source file, so that the dependency graph is accurate and lint passes cleanly.

#### Acceptance Criteria

1. THE App SHALL have zero unused import statements across all files in `src/` and `tests/` after cleanup.
2. WHEN an import is removed, THE Cleanup_Process SHALL confirm the imported symbol is not used anywhere in the file, including in JSX, type annotations, and string literals.
3. THE TypeScript compiler and ESLint (if configured) SHALL report zero unused-import warnings after cleanup.

---

### Requirement 13: Confirm and Document Dependency Surface

**User Story:** As a developer, I want to know that every entry in `package.json` is actually needed, so that the dependency surface is minimal and auditable.

#### Acceptance Criteria

1. THE Cleanup_Process SHALL audit every `dependency` and `devDependency` in `package.json` and confirm each is directly used in `src/`, `tests/`, `vite.config.ts`, or `vitest.config.ts`.
2. IF a dependency is confirmed unused, THEN THE Cleanup_Process SHALL remove it from `package.json` and `package-lock.json`.
3. THE app SHALL build successfully (`vite build`) and all tests SHALL pass (`vitest --run`) after any dependency removal.
4. THE Cleanup_Process SHALL NOT remove a dependency that is used only in generated code, build output, or as a transitive peer dependency required by another listed package.

---

### Requirement 14: Preserve All Determination Logic Exactly

**User Story:** As a developer, I want the cleanup to guarantee that no assessment-engine logic changes, so that regulatory correctness is not accidentally broken.

#### Acceptance Criteria

1. THE `computeDetermination` function SHALL produce identical output for all inputs before and after cleanup, verified by the existing test suite in `tests/regassess-baseline-engine.spec.ts`.
2. THE `computeDerivedState`, `getQuestions`, `getBlocks`, and `changeTaxonomy` functions SHALL produce identical output for all inputs before and after cleanup, verified by `tests/regassess-question-visibility.spec.ts` and `tests/app-shell.spec.ts`.
3. WHEN any file in `src/lib/assessment-engine/` is modified, THE Cleanup_Process SHALL run the full test suite and confirm zero failures before proceeding.
4. THE Cleanup_Process SHALL NOT rewrite, reorder, or restructure the declarative rule arrays in `computeDetermination.ts` unless the change is a provably behavior-neutral formatting fix.

---

### Requirement 15: Maintain Full Test Suite Passage

**User Story:** As a developer, I want all existing tests to pass after every cleanup batch, so that regressions are caught immediately.

#### Acceptance Criteria

1. THE full test suite (`vitest --run`) SHALL pass with zero failures after each logical batch of cleanup changes.
2. THE Cleanup_Process SHALL NOT delete any test that covers live behavior.
3. IF a cleanup change causes a test to fail, THEN THE Cleanup_Process SHALL revert the change and investigate before proceeding.
4. WHEN new tests are added to reduce regression risk for a specific cleanup action, THE new tests SHALL pass before and after the cleanup change.

---

### Requirement 16: Maintain Clean Build and Typecheck

**User Story:** As a developer, I want the app to build cleanly and typecheck without errors after cleanup, so that the codebase is in a deployable state.

#### Acceptance Criteria

1. THE command `vite build` SHALL complete without errors after all cleanup changes.
2. THE command `tsc --noEmit` SHALL complete with zero errors after all cleanup changes.
3. THE Cleanup_Process SHALL NOT introduce new TypeScript `any` casts or `@ts-ignore` suppressions to silence errors.
4. IF a cleanup change introduces a new type error, THEN THE Cleanup_Process SHALL fix the type error as part of the same batch.

---

### Requirement 17: Non-Goals (Explicit Exclusions)

**User Story:** As a developer, I want the scope of this cleanup to be clearly bounded, so that reviewers can confidently approve changes knowing what is out of scope.

#### Acceptance Criteria

1. THE Cleanup_Process SHALL NOT change any user-visible text, labels, or copy in the application.
2. THE Cleanup_Process SHALL NOT change any regulatory logic, pathway rules, consistency rules, or determination outcomes.
3. THE Cleanup_Process SHALL NOT change any API shape, localStorage key, or data format used by `assessment-store.ts` or `feedback-service.ts`.
4. THE Cleanup_Process SHALL NOT redesign any UI layout, color scheme, or visual hierarchy.
5. THE Cleanup_Process SHALL NOT add new features, new screens, or new user flows.
6. THE Cleanup_Process SHALL NOT swap any currently working dependency for an alternative unless the existing dependency is confirmed unused and the swap is a removal, not a replacement.
7. THE Cleanup_Process SHALL NOT remove any code that is used in a test, even if that code is not used in the production app, without first updating the test.
