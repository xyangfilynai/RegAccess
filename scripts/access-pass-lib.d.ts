export interface IssuedAccessPass {
  payload: {
    version: number;
    passId: string;
    label: string;
    kind: 'temporary' | 'permanent';
    issuedAt: string;
    expiresAt: string | null;
  };
  rawPass: string;
}

export interface IssueAccessPassOptions {
  kind: 'temporary' | 'permanent';
  label: string;
  passId?: string;
  issuedAt: string;
  privateKeyPath: string;
}

export interface RegistryEntry {
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

export function issueAccessPass(options: IssueAccessPassOptions): Promise<IssuedAccessPass>;
export function createRegistryEntry(input: {
  payload: IssuedAccessPass['payload'];
  rawPass: string;
  note?: string;
}): RegistryEntry;
export function writeRegistry(entries: RegistryEntry[]): Promise<void>;
export function readRegistry(): Promise<RegistryEntry[]>;
export function getEntryStatus(entry: RegistryEntry, now?: Date): 'active' | 'expired' | 'retired';
export function deleteRegistryEntry(input: { passId: string }): Promise<RegistryEntry | null>;
export function pruneRegistryEntries(input: {
  status: 'expired' | 'retired';
  now?: Date;
}): Promise<{ removedEntries: RegistryEntry[]; keptEntries: RegistryEntry[] }>;
