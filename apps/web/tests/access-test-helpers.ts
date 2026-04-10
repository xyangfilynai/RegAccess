import { TEMPORARY_ACCESS_PASS_LIFETIME_MS, type AccessPassPayload } from '../src/access/pass-types';
import { serializeAccessPassPayload } from '../src/access/verify-pass';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const toArrayBuffer = (value: Uint8Array): ArrayBuffer =>
  value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;

const bytesToBase64 = (value: Uint8Array): string => {
  let binary = '';
  for (let index = 0; index < value.length; index += 1) {
    binary += String.fromCharCode(value[index]);
  }
  return btoa(binary);
};

const encodeBase64Url = (value: Uint8Array): string =>
  bytesToBase64(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

const decodeBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  const binary = atob(normalized + padding);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const arrayBufferToPem = (label: string, keyData: ArrayBuffer): string => {
  const base64 = bytesToBase64(new Uint8Array(keyData));
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
};

interface CreateSignedAccessPassOptions {
  payload?: Partial<AccessPassPayload>;
}

export interface SignedAccessPassFixture {
  rawPass: string;
  payload: AccessPassPayload;
  publicKeyPem: string;
}

export const createSignedAccessPass = async ({
  payload: payloadOverrides = {},
}: CreateSignedAccessPassOptions = {}): Promise<SignedAccessPassFixture> => {
  const keyPair = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);

  const issuedAt = payloadOverrides.issuedAt ?? '2026-03-01T00:00:00.000Z';
  const kind = payloadOverrides.kind ?? 'temporary';
  const expiresAt =
    kind === 'temporary'
      ? (payloadOverrides.expiresAt ?? new Date(Date.parse(issuedAt) + TEMPORARY_ACCESS_PASS_LIFETIME_MS).toISOString())
      : (payloadOverrides.expiresAt ?? null);

  const payload: AccessPassPayload = {
    version: payloadOverrides.version ?? 1,
    passId: payloadOverrides.passId ?? 'pass-001',
    label: payloadOverrides.label ?? 'QA tester',
    kind,
    issuedAt,
    expiresAt,
  };

  const payloadJson = serializeAccessPassPayload(payload);
  const payloadBytes = textEncoder.encode(payloadJson);
  const signature = await crypto.subtle.sign('Ed25519', keyPair.privateKey, toArrayBuffer(payloadBytes));
  const publicKeyPem = arrayBufferToPem('PUBLIC KEY', await crypto.subtle.exportKey('spki', keyPair.publicKey));
  const rawPass = `${encodeBase64Url(payloadBytes)}.${encodeBase64Url(new Uint8Array(signature))}`;

  return {
    rawPass,
    payload,
    publicKeyPem,
  };
};

export const tamperAccessPassPayload = (
  rawPass: string,
  updater: (payload: AccessPassPayload) => AccessPassPayload,
): string => {
  const [payloadSegment, signatureSegment] = rawPass.split('.');
  const payload = JSON.parse(textDecoder.decode(decodeBase64Url(payloadSegment))) as AccessPassPayload;
  const updatedPayload = updater(payload);
  const updatedPayloadBytes = textEncoder.encode(serializeAccessPassPayload(updatedPayload));

  return `${encodeBase64Url(updatedPayloadBytes)}.${signatureSegment}`;
};
