export interface AgentIdentity {
  id: string;
  spiffe_id?: string;
  environment: string;
  trust_tier: 'foundation' | 'enterprise' | 'advanced';
}

export interface CredentialInfo {
  type: 'jwt' | 'api_key' | 'oauth_token' | 'svid';
  issued_at: string;
  expires_at: string;
  is_static: boolean;
  last_rotated: string;
  rotation_max_age_hours: number;
}

export interface DelegationHop {
  agent_id: string;
  scopes: string[];
  delegated_at: string;
}

export interface DelegationContext {
  chain: DelegationHop[];
  max_depth: number;
}

export interface ToolCallRequest {
  tool: string;
  parameters: Record<string, unknown>;
  target_environment: string;
  timestamp: string;
}

export interface PolicyInput {
  agent: AgentIdentity;
  credential: CredentialInfo;
  delegation: DelegationContext;
  request: ToolCallRequest;
}

export interface PolicyDecision {
  allow: boolean;
  denial_reasons: DenialReason[];
}

export interface DenialReason {
  policy: string;
  violation: string;
  message: string;
  owasp_asi: string;
  owasp_nhi: string;
  zero_trust_tier: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  agent_id: string;
  tool: string;
  decision: 'ALLOW' | 'DENY';
  violations: DenialReason[];
  latency_ms: number;
  request_hash: string;
}
