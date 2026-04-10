import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
import { verifyAccessPass } from '../src/access/verify-pass';

interface RegistryEntry {
  passId: string;
  label: string;
  kind: 'temporary' | 'permanent';
  issuedAt: string;
  expiresAt: string | null;
  createdAt: string;
  rawPass: string;
  note?: string;
  retiredAt?: string;
  retiredReason?: string;
}

interface AccessPassLibModule {
  issueAccessPass: (options: {
    kind: 'temporary' | 'permanent';
    label: string;
    passId?: string;
    issuedAt: string;
    privateKeyPath: string;
  }) => Promise<{
    payload: {
      version: number;
      passId: string;
      label: string;
      kind: 'temporary' | 'permanent';
      issuedAt: string;
      expiresAt: string | null;
    };
    rawPass: string;
  }>;
  createRegistryEntry: (input: {
    payload: {
      version: number;
      passId: string;
      label: string;
      kind: 'temporary' | 'permanent';
      issuedAt: string;
      expiresAt: string | null;
    };
    rawPass: string;
    note?: string;
  }) => RegistryEntry;
  writeRegistry: (entries: RegistryEntry[]) => Promise<void>;
  readRegistry: () => Promise<RegistryEntry[]>;
  getEntryStatus: (entry: RegistryEntry, now?: Date) => 'active' | 'expired' | 'retired';
  deleteRegistryEntry: (input: { passId: string }) => Promise<RegistryEntry | null>;
  pruneRegistryEntries: (input: {
    status: 'expired' | 'retired';
    now?: Date;
  }) => Promise<{ removedEntries: RegistryEntry[]; keptEntries: RegistryEntry[] }>;
}

const loadAccessPassLib = async (): Promise<AccessPassLibModule> =>
  (await import(
    /* @vite-ignore */ pathToFileURL(path.resolve(process.cwd(), 'scripts/access-pass-lib.mjs')).href
  )) as AccessPassLibModule;

const toPem = (label: string, keyData: ArrayBuffer): string => {
  const base64 = Buffer.from(keyData).toString('base64');
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
};

describe('access toolkit signing', () => {
  it('issues passes that verify against the matching public key', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'changepath-access-'));

    try {
      const { issueAccessPass } = await loadAccessPassLib();
      const keyPair = (await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify'])) as CryptoKeyPair;
      const [privateKeyPkcs8, publicKeySpki] = await Promise.all([
        webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey),
        webcrypto.subtle.exportKey('spki', keyPair.publicKey),
      ]);

      const privateKeyPath = path.join(tempDir, 'access-pass-private-key.pem');
      const publicKeyPem = toPem('PUBLIC KEY', publicKeySpki);

      await writeFile(privateKeyPath, toPem('PRIVATE KEY', privateKeyPkcs8), 'utf8');

      const { rawPass } = await issueAccessPass({
        kind: 'temporary',
        label: 'QA tester',
        issuedAt: '2026-04-01T00:00:00.000Z',
        privateKeyPath,
      });

      const result = await verifyAccessPass(rawPass, {
        publicKeyPem,
        now: new Date('2026-04-02T00:00:00.000Z'),
      });

      expect(result).toMatchObject({ ok: true });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('deletes and prunes local registry entries safely', async () => {
    const {
      createRegistryEntry,
      deleteRegistryEntry,
      getEntryStatus,
      pruneRegistryEntries,
      readRegistry,
      writeRegistry,
    } = await loadAccessPassLib();
    const existingEntries = await readRegistry();

    try {
      const activeEntry = createRegistryEntry({
        payload: {
          version: 1,
          passId: 'cleanup-active',
          label: 'Cleanup active',
          kind: 'temporary',
          issuedAt: '2026-04-01T00:00:00.000Z',
          expiresAt: '2026-04-15T00:00:00.000Z',
        },
        rawPass: 'active-pass',
      });
      const retiredEntry = {
        ...createRegistryEntry({
          payload: {
            version: 1,
            passId: 'cleanup-retired',
            label: 'Cleanup retired',
            kind: 'permanent',
            issuedAt: '2026-04-01T00:00:00.000Z',
            expiresAt: null,
          },
          rawPass: 'retired-pass',
        }),
        retiredAt: '2026-04-02T00:00:00.000Z',
        retiredReason: 'Superseded',
      };
      const expiredEntry = createRegistryEntry({
        payload: {
          version: 1,
          passId: 'cleanup-expired',
          label: 'Cleanup expired',
          kind: 'temporary',
          issuedAt: '2026-03-01T00:00:00.000Z',
          expiresAt: '2026-03-15T00:00:00.000Z',
        },
        rawPass: 'expired-pass',
      });

      await writeRegistry([activeEntry, retiredEntry, expiredEntry]);

      const deletedEntry = await deleteRegistryEntry({ passId: 'cleanup-active' });
      expect(deletedEntry?.passId).toBe('cleanup-active');

      const afterDelete = (await readRegistry()) as RegistryEntry[];
      expect(afterDelete.map((entry: RegistryEntry) => entry.passId)).not.toContain('cleanup-active');

      const retiredPrune = await pruneRegistryEntries({ status: 'retired' });
      expect(retiredPrune.removedEntries.map((entry: RegistryEntry) => entry.passId)).toEqual(['cleanup-retired']);

      const expiredPrune = await pruneRegistryEntries({
        status: 'expired',
        now: new Date('2026-04-01T00:00:00.000Z'),
      });
      expect(expiredPrune.removedEntries.map((entry: RegistryEntry) => entry.passId)).toEqual(['cleanup-expired']);

      const remainingEntries = (await readRegistry()) as RegistryEntry[];
      expect(remainingEntries).toEqual([]);
      expect(getEntryStatus(retiredEntry)).toBe('retired');
    } finally {
      await writeRegistry(existingEntries);
    }
  });
});
