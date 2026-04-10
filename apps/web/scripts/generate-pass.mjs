import { issueAccessPass, parseArgs, resolvePrivateKeyPath } from './access-pass-lib.mjs';

const REQUIRED_ARGS = ['kind', 'label'];

const usage = `Usage:
  npm run access:pass -- --kind temporary --label "QA tester"
  npm run access:pass -- --kind permanent --label "Design partner"

Options:
  --kind temporary|permanent
  --label "Display label"
  --pass-id "optional-stable-id"
  --issued-at "2026-04-01T00:00:00.000Z"
  --private-key "/absolute/or/relative/path/to/private-key.pem"
`;

const { options: args } = parseArgs(process.argv.slice(2));

for (const key of REQUIRED_ARGS) {
  if (!args[key]) {
    console.error(usage);
    process.exit(1);
  }
}

if (args.kind !== 'temporary' && args.kind !== 'permanent') {
  console.error('Pass kind must be "temporary" or "permanent".');
  console.error(usage);
  process.exit(1);
}

const issuedAt = args['issued-at'] ?? new Date().toISOString();
if (!Number.isFinite(Date.parse(issuedAt))) {
  console.error('issued-at must be a valid ISO timestamp.');
  process.exit(1);
}

const { rawPass: passString } = await issueAccessPass({
  kind: args.kind,
  label: args.label,
  passId: typeof args['pass-id'] === 'string' ? args['pass-id'] : undefined,
  issuedAt,
  privateKeyPath: resolvePrivateKeyPath(typeof args['private-key'] === 'string' ? args['private-key'] : undefined),
});

console.log(passString);
