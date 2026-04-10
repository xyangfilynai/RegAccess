# ChangePath

ChangePath is a Vite + React + TypeScript prototype for structured regulatory pathway assessment of changes to AI-enabled medical devices. It guides a reviewer through baseline device context, change classification, significance review, PCCP scope checks, population and equity considerations, and a final assessment record with report export support.

## Repository Overview

- `src/App.tsx`: top-level screen composition for the dashboard, assessment flow, and handoff workflow.
- `src/hooks/useAssessmentWorkspace.ts`: session orchestration for draft work, saved-library records, and source-controlled sample cases.
- `src/hooks/useAssessmentFlow.ts`: block navigation, pathway-critical validation, and assessment-step progression.
- `src/access/`: offline access-pass verification, storage, locked-screen UI, and startup gate orchestration.
- `src/lib/assessment-engine/`: domain engine for question visibility, derived state, change taxonomy, and pathway determination.
- `src/lib/assessment-store.ts`: normalized saved-assessment persistence with reviewer notes and version snapshots.
- `src/lib/storage.ts`: resumable in-browser draft storage for the active assessment session.
- `src/lib/browser-storage.ts`: low-level browser storage guards and JSON parsing helpers.
- `src/components/`: assessment layout, dashboard, question rendering, review panel, and handoff UI.
- `src/sample-cases/`: source-controlled scenarios used for demos and regression coverage.
- `scripts/`: local-only admin tooling for generating access-pass keypairs and signed passes.
- `.keys/`: local-only, gitignored operator materials such as the private key and optional pass registry.
- `tests/`: Vitest and Testing Library coverage for engine logic, UI workflows, persistence, and report output.

## Local Development

1. Install dependencies with `npm install`.
2. Start local infrastructure with `docker compose up -d postgres` if you are using the default local database.
3. Create `apps/api/.env` from `apps/api/.env.example` if it does not already exist.
4. Run `npm run db:migrate`.
5. Run `npm run db:seed`.
6. Generate an access-pass keypair with `npm run access:keypair` the first time you set up the repo.
7. Start the app with `npm run dev`.
8. Run the full validation suite with `npm run check-all`.

Notes:

- `apps/api` now loads `apps/api/.env` automatically for local `dev`, `start`, and `db:seed`.
- The committed default local database URL expects PostgreSQL on `localhost:5432`.
- The Vercel deployment serves the frontend from the Vite build and `/api/*` through a Node function bridge to the Fastify app.

Available scripts:

- `npm run access:keypair`: generate a local Ed25519 signing keypair, write the private key to `.keys/`, and update the bundled public key used by the app.
- `npm run access:manage -- status`: show local key, bundled-public-key, and registry status.
- `npm run access:manage -- issue --kind temporary --label "QA tester"`: issue and record a temporary pass in the local registry.
- `npm run access:manage -- list`: list locally recorded passes.
- `npm run access:manage -- show --pass-id partner-001`: show a recorded pass and its raw pass string.
- `npm run access:manage -- retire --pass-id partner-001 --reason "Superseded"`: retire a pass in the local registry only.
- `npm run access:manage -- delete --pass-id partner-001`: delete a specific pass entry from the local registry.
- `npm run access:manage -- prune --status retired`: delete retired or expired entries from the local registry in bulk.
- `npm run access:pass -- --kind temporary --label "QA tester"`: generate a signed temporary access pass using the local private key.
- `npm run access:pass -- --kind permanent --label "Design partner"`: generate a signed permanent access pass using the local private key.
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

### Scaling roadmap

- Immediate hardening: keep CI scoped to this app's tests, fail loudly on browser-storage write errors, and store saved assessments as individual records instead of one growing localStorage blob.
- Next product step: move authentication, saved-record persistence, reviewer collaboration, and audit history behind a backend boundary.
- Long-term scale target: replace browser-only version history with IndexedDB or server storage and add shared access control, review workflows, and remote revocation/audit capabilities.

## Offline Access Passes

ChangePath now includes a local-only access gate that runs before the assessment app mounts. The app stays locked until a signed access pass has been pasted and verified on that device.

### Privacy properties

- No signup.
- No account.
- No backend validation.
- No assessment data, pass data, or unlock events leave the device.
- Access verification happens locally in the browser with the bundled public key.

### Setup

1. Run `npm run access:keypair`.
2. Keep the generated private key in `.keys/access-pass-private-key.pem` on the machine that issues passes. Do not commit it.
3. Start the app with `npm run dev`.
4. Generate a pass and paste it into the locked screen once on the target device.

The keypair script also updates `src/access/public-key.ts` so the frontend can verify signed passes offline. The `.keys/` directory is gitignored and is intended for local development and controlled distribution only.

### Operator toolkit

If you want a lighter-weight management flow than hand-running individual commands, use the local operator toolkit:

```bash
npm run access:manage -- status
npm run access:manage -- issue --kind temporary --label "QA tester"
npm run access:manage -- list
npm run access:manage -- show --pass-id partner-001
npm run access:manage -- delete --pass-id partner-001
npm run access:manage -- prune --status retired
```

The toolkit keeps a local registry at `.keys/access-pass-registry.json`. That registry is gitignored and can store the raw pass strings you generated so you can look them up later without regenerating them.

Important: the registry is sensitive. Anyone who gets a valid raw pass string can use it to unlock a local copy until it expires or you rotate the keypair.

### Pass format

The app accepts a single pasted string in this envelope format:

`base64url(payload-json) + "." + base64url(signature)`

The signed payload contains:

- `version`
- `passId`
- `label`
- `kind` as `temporary` or `permanent`
- `issuedAt`
- `expiresAt`

Signatures are generated with an Ed25519 private key outside the app. The SPA verifies them locally with the matching public key.

### Generating passes

Temporary pass:

```bash
npm run access:manage -- issue --kind temporary --label "QA tester"
```

You can still generate a one-off pass without recording it:

```bash
npm run access:pass -- --kind temporary --label "QA tester"
```

Permanent pass:

```bash
npm run access:manage -- issue --kind permanent --label "Design partner"
```

Or generate a one-off permanent pass without recording it:

```bash
npm run access:pass -- --kind permanent --label "Design partner"
```

Optional flags:

- `--issued-at "2026-04-01T00:00:00.000Z"` to generate deterministic test passes.
- `--pass-id "partner-001"` to set your own identifier.
- `--private-key "/path/to/access-pass-private-key.pem"` to use a non-default key location.
- `--note "pilot cohort"` to attach a local note when using `access:manage issue`.

### Local registry cleanup

The operator toolkit supports:

```bash
npm run access:manage -- retire --pass-id partner-001 --reason "Superseded"
```

That marks the pass as retired in your local registry so it no longer looks active in your operator view.

It does not remotely revoke already shared passes. Because the system is offline-only, a copied pass remains valid until it expires or you rotate the signing keypair.

If you want to remove registry entries completely:

```bash
npm run access:manage -- delete --pass-id partner-001
npm run access:manage -- prune --status retired
npm run access:manage -- prune --status expired
```

These commands remove records from `.keys/access-pass-registry.json` only. They do not delete the signing keypair and they do not remotely revoke any pass that has already been copied elsewhere.

### Temporary expiry rules

- Temporary passes expire exactly 14 days after `issuedAt`.
- Expiry is based on the pass payload, not first open.
- Once a stored temporary pass expires, the app re-locks on next startup, removes the stored pass, and clears protected local assessment persistence.

### Key rotation

Rerun `npm run access:keypair` whenever you need a new signing keypair. That replaces the bundled public key and means previously issued passes will no longer validate in new builds unless they are reissued with the new private key.

Because this system is intentionally offline-only, there is no remote revocation list or server-side invalidation path. Rotation is the practical way to retire older passes.

### Limitations

- This is an offline access gate for controlled testing, not perfect anti-sharing or DRM.
- A user with a valid pass can still unlock their local copy without contacting a server.
- There is no remote revocation because the system does not call home.

## Quality Guardrails

- GitHub Actions runs `npm run check-all` on pushes to `main` and on pull requests.
- Coverage thresholds are enforced when running `npm run test:coverage`.
- ESLint warnings fail the lint step so code quality issues do not accumulate quietly.

## Testing Approach

- Engine-focused tests validate pathway logic, question visibility, cumulative change handling, and report generation.
- UI workflow tests exercise the dashboard, assessment layout, review panel, and end-to-end interaction paths.
- Persistence tests cover malformed browser storage and saved-assessment normalization.

## Contributor Guidance

- Treat browser persistence as untrusted input and validate it before use.
- Prefer extracting orchestration and workflow logic into hooks or library modules instead of growing `App.tsx` or top-level UI components.
- Keep domain-rule edits tightly scoped and pair them with tests in `tests/regassess-*.spec.ts`.
- Avoid adding generated artifacts such as `coverage/` or `dist/` to version control.
