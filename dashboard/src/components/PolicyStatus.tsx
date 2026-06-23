import type { AuditEntry } from '../types';

const policies = [
  { id: 'tool_allowlist', name: 'Tool Allowlist', desc: 'Agent-tool access control' },
  { id: 'credential_lifecycle', name: 'Credential Lifecycle', desc: 'TTL, rotation, static keys' },
  { id: 'delegation_chain', name: 'Delegation Chain', desc: 'Depth limits, escalation' },
  { id: 'environment_isolation', name: 'Environment Isolation', desc: 'Cross-env, NHI reuse' },
];

interface Props {
  entries: AuditEntry[];
}

export function PolicyStatus({ entries }: Props) {
  function getStats(policyId: string) {
    let triggers = 0;
    for (const entry of entries) {
      for (const v of entry.violations) {
        if (v.policy === policyId) triggers++;
      }
    }
    return triggers;
  }

  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      padding: '8px 16px',
      overflowX: 'auto',
    }}>
      {policies.map(p => {
        const triggers = getStats(p.id);
        return (
          <div key={p.id} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '8px 12px',
            flex: '1 1 0',
            minWidth: '160px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-bright)' }}>
                {p.name}
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                background: 'var(--allow-bg)',
                color: 'var(--allow-green)',
              }}>
                ACTIVE
              </span>
            </div>
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '2px' }}>{p.desc}</div>
            {triggers > 0 && (
              <div style={{
                fontSize: '11px',
                marginTop: '4px',
                color: 'var(--deny-red)',
                fontFamily: 'var(--mono)',
              }}>
                {triggers} denial{triggers !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
