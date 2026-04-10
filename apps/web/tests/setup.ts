import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { _invalidateCache } from '../src/lib/assessment-store';

beforeEach(() => {
  localStorage.clear();
  _invalidateCache();
});
