import { describe, it, expect, afterEach, vi } from 'vitest';
import { claimsToContext } from '../src/auth';

const SECRET = 'test-secret-value-at-least-32-bytes-long';

afterEach(() => {
  delete process.env.AUTH_MODE;
  delete process.env.JWT_SECRET;
  vi.resetModules();
});

describe('claimsToContext', () => {
  it('maps JWT claims onto agent and credential', () => {
    const ctx = claimsToContext({
      sub: 'agent-alpha',
      environment: 'production',
      trust_tier: 'enterprise',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
    expect(ctx.agent.id).toBe('agent-alpha');
    expect(ctx.agent.environment).toBe('production');
    expect(ctx.agent.trust_tier).toBe('enterprise');
    expect(ctx.credential.type).toBe('jwt');
    expect(ctx.credential.is_static).toBe(false);
  });

  it('defaults unknown identity fields', () => {
    const ctx = claimsToContext({});
    expect(ctx.agent.id).toBe('unknown');
    expect(ctx.agent.environment).toBe('unknown');
    expect(ctx.agent.trust_tier).toBe('foundation');
  });
});

describe('authenticate (jwt mode)', () => {
  async function signToken(secret = SECRET): Promise<string> {
    const { SignJWT } = await import('jose');
    return new SignJWT({ environment: 'production', trust_tier: 'enterprise' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('agent-alpha')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode(secret));
  }

  it('verifies a valid HS256 token and returns context', async () => {
    process.env.AUTH_MODE = 'jwt';
    process.env.JWT_SECRET = SECRET;
    vi.resetModules();
    const { authenticate, resetKeyCache } = await import('../src/auth');
    resetKeyCache();
    const token = await signToken();
    const req = { headers: { authorization: `Bearer ${token}` } } as never;
    const ctx = await authenticate(req);
    expect(ctx?.agent.id).toBe('agent-alpha');
    expect(ctx?.agent.environment).toBe('production');
  });

  it('throws AuthError on a malformed token', async () => {
    process.env.AUTH_MODE = 'jwt';
    process.env.JWT_SECRET = SECRET;
    vi.resetModules();
    const { authenticate, AuthError, resetKeyCache } = await import('../src/auth');
    resetKeyCache();
    const req = { headers: { authorization: 'Bearer not.a.real.jwt' } } as never;
    await expect(authenticate(req)).rejects.toBeInstanceOf(AuthError);
  });

  it('throws AuthError when no bearer token is presented', async () => {
    process.env.AUTH_MODE = 'jwt';
    process.env.JWT_SECRET = SECRET;
    vi.resetModules();
    const { authenticate, AuthError, resetKeyCache } = await import('../src/auth');
    resetKeyCache();
    const req = { headers: {} } as never;
    await expect(authenticate(req)).rejects.toBeInstanceOf(AuthError);
  });
});
