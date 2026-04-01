import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, webcrypto } from 'node:crypto';

const SUPPORTED_ACCESS_PASS_VERSION = 1;
const TEMPORARY_ACCESS_PASS_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
const REQUIRED_ARGS = ['kind', 'label'];
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

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

const parseArgs = (argv) => {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      continue;
    }

    const [flag, inlineValue] = current.slice(2).split('=');
    const nextValue = inlineValue ?? argv[index + 1];
    if (inlineValue === undefined) {
      index += 1;
    }
    args[flag] = nextValue;
  }

  return args;
};

const encodeBase64Url = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const decodePem = (pem, beginLabel, endLabel) => {
  const body = pem.replace(beginLabel, '').replace(endLabel, '').replace(/\s+/g, '');
  return Buffer.from(body, 'base64');
};

const serializeAccessPassPayload = (payload) =>
  JSON.stringify({
    version: payload.version,
    passId: payload.passId,
    label: payload.label,
    kind: payload.kind,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  });

const args = parseArgs(process.argv.slice(2));

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

const privateKeyPath = path.resolve(repoRoot, args['private-key'] ?? path.join('.keys', 'access-pass-private-key.pem'));
const privateKeyPem = await readFile(privateKeyPath, 'utf8');
const privateKeyBytes = decodePem(privateKeyPem, '-----BEGIN PRIVATE KEY-----', '-----END PRIVATE KEY-----');

const privateKey = await webcrypto.subtle.importKey('pkcs8', privateKeyBytes, 'Ed25519', false, ['sign']);

const payload = {
  version: SUPPORTED_ACCESS_PASS_VERSION,
  passId: args['pass-id'] ?? randomUUID(),
  label: args.label,
  kind: args.kind,
  issuedAt,
  expiresAt:
    args.kind === 'temporary'
      ? new Date(Date.parse(issuedAt) + TEMPORARY_ACCESS_PASS_LIFETIME_MS).toISOString()
      : null,
};

const payloadJson = serializeAccessPassPayload(payload);
const payloadBytes = Buffer.from(payloadJson, 'utf8');
const signature = await webcrypto.subtle.sign('Ed25519', privateKey, payloadBytes);
const passString = `${encodeBase64Url(payloadBytes)}.${encodeBase64Url(Buffer.from(signature))}`;

console.log(passString);
