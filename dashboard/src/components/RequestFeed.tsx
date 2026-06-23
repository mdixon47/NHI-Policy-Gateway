import type { AuditEntry } from '../types';

interface Props {
  entries: AuditEntry[];
  selectedId: string | null;
  onSelect: (entry: AuditEntry) => void;
}

export function RequestFeed({ entries, selectedId, onSelect }: Props) {
  return (
    <div style={{ padding: '16px', overflowY: 'auto', height: '100%' }}>
      <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
        Decision Feed
      </div>
      {entries.length === 0 && (
        <div style={{ color: 'var(--text)', opacity: 0.5, textAlign: 'center', marginTop: '40px' }}>
          No decisions yet. Send a request to get started.
        </div>
      )}
      {entries.map(entry => {
        const isAllow = entry.decision === 'ALLOW';
        const isSelected = entry.id === selectedId;
        return (
          <div
            key={entry.id}
            onClick={() => onSelect(entry)}
            style={{
              padding: '12px',
              marginBottom: '8px',
              background: isSelected ? 'var(--surface-hover)' : 'var(--surface)',
              border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}`,
              borderLeft: `4px solid ${isAllow ? 'var(--allow-green)' : 'var(--deny-red)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{
                fontWeight: 700,
                fontSize: '13px',
                color: isAllow ? 'var(--allow-green)' : 'var(--deny-red)',
              }}>
                {entry.decision}
              </span>
              <span style={{ fontSize: '11px', fontFamily: 'var(--mono)', opacity: 0.6 }}>
                {entry.latency_ms}ms
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-bright)' }}>{entry.agent_id}</span>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{entry.tool}</span>
            </div>
            {entry.violations.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                {entry.violations.map((v, i) => (
                  <div key={i} style={{
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    color: 'var(--deny-red)',
                    opacity: 0.8,
                  }}>
                    {v.owasp_asi} / {v.owasp_nhi} — {v.violation}
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: '10px', opacity: 0.4, marginTop: '4px' }}>
              {new Date(entry.timestamp).toLocaleTimeString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
