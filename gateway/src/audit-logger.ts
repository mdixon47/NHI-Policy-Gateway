import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { AuditEntry, DenialReason } from './types';
import { config } from './config';
import { persistAuditEntry } from './audit-sink';

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

const auditLog: AuditEntry[] = [];

export function logDecision(params: {
  agentId: string;
  tool: string;
  decision: 'ALLOW' | 'DENY';
  violations: DenialReason[];
  latencyMs: number;
  requestBody: unknown;
}): AuditEntry {
  const entry: AuditEntry = {
    id: `dec-${uuidv4().slice(0, 8)}`,
    timestamp: new Date().toISOString(),
    agent_id: params.agentId,
    tool: params.tool,
    decision: params.decision,
    violations: params.violations,
    latency_ms: params.latencyMs,
    request_hash: `sha256:${crypto.createHash('sha256').update(JSON.stringify(params.requestBody)).digest('hex').slice(0, 12)}`,
  };

  auditLog.push(entry);
  if (auditLog.length > config.auditRetention) {
    auditLog.splice(0, auditLog.length - config.auditRetention);
  }
  logger.info('Policy decision', { audit: entry });
  persistAuditEntry(entry).catch((err) => logger.error('Audit sink write failed', { err: String(err) }));

  return entry;
}

export function getAuditLog(): AuditEntry[] {
  return auditLog;
}

export function getRecentAuditEntries(limit = 50): AuditEntry[] {
  return auditLog.slice(-limit);
}

// SSE clients for real-time feed
const sseClients: Set<{ write: (data: string) => boolean }> = new Set();

export function addSSEClient(client: { write: (data: string) => boolean }): void {
  sseClients.add(client);
}

export function removeSSEClient(client: { write: (data: string) => boolean }): void {
  sseClients.delete(client);
}

export function broadcastAuditEntry(entry: AuditEntry): void {
  const data = `data: ${JSON.stringify(entry)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
}
