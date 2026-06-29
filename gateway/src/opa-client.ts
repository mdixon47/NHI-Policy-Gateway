import axios from 'axios';
import { PolicyInput, PolicyDecision, DenialReason } from './types';
import { config } from './config';
import { outboundHttpsAgent } from './tls';

export async function evaluatePolicy(input: PolicyInput): Promise<PolicyDecision> {
  const policies = [
    'nhi.tool_access',
    'nhi.credential_lifecycle',
    'nhi.delegation',
    'nhi.environment_isolation',
  ];

  const results = await Promise.all(
    policies.map((policy) => evaluateSinglePolicy(policy, input))
  );

  const allDenials: DenialReason[] = [];
  let allAllowed = true;

  for (const result of results) {
    if (!result.allowed) {
      allAllowed = false;
      allDenials.push(...result.denials);
    }
  }

  return {
    allow: allAllowed,
    denial_reasons: allDenials,
  };
}

async function evaluateSinglePolicy(
  policy: string,
  input: PolicyInput
): Promise<{ allowed: boolean; denials: DenialReason[] }> {
  const basePath = `${config.opaUrl}/v1/data/${policy.replace(/\./g, '/')}`;

  try {
    const allowRes = await axios.post(
      `${basePath}/allow`,
      { input },
      { timeout: config.opaTimeoutMs, httpsAgent: outboundHttpsAgent }
    );
    const allowed = allowRes.data.result ?? false;

    if (allowed) {
      return { allowed: true, denials: [] };
    }

    const denyRes = await axios.post(
      `${basePath}/denial_reasons`,
      { input },
      { timeout: config.opaTimeoutMs, httpsAgent: outboundHttpsAgent }
    );
    return { allowed: false, denials: denyRes.data.result ?? [] };
  } catch {
    return {
      allowed: false,
      denials: [
        {
          policy: policy,
          violation: 'POLICY_ENGINE_UNAVAILABLE',
          message: `Failed to evaluate ${policy}: OPA unreachable`,
          owasp_asi: 'N/A',
          owasp_nhi: 'N/A',
          zero_trust_tier: 'Foundation',
        },
      ],
    };
  }
}
