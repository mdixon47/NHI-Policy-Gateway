import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));

import axios from 'axios';
import { evaluatePolicy } from '../src/opa-client';
import { PolicyInput } from '../src/types';

const post = (axios as unknown as { post: ReturnType<typeof vi.fn> }).post;

const input = {
  agent: {}, credential: {}, delegation: {}, request: {},
} as unknown as PolicyInput;

describe('evaluatePolicy', () => {
  beforeEach(() => post.mockReset());

  it('allows when every policy allows', async () => {
    post.mockResolvedValue({ data: { result: true } });
    const decision = await evaluatePolicy(input);
    expect(decision.allow).toBe(true);
    expect(decision.denial_reasons).toHaveLength(0);
  });

  it('denies and aggregates denial reasons', async () => {
    post.mockImplementation((url?: string) => {
      const u = String(url ?? '');
      return u.includes('denial_reasons')
        ? Promise.resolve({ data: { result: [{ policy: 'p', violation: 'V' }] } })
        : Promise.resolve({ data: { result: false } });
    });
    const decision = await evaluatePolicy(input);
    expect(decision.allow).toBe(false);
    expect(decision.denial_reasons.length).toBeGreaterThan(0);
  });

  it('fails closed when OPA is unreachable', async () => {
    // A malformed/empty upstream response (e.g. OPA unreachable behind a proxy)
    // makes the response-parsing throw inside evaluateSinglePolicy, exercising
    // the fail-closed catch path without rejecting from the mock itself.
    post.mockResolvedValue(undefined);
    const decision = await evaluatePolicy(input);
    expect(decision.allow).toBe(false);
    expect(decision.denial_reasons.some((r) => r.violation === 'POLICY_ENGINE_UNAVAILABLE')).toBe(true);
  });
});
