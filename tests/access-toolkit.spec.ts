import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { webcrypto } from 'node:crypto';
// @ts-expect-error Test-only import of the local ESM script helper.
import { issueAccessPass } from '../scripts/access-pass-lib.mjs';
import { verifyAccessPass } from '../src/access/verify-pass';

const toPem = (label: string, keyData: ArrayBuffer): string => {
  const base64 = Buffer.from(keyData).toString('base64');
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
};

describe('access toolkit signing', () => {
  it('issues passes that verify against the matching public key', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'changepath-access-'));

    try {
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
});
