import { existsSync } from 'node:fs';
import {
  bundledPublicKeyPath,
  createRegistryEntry,
  defaultPrivateKeyPath,
  defaultPublicKeyPath,
  describeStatusCounts,
  formatRegistryTable,
  getEntryStatus,
  isBundledPublicKeyConfigured,
  issueAccessPass,
  keysDir,
  parseArgs,
  readRegistry,
  registryPath,
  resolvePrivateKeyPath,
  retireRegistryEntry,
  upsertRegistryEntry,
} from './access-pass-lib.mjs';

const usage = `Access pass toolkit

Usage:
  npm run access:manage -- status
  npm run access:manage -- issue --kind temporary --label "QA tester"
  npm run access:manage -- issue --kind permanent --label "Design partner" --note "pilot cohort"
  npm run access:manage -- list
  npm run access:manage -- list --status active
  npm run access:manage -- show --pass-id partner-001
  npm run access:manage -- retire --pass-id partner-001 --reason "Superseded"

Commands:
  status   Show key, bundle, and registry status
  issue    Generate and record a new signed pass
  list     List locally recorded passes
  show     Show a recorded pass and its raw pass string
  retire   Mark a recorded pass as retired in the local registry only

Notes:
  - The registry is stored locally at .keys/access-pass-registry.json and is gitignored.
  - Retiring a pass here does not remotely revoke copies already distributed.
`;

const printUsage = () => {
  console.log(usage);
};

const requireOption = (options, key, message) => {
  const value = options[key];
  if (!value || typeof value !== 'string') {
    console.error(message);
    process.exit(1);
  }
  return value;
};

const validateIssuedAt = (issuedAt) => {
  if (!Number.isFinite(Date.parse(issuedAt))) {
    console.error('issued-at must be a valid ISO timestamp.');
    process.exit(1);
  }
};

const showStatus = async () => {
  const entries = await readRegistry();
  const counts = describeStatusCounts(entries);
  const bundledConfigured = await isBundledPublicKeyConfigured();

  console.log(`Toolkit status
- Key directory: ${keysDir}
- Private key present: ${existsSync(defaultPrivateKeyPath) ? 'yes' : 'no'} (${defaultPrivateKeyPath})
- Public key present: ${existsSync(defaultPublicKeyPath) ? 'yes' : 'no'} (${defaultPublicKeyPath})
- Bundled public key configured: ${bundledConfigured ? 'yes' : 'no'} (${bundledPublicKeyPath})
- Registry present: ${existsSync(registryPath) ? 'yes' : 'no'} (${registryPath})
- Registry counts: ${entries.length} total, ${counts.active} active, ${counts.expired} expired, ${counts.retired} retired`);
};

const issuePass = async (options) => {
  const kind = requireOption(options, 'kind', 'issue requires --kind temporary|permanent');
  const label = requireOption(options, 'label', 'issue requires --label "Display label"');
  if (kind !== 'temporary' && kind !== 'permanent') {
    console.error('Pass kind must be "temporary" or "permanent".');
    process.exit(1);
  }

  const issuedAt = typeof options['issued-at'] === 'string' ? options['issued-at'] : new Date().toISOString();
  validateIssuedAt(issuedAt);

  const privateKeyPath = resolvePrivateKeyPath(
    typeof options['private-key'] === 'string' ? options['private-key'] : undefined,
  );
  const registryEntries = await readRegistry();
  const passId = typeof options['pass-id'] === 'string' ? options['pass-id'] : undefined;

  if (passId && registryEntries.some((entry) => entry.passId === passId)) {
    console.error(`A registry entry already exists for passId "${passId}". Choose a different passId.`);
    process.exit(1);
  }

  const { payload, rawPass } = await issueAccessPass({
    kind,
    label,
    passId,
    issuedAt,
    privateKeyPath,
  });

  const registryEntry = createRegistryEntry({
    payload,
    rawPass,
    note: typeof options.note === 'string' ? options.note : undefined,
  });

  await upsertRegistryEntry(registryEntry);

  console.log(`Issued ${payload.kind} pass
- passId: ${payload.passId}
- label: ${payload.label}
- issuedAt: ${payload.issuedAt}
- expiresAt: ${payload.expiresAt ?? 'Never'}
- registry: ${registryPath}

Raw pass:
${rawPass}`);
};

const listPasses = async (options) => {
  const statusFilter = typeof options.status === 'string' ? options.status : 'all';
  if (!['all', 'active', 'expired', 'retired'].includes(statusFilter)) {
    console.error('list --status must be one of: all, active, expired, retired');
    process.exit(1);
  }

  const entries = await readRegistry();
  const filteredEntries =
    statusFilter === 'all' ? entries : entries.filter((entry) => getEntryStatus(entry) === statusFilter);

  console.log(formatRegistryTable(filteredEntries));
};

const showPass = async (options) => {
  const passId = requireOption(options, 'pass-id', 'show requires --pass-id <id>');
  const entries = await readRegistry();
  const entry = entries.find((candidate) => candidate.passId === passId);
  if (!entry) {
    console.error(`No recorded pass found for "${passId}".`);
    process.exit(1);
  }

  console.log(`Pass details
- passId: ${entry.passId}
- label: ${entry.label}
- kind: ${entry.kind}
- status: ${getEntryStatus(entry)}
- issuedAt: ${entry.issuedAt}
- expiresAt: ${entry.expiresAt ?? 'Never'}
- recordedAt: ${entry.createdAt}
- note: ${entry.note ?? 'None'}
- retiredAt: ${entry.retiredAt ?? 'Not retired'}
- retiredReason: ${entry.retiredReason ?? 'None'}

Raw pass:
${entry.rawPass}`);
};

const retirePass = async (options) => {
  const passId = requireOption(options, 'pass-id', 'retire requires --pass-id <id>');
  const updatedEntry = await retireRegistryEntry({
    passId,
    reason: typeof options.reason === 'string' ? options.reason : undefined,
  });

  if (!updatedEntry) {
    console.error(`No recorded pass found for "${passId}".`);
    process.exit(1);
  }

  console.log(`Retired local registry entry
- passId: ${updatedEntry.passId}
- label: ${updatedEntry.label}
- status: retired
- retiredAt: ${updatedEntry.retiredAt}
- retiredReason: ${updatedEntry.retiredReason}

Note: retiring a pass here does not remotely revoke copies already distributed.`);
};

const { positional, options } = parseArgs(process.argv.slice(2));
const command = positional[0];

if (!command || command === 'help' || command === '--help') {
  printUsage();
  process.exit(0);
}

switch (command) {
  case 'status':
    await showStatus();
    break;
  case 'issue':
    await issuePass(options);
    break;
  case 'list':
    await listPasses(options);
    break;
  case 'show':
    await showPass(options);
    break;
  case 'retire':
    await retirePass(options);
    break;
  default:
    console.error(`Unknown command "${command}".`);
    printUsage();
    process.exit(1);
}
