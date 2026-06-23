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

export interface GatewayResponse {
  status: 'ALLOWED' | 'DENIED';
  tool: string;
  agent: string;
  violations?: DenialReason[];
  result?: unknown;
  audit_id: string;
}
