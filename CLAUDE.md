# CLAUDE.md — ChangePath

## Quick Start

```bash
npm install
npm run dev          # Vite dev server
npm run check-all    # type-check + lint + format:check + test (CI gate)
```

## Project Shape

- **Assessment engine** (`src/lib/assessment-engine/`): declarative rule engine for FDA regulatory pathway determination. `computeDetermination.ts`, `getQuestions.ts`, and `changeTaxonomy.ts` are intentionally large — they encode regulatory rules, not generic logic.
- **Persistence** is two layers: `storage.ts` (in-progress draft) and `assessment-store.ts` (named library records with versions and reviewer notes). Both sit on `browser-storage.ts`, which treats localStorage as untrusted input.
- **Hooks** orchestrate state: `useAssessmentWorkspace` (session), `useCascadeClearing` (answer dependencies), `useAssessmentProgress` (per-block counts), `useReviewPanelData` (review assembly).
- **Tests** (`tests/`): Vitest + Testing Library. Engine logic has very high coverage; UI tests exercise full workflows.

## Key Conventions

- Run `npm run check-all` before committing — it's the CI gate.
- Domain-rule changes (determination, questions, taxonomy) are the highest-risk area. Always add or update tests when modifying them.
- Browser persistence is untrusted input — validate before use (see `isAnswersRecord`, `isSavedAssessment`).
- Pure business logic is extracted into standalone functions (e.g., `applyCascadeClearing`, `computeProgressCounts`) with hook wrappers for React integration. Prefer this pattern for testability.
- Reusable CSS classes live in `src/styles.css`. Prefer them over inline styles for repeated patterns.
- `as string` casts on answer values (e.g., `answers.B2 as string`) are intentional — these fields are known string-typed by domain rules. The `answerAsString()` utility is for cases where you need a safe fallback to `''`.

## File Sizes

Some files are large by design and should not be split:
- `computeDetermination.ts` (~760 lines) — single declarative rule table
- `getQuestions.ts` (~540 lines) — field definitions with visibility logic
- `changeTaxonomy.ts` (~600 lines) — change type catalog

## Testing

- Test helpers in `tests/helpers.ts`: `base510k()`, `baseDeNovo()`, `basePMA()` for answer baselines; `findField()`, `isFieldVisible()`, `isFieldHidden()` for visibility assertions.
- When testing `computeEvidenceGaps()`, some flags come from `DeterminationResult` — you can use the real `computeDetermination()` or stub the determination object directly.
