import { describe, expect, it } from 'vitest';
import { verifyAccessPass } from '../src/access/verify-pass';
import { createSignedAccessPass, tamperAccessPassPayload } from './access-test-helpers';

describe('access pass verification', () => {
  it('treats temporary passes as expired once now reaches expiresAt', async () => {
    const fixture = await createSignedAccessPass({
      payload: {
        kind: 'temporary',
        issuedAt: '2026-03-01T00:00:00.000Z',
      },
    });

    const beforeExpiry = await verifyAccessPass(fixture.rawPass, {
      publicKeyPem: fixture.publicKeyPem,
      now: new Date('2026-03-14T23:59:59.999Z'),
    });
    const atExpiry = await verifyAccessPass(fixture.rawPass, {
      publicKeyPem: fixture.publicKeyPem,
      now: new Date('2026-03-15T00:00:00.000Z'),
    });

    expect(beforeExpiry).toMatchObject({ ok: true });
    expect(atExpiry).toMatchObject({
      ok: false,
      reason: 'expired',
    });
  });

  it('rejects malformed pasted passes', async () => {
    const result = await verifyAccessPass('not-a-valid-pass', {
      publicKeyPem:
        '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEALrSkF0+5pgKZzmo7aX6ixkmKuuNHYsYvwdivgLPgAvM=\n-----END PUBLIC KEY-----\n',
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'invalid_format',
    });
  });

  it('rejects tampered payloads whose signatures no longer match', async () => {
    const fixture = await createSignedAccessPass({
      payload: {
        kind: 'permanent',
        label: 'Original label',
      },
    });

    const tamperedPass = tamperAccessPassPayload(fixture.rawPass, (payload) => ({
      ...payload,
      label: 'Tampered label',
    }));

    const result = await verifyAccessPass(tamperedPass, {
      publicKeyPem: fixture.publicKeyPem,
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'invalid_signature',
    });
  });
});
