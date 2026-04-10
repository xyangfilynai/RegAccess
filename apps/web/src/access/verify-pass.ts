import { ACCESS_PASS_PUBLIC_KEY_PEM, hasConfiguredAccessPassPublicKey } from './public-key';
import {
  ACCESS_PASS_FIELD_ORDER,
  SUPPORTED_ACCESS_PASS_VERSION,
  TEMPORARY_ACCESS_PASS_LIFETIME_MS,
  type AccessPassKind,
  type AccessPassPayload,
  type VerifyAccessPassFn,
  type VerifyAccessPassOptions,
  type VerifyAccessPassResult,
} from './pass-types';

const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const PEM_HEADER = '-----BEGIN PUBLIC KEY-----';
const PEM_FOOTER = '-----END PUBLIC KEY-----';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const encodeStructuredFailure = (
  reason: Exclude<VerifyAccessPassResult, { ok: true }>['reason'],
  message: string,
): VerifyAccessPassResult => ({
  ok: false,
  reason,
  message,
});

const isIsoTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && ISO_TIMESTAMP_PATTERN.test(value) && Number.isFinite(Date.parse(value));

const hasExactPayloadKeys = (value: Record<string, unknown>): boolean => {
  const keys = Object.keys(value).sort();
  const expected = [...ACCESS_PASS_FIELD_ORDER].sort();

  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
};

const isAccessPassKind = (value: unknown): value is AccessPassKind => value === 'temporary' || value === 'permanent';

export const serializeAccessPassPayload = (payload: AccessPassPayload): string =>
  JSON.stringify({
    version: payload.version,
    passId: payload.passId,
    label: payload.label,
    kind: payload.kind,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
  });

const decodeBase64 = (value: string): Uint8Array | null => {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
};

const toArrayBuffer = (value: Uint8Array): ArrayBuffer =>
  value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;

const decodeBase64Url = (value: string): Uint8Array | null => {
  if (!value || !BASE64URL_PATTERN.test(value)) return null;

  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return decodeBase64(normalized + padding);
};

const decodePayloadObject = (payloadSegment: string): Record<string, unknown> | null => {
  const payloadBytes = decodeBase64Url(payloadSegment);
  if (!payloadBytes) return null;

  try {
    const parsed = JSON.parse(textDecoder.decode(payloadBytes));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const validatePayload = (candidate: Record<string, unknown>): VerifyAccessPassResult | AccessPassPayload => {
  if (!hasExactPayloadKeys(candidate)) {
    return encodeStructuredFailure('invalid_payload', 'Access pass payload is malformed or incomplete.');
  }

  if (candidate.version !== SUPPORTED_ACCESS_PASS_VERSION) {
    return encodeStructuredFailure('unsupported_version', 'This access pass version is not supported by this build.');
  }

  if (typeof candidate.passId !== 'string' || candidate.passId.trim().length === 0) {
    return encodeStructuredFailure('invalid_payload', 'Access pass payload is missing a pass identifier.');
  }

  if (typeof candidate.label !== 'string' || candidate.label.trim().length === 0) {
    return encodeStructuredFailure('invalid_payload', 'Access pass payload is missing a label.');
  }

  if (!isAccessPassKind(candidate.kind)) {
    return encodeStructuredFailure('invalid_payload', 'Access pass payload uses an unsupported pass type.');
  }

  if (!isIsoTimestamp(candidate.issuedAt)) {
    return encodeStructuredFailure('invalid_payload', 'Access pass payload is missing a valid issue timestamp.');
  }

  const issuedAtMs = Date.parse(candidate.issuedAt);

  if (candidate.kind === 'temporary') {
    if (!isIsoTimestamp(candidate.expiresAt)) {
      return encodeStructuredFailure('invalid_payload', 'Temporary access passes must include a valid expiry.');
    }

    const expiresAtMs = Date.parse(candidate.expiresAt);
    if (expiresAtMs - issuedAtMs !== TEMPORARY_ACCESS_PASS_LIFETIME_MS) {
      return encodeStructuredFailure(
        'invalid_payload',
        'Temporary access passes must expire exactly 14 days after issue.',
      );
    }
  } else if (candidate.expiresAt !== null) {
    return encodeStructuredFailure('invalid_payload', 'Permanent access passes cannot include an expiry.');
  }

  return {
    version: candidate.version,
    passId: candidate.passId,
    label: candidate.label,
    kind: candidate.kind,
    issuedAt: candidate.issuedAt,
    expiresAt: candidate.expiresAt,
  };
};

const pemToSpkiBytes = (publicKeyPem: string): Uint8Array | null => {
  if (!publicKeyPem.includes(PEM_HEADER) || !publicKeyPem.includes(PEM_FOOTER)) {
    return null;
  }

  const base64 = publicKeyPem.replace(PEM_HEADER, '').replace(PEM_FOOTER, '').replace(/\s+/g, '');
  return decodeBase64(base64);
};

const importPublicKey = async (publicKeyPem: string): Promise<CryptoKey | null> => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;

  const spkiBytes = pemToSpkiBytes(publicKeyPem);
  if (!spkiBytes) return null;

  try {
    return await subtle.importKey('spki', toArrayBuffer(spkiBytes), 'Ed25519', true, ['verify']);
  } catch {
    return null;
  }
};

const verifySignature = async (
  publicKeyPem: string,
  payload: AccessPassPayload,
  signatureSegment: string,
): Promise<boolean | VerifyAccessPassResult> => {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    return encodeStructuredFailure(
      'unsupported_crypto',
      'This browser cannot verify access passes locally. Use a browser with Web Crypto support.',
    );
  }

  const publicKey = await importPublicKey(publicKeyPem);
  if (!publicKey) {
    return encodeStructuredFailure(
      'unsupported_crypto',
      'This build could not load its bundled access-pass public key.',
    );
  }

  const signatureBytes = decodeBase64Url(signatureSegment);
  if (!signatureBytes) {
    return encodeStructuredFailure('invalid_format', 'Access pass signature data is malformed.');
  }

  try {
    return subtle.verify(
      'Ed25519',
      publicKey,
      toArrayBuffer(signatureBytes),
      toArrayBuffer(textEncoder.encode(serializeAccessPassPayload(payload))),
    );
  } catch {
    return encodeStructuredFailure(
      'unsupported_crypto',
      'This browser could not complete local access-pass verification.',
    );
  }
};

export const verifyAccessPass: VerifyAccessPassFn = async (
  rawPass: string,
  options: VerifyAccessPassOptions = {},
): Promise<VerifyAccessPassResult> => {
  const normalizedPass = rawPass.trim();
  if (!normalizedPass) {
    return encodeStructuredFailure('invalid_format', 'Paste a signed access pass to continue.');
  }

  const publicKeyPem = options.publicKeyPem ?? ACCESS_PASS_PUBLIC_KEY_PEM;
  if (!hasConfiguredAccessPassPublicKey(publicKeyPem)) {
    return encodeStructuredFailure(
      'unconfigured_public_key',
      'This build does not have an access-pass public key configured yet.',
    );
  }

  const segments = normalizedPass.split('.');
  if (segments.length !== 2 || !segments[0] || !segments[1]) {
    return encodeStructuredFailure(
      'invalid_format',
      'Access pass format is invalid. Paste the full signed pass string and try again.',
    );
  }

  const payloadObject = decodePayloadObject(segments[0]);
  if (!payloadObject) {
    return encodeStructuredFailure('invalid_format', 'Access pass payload data is malformed.');
  }

  const validatedPayload = validatePayload(payloadObject);
  if ('ok' in validatedPayload) {
    return validatedPayload;
  }

  const signatureCheck = await verifySignature(publicKeyPem, validatedPayload, segments[1]);
  if (typeof signatureCheck !== 'boolean') {
    return signatureCheck;
  }

  if (!signatureCheck) {
    return encodeStructuredFailure(
      'invalid_signature',
      'Access pass signature could not be verified. Check that you pasted the full signed pass.',
    );
  }

  if (validatedPayload.kind === 'temporary' && validatedPayload.expiresAt) {
    const nowMs = (options.now ?? new Date()).getTime();
    if (nowMs >= Date.parse(validatedPayload.expiresAt)) {
      return encodeStructuredFailure(
        'expired',
        'This temporary access pass has expired. Paste a new pass to continue.',
      );
    }
  }

  return {
    ok: true,
    payload: validatedPayload,
    rawPass: normalizedPass,
  };
};
