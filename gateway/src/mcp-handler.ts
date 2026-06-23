import { Request, Response } from 'express';
import axios from 'axios';
import { PolicyInput, AgentIdentity, CredentialInfo, DelegationContext, ToolCallRequest } from './types';
import { evaluatePolicy } from './opa-client';
import { logDecision, broadcastAuditEntry } from './audit-logger';
import { config } from './config';
import * as fs from 'fs';
import * as path from 'path';

const agentProfiles: Record<string, Record<string, unknown>> = {};

function loadAgentProfiles(): void {
  const agentsDir = process.env.AGENTS_DIR || path.resolve(__dirname, '../../demo/agents');
  if (!fs.existsSync(agentsDir)) return;

  for (const file of fs.readdirSync(agentsDir)) {
    if (file.endsWith('.json')) {
      const agentId = file.replace('.json', '');
      agentProfiles[agentId] = JSON.parse(fs.readFileSync(path.join(agentsDir, file), 'utf-8'));
    }
  }
}

loadAgentProfiles();

function extractAgentIdentity(req: Request): AgentIdentity {
  const agentId = (req.headers['x-agent-id'] as string) || 'unknown';
  const environment = (req.headers['x-agent-environment'] as string) || 'unknown';
  const profile = agentProfiles[agentId] as Record<string, unknown> | undefined;

  return {
    id: agentId,
    spiffe_id: profile?.spiffe_id as string | undefined ?? `spiffe://example.org/${environment}/${agentId}`,
    environment,
    trust_tier: (profile?.trust_tier as AgentIdentity['trust_tier']) || 'foundation',
  };
}

function extractCredential(req: Request): CredentialInfo {
  const agentId = req.headers['x-agent-id'] as string;
  const profile = agentProfiles[agentId] as Record<string, unknown> | undefined;
  const profileCred = profile?.credential as Record<string, unknown> | undefined;

  const now = new Date();
  const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000);
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const isDynamic = profileCred?.dynamic === true;

  return {
    type: (req.headers['x-credential-type'] as CredentialInfo['type']) || (profileCred?.type as CredentialInfo['type']) || 'jwt',
    issued_at: isDynamic ? fifteenMinAgo.toISOString() : (profileCred?.issued_at as string) || now.toISOString(),
    expires_at: (req.headers['x-credential-expires'] as string) || (isDynamic ? fifteenMinLater.toISOString() : (profileCred?.expires_at as string) || fifteenMinLater.toISOString()),
    is_static: (profileCred?.is_static as boolean) ?? false,
    last_rotated: isDynamic ? fifteenMinAgo.toISOString() : (profileCred?.last_rotated as string) || fifteenMinAgo.toISOString(),
    rotation_max_age_hours: (profileCred?.rotation_max_age_hours as number) ?? 24,
  };
}

function extractDelegation(req: Request): DelegationContext {
  const body = req.body as Record<string, unknown>;
  const delegationChain = body.delegation_chain as Array<Record<string, unknown>> | undefined;

  if (delegationChain) {
    return {
      chain: delegationChain.map((hop) => ({
        agent_id: hop.agent_id as string,
        scopes: hop.scopes as string[],
        delegated_at: (hop.delegated_at as string) || new Date().toISOString(),
      })),
      max_depth: 3,
    };
  }

  const agentId = req.headers['x-agent-id'] as string;
  const profile = agentProfiles[agentId] as Record<string, unknown> | undefined;
  const profileDelegation = profile?.delegation as Record<string, unknown> | undefined;

  if (profileDelegation) {
    return {
      chain: (profileDelegation.chain as Array<Record<string, unknown>> || []).map((hop) => ({
        agent_id: hop.agent_id as string,
        scopes: hop.scopes as string[],
        delegated_at: (hop.delegated_at as string) || new Date().toISOString(),
      })),
      max_depth: (profileDelegation.max_depth as number) ?? 3,
    };
  }

  return { chain: [], max_depth: 3 };
}

function extractToolRequest(req: Request): ToolCallRequest {
  const body = req.body as Record<string, unknown>;
  const params = body.params as Record<string, unknown>;
  const agentEnv = req.headers['x-agent-environment'] as string || 'unknown';

  return {
    tool: (params?.name as string) || 'unknown',
    parameters: (params?.arguments as Record<string, unknown>) || {},
    target_environment: (body.target_environment as string) || agentEnv,
    timestamp: new Date().toISOString(),
  };
}

export async function handleToolCall(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  const agent = extractAgentIdentity(req);
  const credential = extractCredential(req);
  const delegation = extractDelegation(req);
  const request = extractToolRequest(req);

  const policyInput: PolicyInput = { agent, credential, delegation, request };

  const decision = await evaluatePolicy(policyInput);
  const latencyMs = Date.now() - startTime;

  const auditEntry = logDecision({
    agentId: agent.id,
    tool: request.tool,
    decision: decision.allow ? 'ALLOW' : 'DENY',
    violations: decision.denial_reasons,
    latencyMs,
    requestBody: req.body,
  });

  broadcastAuditEntry(auditEntry);

  if (decision.allow) {
    try {
      const toolResponse = await axios.post(
        `${config.toolServerUrl}/tools/${request.tool}`,
        request.parameters
      );
      res.json({
        status: 'ALLOWED',
        tool: request.tool,
        agent: agent.id,
        result: toolResponse.data,
        audit_id: auditEntry.id,
      });
    } catch {
      res.json({
        status: 'ALLOWED',
        tool: request.tool,
        agent: agent.id,
        result: { message: `Tool '${request.tool}' executed successfully (mock server unavailable)` },
        audit_id: auditEntry.id,
      });
    }
  } else {
    res.status(403).json({
      status: 'DENIED',
      tool: request.tool,
      agent: agent.id,
      violations: decision.denial_reasons,
      audit_id: auditEntry.id,
    });
  }
}
