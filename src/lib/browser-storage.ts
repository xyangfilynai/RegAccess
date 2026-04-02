interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const getBrowserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const readStoredValue = (key: string): string | null => {
  const storage = getBrowserStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const readStoredJson = (key: string): unknown => {
  const raw = readStoredValue(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Practical size cap for a single localStorage write, in characters.
 * Typical browser localStorage limits are 5–10 MB total. This cap leaves
 * headroom for other keys and avoids hitting the quota on a single write.
 */
export const STORAGE_WRITE_LIMIT_CHARS = 4 * 1024 * 1024; // 4 MB

export class StorageQuotaError extends Error {
  constructor(key: string, sizeChars: number) {
    super(
      `Storage write for "${key}" blocked: payload is ${(sizeChars / 1024 / 1024).toFixed(1)} MB, ` +
        `which exceeds the ${(STORAGE_WRITE_LIMIT_CHARS / 1024 / 1024).toFixed(0)} MB safety limit.`,
    );
    this.name = 'StorageQuotaError';
  }
}

export const writeStoredJson = (key: string, value: unknown): boolean => {
  const storage = getBrowserStorage();
  if (!storage) return false;

  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > STORAGE_WRITE_LIMIT_CHARS) {
      throw new StorageQuotaError(key, serialized.length);
    }
    storage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (error instanceof StorageQuotaError) throw error;
    return false;
  }
};

export const writeStoredValue = (key: string, value: string): boolean => {
  const storage = getBrowserStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const removeStoredKeys = (...keys: string[]): void => {
  const storage = getBrowserStorage();
  if (!storage) return;

  for (const key of keys) {
    try {
      storage.removeItem(key);
    } catch {
      // Continue removing remaining keys even if one fails
    }
  }
};

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
