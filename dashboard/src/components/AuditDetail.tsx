import type { AuditEntry } from '../types';

const OWASP_ASI_DESCRIPTIONS: Record<string, string> = {
  ASI02: 'Improper Authorization & Access Control — Agent bypasses intended access restrictions',
  ASI03: 'Credential & Secret Exposure — Sensitive credentials exposed or mismanaged',
  ASI08: 'Multi-Agent Coordination Failures — Unsafe delegation or cross-boundary access',
};

const OWASP_NHI_DESCRIPTIONS: Record<string, string> = {
  NHI4: 'Insecure Authentication — Expired or weak authentication credentials',
  NHI5: 'Overprivileged NHI — Identity has more access than required',
  NHI7: 'Insecure Key Management — Credentials not properly rotated or managed',
  NHI8: 'Insecure Cloud Deployment — Cross-environment access violations',
  NHI9: 'NHI Reuse — Same identity used across multiple environments',
};

interface Props {
  entry: AuditEntry | null;
}

export function AuditDetail({ entry }: Props) {
  if (!entry) {
    return (
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4 }}>
        Select a decision to view details
      </div>
    );
  }

  const isAllow = entry.decision === 'ALLOW';

  return (
    <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Audit Detail
      </div>

      <div style={{
        background: isAllow ? 'var(--allow-bg)' : 'var(--deny-bg)',
        border: `1px solid ${isAllow ? 'var(--allow-green)' : 'var(--deny-red)'}`,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: isAllow ? 'var(--allow-green)' : 'var(--deny-red)' }}>
          {entry.decision}
        </div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          {entry.agent_id} → {entry.tool}
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <FieldRow label="Audit ID" value={entry.id} mono />
        <FieldRow label="Timestamp" value={new Date(entry.timestamp).toLocaleString()} />
        <FieldRow label="Agent" value={entry.agent_id} />
        <FieldRow label="Tool" value={entry.tool} mono />
        <FieldRow label="Latency" value={`${entry.latency_ms}ms`} />
        <FieldRow label="Request Hash" value={entry.request_hash} mono />
      </div>

      {entry.violations.length > 0 && (
        <div>
          <div style={{ color: 'var(--deny-red)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
            Violations ({entry.violations.length})
          </div>
          {entry.violations.map((v, i) => (
            <div key={i} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '8px',
            }}>
              <div style={{ fontWeight: 700, color: 'var(--deny-red)', fontSize: '13px', marginBottom: '4px' }}>
                {v.violation}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-bright)', marginBottom: '8px' }}>
                {v.message}
              </div>
              <div style={{ fontSize: '11px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Tag label="Policy" value={v.policy} />
                <Tag label="ASI" value={v.owasp_asi} color="var(--gold)" />
                <Tag label="NHI" value={v.owasp_nhi} color="var(--gold)" />
                <Tag label="Tier" value={v.zero_trust_tier} />
              </div>
              {OWASP_ASI_DESCRIPTIONS[v.owasp_asi] && (
                <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.7, borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                  <strong>{v.owasp_asi}:</strong> {OWASP_ASI_DESCRIPTIONS[v.owasp_asi]}
                </div>
              )}
              {OWASP_NHI_DESCRIPTIONS[v.owasp_nhi] && (
                <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
                  <strong>{v.owasp_nhi}:</strong> {OWASP_NHI_DESCRIPTIONS[v.owasp_nhi]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ color: 'var(--text-bright)', fontFamily: mono ? 'var(--mono)' : 'inherit', fontSize: mono ? '11px' : '12px' }}>{value}</span>
    </div>
  );
}

function Tag({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <span style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: '4px',
      padding: '2px 6px',
      fontFamily: 'var(--mono)',
      color: color || 'var(--text)',
    }}>
      {label}: {value}
    </span>
  );
}
