/** Safely parse an answer value as an integer, returning null if not a finite number. */
export const parseNumericAnswer = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};
