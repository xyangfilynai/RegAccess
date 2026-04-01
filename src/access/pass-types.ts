export type AccessPassKind = 'temporary' | 'permanent';

export interface AccessPassPayload {
  version: number;
  passId: string;
  label: string;
  kind: AccessPassKind;
  issuedAt: string;
  expiresAt: string | null;
}

export const SUPPORTED_ACCESS_PASS_VERSION = 1;
export const TEMPORARY_ACCESS_PASS_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;

export const ACCESS_PASS_FIELD_ORDER = [
  'version',
  'passId',
  'label',
  'kind',
  'issuedAt',
  'expiresAt',
] as const satisfies ReadonlyArray<keyof AccessPassPayload>;

export type VerifyAccessPassFailureReason =
  | 'expired'
  | 'invalid_format'
  | 'invalid_payload'
  | 'invalid_signature'
  | 'unsupported_version'
  | 'unsupported_crypto'
  | 'unconfigured_public_key';

export type VerifyAccessPassResult =
  | {
      ok: true;
      payload: AccessPassPayload;
      rawPass: string;
    }
  | {
      ok: false;
      reason: VerifyAccessPassFailureReason;
      message: string;
    };

export interface VerifyAccessPassOptions {
  publicKeyPem?: string;
  now?: Date;
}

export type VerifyAccessPassFn = (
  rawPass: string,
  options?: VerifyAccessPassOptions,
) => Promise<VerifyAccessPassResult>;
