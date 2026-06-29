import { describe, it, expect, afterEach, vi } from 'vitest';
import request from 'supertest';
import { effectiveMaxDepth } from '../src/mcp-handler';

afterEach(() => {
  delete process.env.AUDIT_FEED_TOKEN;
  vi.resetModules();
});

describe('effectiveMaxDepth (delegation cap)', () => {
  it('caps a client-supplied value at the central limit', () => {
    expect(effectiveMaxDepth(10)).toBe(3);
  });
  it('allows a stricter client-supplied value', () => {
    expect(effectiveMaxDepth(2)).toBe(2);
  });
  it('falls back to the central limit when unset', () => {
    expect(effectiveMaxDepth(undefined)).toBe(3);
  });
});

describe('gateway routes', () => {
  it('reports liveness on /health', async () => {
    vi.resetModules();
    const { createApp } = await import('../src/index');
    const res = await request(createApp()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('opens the audit feed when no token is configured', async () => {
    delete process.env.AUDIT_FEED_TOKEN;
    vi.resetModules();
    const { createApp } = await import('../src/index');
    const res = await request(createApp()).get('/audit/feed');
    expect(res.status).toBe(200);
  });

  it('requires a bearer token on the audit feed when configured', async () => {
    process.env.AUDIT_FEED_TOKEN = 'secret-feed-token';
    vi.resetModules();
    const { createApp } = await import('../src/index');
    const app = createApp();
    await request(app).get('/audit/feed').expect(401);
    await request(app)
      .get('/audit/feed')
      .set('Authorization', 'Bearer secret-feed-token')
      .expect(200);
  });
});
