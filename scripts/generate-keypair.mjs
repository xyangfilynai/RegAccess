import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

const ACCESS_PUBLIC_KEY_FILE_CONTENT = (publicKeyPem) => `/**
 * Updated by scripts/generate-keypair.mjs.
 * Keep the private key outside the frontend repo; only the public key belongs here.
 */
export const ACCESS_PASS_PUBLIC_KEY_PEM = \`${publicKeyPem}\`;

export const hasConfiguredAccessPassPublicKey = (
  publicKeyPem: string = ACCESS_PASS_PUBLIC_KEY_PEM,
): boolean =>
  publicKeyPem.includes('BEGIN PUBLIC KEY') && !publicKeyPem.includes('REPLACE_WITH_ACCESS_PASS_PUBLIC_KEY');
`;

const formatPem = (label, keyData) => {
  const base64 = Buffer.from(keyData).toString('base64');
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join('\n')}\n-----END ${label}-----\n`;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const keysDir = path.join(repoRoot, '.keys');
const privateKeyPath = path.join(keysDir, 'access-pass-private-key.pem');
const publicKeyPath = path.join(keysDir, 'access-pass-public-key.pem');
const bundledPublicKeyPath = path.join(repoRoot, 'src', 'access', 'public-key.ts');

const keyPair = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);

const [privateKeyPkcs8, publicKeySpki] = await Promise.all([
  webcrypto.subtle.exportKey('pkcs8', keyPair.privateKey),
  webcrypto.subtle.exportKey('spki', keyPair.publicKey),
]);

const privateKeyPem = formatPem('PRIVATE KEY', privateKeyPkcs8);
const publicKeyPem = formatPem('PUBLIC KEY', publicKeySpki);

await mkdir(keysDir, { recursive: true });
await Promise.all([
  writeFile(privateKeyPath, privateKeyPem, 'utf8'),
  writeFile(publicKeyPath, publicKeyPem, 'utf8'),
  writeFile(bundledPublicKeyPath, ACCESS_PUBLIC_KEY_FILE_CONTENT(publicKeyPem.trimEnd()), 'utf8'),
]);

console.log(`Generated Ed25519 access-pass keypair.
Private key: ${privateKeyPath}
Public key: ${publicKeyPath}
Bundled public key updated: ${bundledPublicKeyPath}`);
