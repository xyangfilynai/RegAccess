# ChangePath

ChangePath is a Vite + React + TypeScript prototype for structured regulatory pathway assessment of changes to AI-enabled medical devices. It guides a reviewer through baseline device context, change classification, significance review, PCCP scope checks, population and equity considerations, and a final assessment record with report export support.

## Repository Overview

- `src/App.tsx`: top-level screen composition for the dashboard, assessment flow, feedback survey, and handoff workflow.
- `src/hooks/useAssessmentWorkspace.ts`: session orchestration for draft work, saved-library records, and source-controlled sample cases.
- `src/hooks/useAssessmentFlow.ts`: block navigation, pathway-critical validation, and assessment-step progression.
- `src/lib/assessment-engine/`: domain engine for question visibility, derived state, change taxonomy, and pathway determination.
- `src/lib/assessment-store.ts`: normalized saved-assessment persistence with reviewer notes and version snapshots.
- `src/lib/storage.ts`: resumable in-browser draft storage for the active assessment session.
- `src/lib/browser-storage.ts`: low-level browser storage guards and JSON parsing helpers.
- `src/components/`: assessment layout, dashboard, question rendering, review panel, and handoff UI.
- `src/sample-cases/`: source-controlled scenarios used for demos and regression coverage.
- `tests/`: Vitest and Testing Library coverage for engine logic, UI workflows, persistence, and report output.

## Local Development

1. Install dependencies with `npm install`.
2. Start the app with `npm run dev`.
3. Run the full validation suite with `npm run check-all`.

Available scripts:

- `npm run dev`: start the Vite dev server.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: preview the production build locally.
- `npm run type-check`: run TypeScript without emitting files.
- `npm run lint`: run ESLint with warnings treated as failures.
- `npm run test`: run the Vitest suite.
- `npm run test:coverage`: run tests with coverage thresholds enabled.
- `npm run format`: apply Prettier to source and tests.
- `npm run format:check`: verify Prettier formatting.
- `npm run check-all`: run type-check, lint, format-check, and tests in sequence.

## Architecture Notes

### Assessment engine

The assessment engine is intentionally centralized and mostly declarative. Large files such as `computeDetermination.ts`, `getQuestions.ts`, and `changeTaxonomy.ts` encode regulatory rules and structured domain content rather than generic UI logic. Changes in this area should be deliberate and strongly regression-tested.

### Workspace modes

The app now distinguishes among three workspace sources:

- Draft: the resumable in-browser assessment session.
- Library: a saved assessment record loaded from the assessment library.
- Sample: a source-controlled demonstration scenario.

Only the draft workspace writes back to resumable browser storage. Opening a sample case or a saved library record does not overwrite the draft session.

### Persistence layers

- `src/lib/storage.ts` stores the active browser draft.
- `src/lib/assessment-store.ts` stores named library records, reviewer notes, and change snapshots.
- `src/lib/browser-storage.ts` guards browser persistence against malformed or corrupted data before it reaches the rest of the app.

Saved assessments are normalized on read so legacy or partially malformed stored records can be recovered instead of being silently discarded when possible.

## Quality Guardrails

- GitHub Actions runs `npm run check-all` on pushes to `main` and on pull requests.
- Coverage thresholds are enforced when running `npm run test:coverage`.
- ESLint warnings fail the lint step so code quality issues do not accumulate quietly.

## Testing Approach

- Engine-focused tests validate pathway logic, question visibility, cumulative change handling, and report generation.
- UI workflow tests exercise the dashboard, assessment layout, review panel, and end-to-end interaction paths.
- Persistence tests cover malformed browser storage, saved-assessment normalization, and feedback submission fallback behavior.

## Contributor Guidance

- Treat browser persistence as untrusted input and validate it before use.
- Prefer extracting orchestration and workflow logic into hooks or library modules instead of growing `App.tsx` or top-level UI components.
- Keep domain-rule edits tightly scoped and pair them with tests in `tests/regassess-*.spec.ts`.
- Avoid adding generated artifacts such as `coverage/` or `dist/` to version control.
