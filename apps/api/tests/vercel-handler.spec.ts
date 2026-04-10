import { EventEmitter } from 'node:events';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { buildApp } = vi.hoisted(() => ({
  buildApp: vi.fn(),
}));

vi.mock('../src/index.js', () => ({
  buildApp,
}));

import vercelHandler from '../src/vercel-handler';

beforeEach(() => {
  buildApp.mockReset();
});

describe('vercel handler', () => {
  it('forwards requests to the Fastify server bridge', async () => {
    const ready = vi.fn().mockResolvedValue(undefined);
    const emit = vi.fn((event: string, _req: IncomingMessage, res: ServerResponse) => {
      expect(event).toBe('request');
      res.end('ok');
    });

    buildApp.mockResolvedValue({
      ready,
      server: { emit },
    });

    const req = { url: '/api/health', method: 'GET', headers: { host: 'localhost' } } as IncomingMessage;
    const res = new EventEmitter() as ServerResponse;
    res.headersSent = false;
    res.statusCode = 200;
    res.setHeader = vi.fn();
    res.end = vi.fn(() => {
      res.headersSent = true;
      res.emit('finish');
      return res;
    });

    await vercelHandler(req, res);

    expect(buildApp).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('request', req, res);
    expect(res.end).toHaveBeenCalledWith('ok');
  });
});
