import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, webcrypto } from 'node:crypto';

export const SUPPORTED_ACCESS_PASS_VERSION = 1;
export const TEMPORARY_ACCESS_PASS_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
export const REGISTRY_SCHEMA_VERSION = 1;

export const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, '..');
export const keysDir = path.join(repoRoot, '.keys');
export const defaultPrivateKeyPath = path.join(keysDir, 'access-pass-private-key.pem');
export const defaultPublicKeyPath = path.join(keysDir, 'access-pass-public-key.pem');
export const registryPath = path.join(keysDir, 'access-pass-registry.json');
export const bundledPublicKeyPath = path.join(repoRoot, 'src', 'access', 'public-key.ts');

const RETIRED_REASON_FALLBACK = 'Retired from local issuance registry';

export const parseArgs = (argv) => {
  const positional = [];
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) {
      positional.push(current);
      continue;
    }

    const [flag, inlineValue] = current.slice(2).split('=');
    if (inlineValue !== undefined) {
      options[flag] = inlineValue;
      continue;
    }

    const nextValue = argv[index + 1];
    if (nextValue && !nextValue.startsWith('--')) {
      options[flag] = nextValue;
      index += 1;
    } else {
      options[flag] = true;
    }
  }

  return {
    positional,
    options,
  };
};

export const encodeBase64Url = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const toArrayBuffer = (value) => value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);

const decodePem = (pem, beginLabel, endLabel) =>
  Buffer.from(pem.replace(beginLabel, '').replace(endLabel, '').replace(/\s+/g, ''), 'base64');

export const serializeAccessPassPayload = (payload) =>
  JSON.stringify({
    version: payload.version,
    passId: payload.passId,
    label: payload.label,
    kind: payload.kind,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  });

export const resolvePrivateKeyPath = (requestedPath) =>
  path.resolve(repoRoot, requestedPath ?? path.join('.keys', 'access-pass-private-key.pem'));

export const createAccessPassPayload = ({ kind, label, passId, issuedAt }) => ({
  version: SUPPORTED_ACCESS_PASS_VERSION,
  passId: passId ?? randomUUID(),
  label,
  kind,
  issuedAt,
  expiresAt: kind === 'temporary' ? new Date(Date.parse(issuedAt) + TEMPORARY_ACCESS_PASS_LIFETIME_MS).toISOString() : null,
});

export const importPrivateSigningKey = async (privateKeyPath) => {
  const privateKeyPem = await readFile(privateKeyPath, 'utf8');
  const privateKeyBytes = decodePem(privateKeyPem, '-----BEGIN PRIVATE KEY-----', '-----END PRIVATE KEY-----');

  return webcrypto.subtle.importKey('pkcs8', toArrayBuffer(privateKeyBytes), 'Ed25519', false, ['sign']);
};

export const signPayload = async ({ payload, privateKeyPath }) => {
  const privateKey = await importPrivateSigningKey(privateKeyPath);
  const payloadBytes = Buffer.from(serializeAccessPassPayload(payload), 'utf8');
  const signature = await webcrypto.subtle.sign('Ed25519', privateKey, toArrayBuffer(payloadBytes));

  return `${encodeBase64Url(payloadBytes)}.${encodeBase64Url(Buffer.from(signature))}`;
};

export const issueAccessPass = async ({ kind, label, passId, issuedAt, privateKeyPath }) => {
  const payload = createAccessPassPayload({
    kind,
    label,
    passId,
    issuedAt,
  });

  return {
    payload,
    rawPass: await signPayload({
      payload,
      privateKeyPath,
    }),
  };
};

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidTimestamp = (value) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const isPassKind = (value) => value === 'temporary' || value === 'permanent';

const normalizeRegistryEntry = (value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  if (
    !isNonEmptyString(value.passId) ||
    !isNonEmptyString(value.label) ||
    !isPassKind(value.kind) ||
    !isValidTimestamp(value.issuedAt) ||
    !isValidTimestamp(value.createdAt) ||
    !isNonEmptyString(value.rawPass)
  ) {
    return null;
  }

  const expiresAt = value.expiresAt === null ? null : isValidTimestamp(value.expiresAt) ? value.expiresAt : null;
  if ((value.kind === 'temporary' && expiresAt === null) || (value.kind === 'permanent' && value.expiresAt !== null)) {
    return null;
  }

  return {
    passId: value.passId,
    label: value.label,
    kind: value.kind,
    issuedAt: value.issuedAt,
    expiresAt,
    createdAt: value.createdAt,
    rawPass: value.rawPass,
    note: isNonEmptyString(value.note) ? value.note : undefined,
    retiredAt: isValidTimestamp(value.retiredAt) ? value.retiredAt : undefined,
    retiredReason: isNonEmptyString(value.retiredReason) ? value.retiredReason : undefined,
  };
};

export const readRegistry = async () => {
  if (!existsSync(registryPath)) {
    return [];
  }

  try {
    const raw = JSON.parse(await readFile(registryPath, 'utf8'));
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return [];
    }

    if (!Array.isArray(raw.passes)) {
      return [];
    }

    return raw.passes.map((entry) => normalizeRegistryEntry(entry)).filter(Boolean);
  } catch {
    return [];
  }
};

export const writeRegistry = async (entries) => {
  const sortedEntries = [...entries].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const document = {
    schemaVersion: REGISTRY_SCHEMA_VERSION,
    passes: sortedEntries,
  };

  await mkdir(keysDir, { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
};

export const getEntryStatus = (entry, now = new Date()) => {
  if (entry.retiredAt) return 'retired';
  if (entry.kind === 'temporary' && entry.expiresAt && now.getTime() >= Date.parse(entry.expiresAt)) return 'expired';
  return 'active';
};

export const describeStatusCounts = (entries, now = new Date()) =>
  entries.reduce(
    (counts, entry) => {
      const status = getEntryStatus(entry, now);
      counts[status] += 1;
      return counts;
    },
    { active: 0, expired: 0, retired: 0 },
  );

export const upsertRegistryEntry = async (entry) => {
  const entries = await readRegistry();
  const existingIndex = entries.findIndex((candidate) => candidate.passId === entry.passId);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  await writeRegistry(entries);
};

export const createRegistryEntry = ({ payload, rawPass, note }) => ({
  passId: payload.passId,
  label: payload.label,
  kind: payload.kind,
  issuedAt: payload.issuedAt,
  expiresAt: payload.expiresAt,
  createdAt: new Date().toISOString(),
  rawPass,
  note: isNonEmptyString(note) ? note : undefined,
});

export const retireRegistryEntry = async ({ passId, reason }) => {
  const entries = await readRegistry();
  const entry = entries.find((candidate) => candidate.passId === passId);
  if (!entry) {
    return null;
  }

  const updatedEntry = {
    ...entry,
    retiredAt: new Date().toISOString(),
    retiredReason: isNonEmptyString(reason) ? reason : RETIRED_REASON_FALLBACK,
  };

  await upsertRegistryEntry(updatedEntry);
  return updatedEntry;
};

export const deleteRegistryEntry = async ({ passId }) => {
  const entries = await readRegistry();
  const entryIndex = entries.findIndex((candidate) => candidate.passId === passId);
  if (entryIndex < 0) {
    return null;
  }

  const [deletedEntry] = entries.splice(entryIndex, 1);
  await writeRegistry(entries);
  return deletedEntry;
};

export const pruneRegistryEntries = async ({ status, now = new Date() }) => {
  const entries = await readRegistry();
  const removedEntries = entries.filter((entry) => getEntryStatus(entry, now) === status);
  const keptEntries = entries.filter((entry) => getEntryStatus(entry, now) !== status);

  if (removedEntries.length === 0) {
    return {
      removedEntries: [],
      keptEntries: entries,
    };
  }

  await writeRegistry(keptEntries);
  return {
    removedEntries,
    keptEntries,
  };
};

export const formatShortDate = (value) => {
  if (!value) return 'Never';
  return new Date(value).toISOString().slice(0, 10);
};

export const formatRegistryTable = (entries, now = new Date()) => {
  if (entries.length === 0) {
    return 'No issued passes recorded yet.';
  }

  const rows = entries.map((entry) => ({
    passId: entry.passId,
    label: entry.label,
    kind: entry.kind,
    status: getEntryStatus(entry, now),
    issuedAt: formatShortDate(entry.issuedAt),
    expiresAt: entry.expiresAt ? formatShortDate(entry.expiresAt) : 'Never',
  }));

  const columns = [
    { key: 'passId', label: 'Pass ID' },
    { key: 'label', label: 'Label' },
    { key: 'kind', label: 'Kind' },
    { key: 'status', label: 'Status' },
    { key: 'issuedAt', label: 'Issued' },
    { key: 'expiresAt', label: 'Expires' },
  ];

  const widths = columns.map(({ key, label }) =>
    Math.max(label.length, ...rows.map((row) => String(row[key]).length)),
  );

  const header = columns.map((column, index) => column.label.padEnd(widths[index])).join('  ');
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  const body = rows
    .map((row) => columns.map((column, index) => String(row[column.key]).padEnd(widths[index])).join('  '))
    .join('\n');

  return `${header}\n${separator}\n${body}`;
};

export const readBundledPublicKeyFile = async () => {
  try {
    return await readFile(bundledPublicKeyPath, 'utf8');
  } catch {
    return '';
  }
};

export const isBundledPublicKeyConfigured = async () => {
  const source = await readBundledPublicKeyFile();
  const match = source.match(/ACCESS_PASS_PUBLIC_KEY_PEM\s*=\s*`([\s\S]*?)`;/);
  if (!match) return false;

  const bundledPem = match[1];
  return bundledPem.includes('BEGIN PUBLIC KEY') && !bundledPem.includes('REPLACE_WITH_ACCESS_PASS_PUBLIC_KEY');
};
