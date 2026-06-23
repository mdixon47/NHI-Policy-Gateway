import axios from 'axios';
import { PolicyInput, PolicyDecision, DenialReason } from './types';
import { config } from './config';

export async function evaluatePolicy(input: PolicyInput): Promise<PolicyDecision> {
  const policies = [
    'nhi.tool_access',
    'nhi.credential_lifecycle',
    'nhi.delegation',
    'nhi.environment_isolation',
  ];

  const allDenials: DenialReason[] = [];
  let allAllowed = true;

  for (const policy of policies) {
    try {
      const allowRes = await axios.post(
        `${config.opaUrl}/v1/data/${policy.replace(/\./g, '/')}/allow`,
        { input }
      );
      const allowed = allowRes.data.result ?? false;

      if (!allowed) {
        allAllowed = false;
        const denyRes = await axios.post(
          `${config.opaUrl}/v1/data/${policy.replace(/\./g, '/')}/denial_reasons`,
          { input }
        );
        const reasons: DenialReason[] = denyRes.data.result ?? [];
        allDenials.push(...reasons);
      }
    } catch {
      allAllowed = false;
      allDenials.push({
        policy: policy,
        violation: 'POLICY_ENGINE_UNAVAILABLE',
        message: `Failed to evaluate ${policy}: OPA unreachable`,
        owasp_asi: 'N/A',
        owasp_nhi: 'N/A',
        zero_trust_tier: 'Foundation',
      });
    }
  }

  return {
    allow: allAllowed,
    denial_reasons: allDenials,
  };
}
