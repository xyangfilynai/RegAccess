/** Safely parse an answer value as an integer, returning null if not a finite number. */
export const parseNumericAnswer = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/** Split a semicolon-delimited source-citation string into trimmed, non-empty entries. */
export const parseSources = (raw: string | null | undefined): string[] =>
  (raw || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);

/** Add a normalized string only when it is non-empty and not already present. */
export const pushUnique = (items: string[], value: string | null | undefined) => {
  if (!value) return;
  const normalized = value.trim();
  if (!normalized || items.includes(normalized)) return;
  items.push(normalized);
};
