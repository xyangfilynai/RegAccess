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

export function issueAccessPass(options: IssueAccessPassOptions): Promise<IssuedAccessPass>;
