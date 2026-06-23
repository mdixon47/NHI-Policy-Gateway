import { useState, useEffect, useCallback } from 'react';
import { AgentSelector } from './components/AgentSelector';
import { RequestFeed } from './components/RequestFeed';
import { AuditDetail } from './components/AuditDetail';
import { PolicyStatus } from './components/PolicyStatus';
import type { AuditEntry, GatewayResponse } from './types';

const GATEWAY_URL = 'http://localhost:3000';

function App() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  useEffect(() => {
    fetch(`${GATEWAY_URL}/audit/feed`)
      .then(r => r.json())
      .then((data: AuditEntry[]) => setEntries(data.reverse()))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource(`${GATEWAY_URL}/audit/feed`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') return;
        setEntries(prev => [data as AuditEntry, ...prev]);
      } catch { /* ignore parse errors */ }
    };
    return () => es.close();
  }, []);

  const handleResponse = useCallback((_resp: GatewayResponse) => {
    // The SSE stream will pick up the new entry automatically
  }, []);

  return (
    <>
      {/* Header */}
      <div style={{
        background: 'var(--navy)',
        borderBottom: '2px solid var(--gold)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--allow-green)', boxShadow: '0 0 8px var(--allow-green)' }} />
          <span style={{ color: 'var(--text-bright)', fontWeight: 700, fontSize: '16px' }}>
            NHI Policy Gateway
          </span>
          <span style={{ color: 'var(--gold)', fontSize: '12px', fontFamily: 'var(--mono)' }}>
            KAMO Consulting
          </span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontFamily: 'var(--mono)' }}>
          <span style={{ color: 'var(--text)' }}>
            Decisions: <span style={{ color: 'var(--text-bright)' }}>{entries.length}</span>
          </span>
          <span style={{ color: 'var(--text)' }}>
            Denied: <span style={{ color: 'var(--deny-red)' }}>{entries.filter(e => e.decision === 'DENY').length}</span>
          </span>
          <span style={{ color: 'var(--text)' }}>
            Allowed: <span style={{ color: 'var(--allow-green)' }}>{entries.filter(e => e.decision === 'ALLOW').length}</span>
          </span>
        </div>
      </div>

      {/* Policy status bar */}
      <PolicyStatus entries={entries} />

      {/* Three-panel layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Agent selector */}
        <div style={{
          width: '260px',
          borderRight: '1px solid var(--border)',
          overflowY: 'auto',
          flexShrink: 0,
        }}>
          <AgentSelector onResponse={handleResponse} />
        </div>

        {/* Center: Request feed */}
        <div style={{ flex: 1, borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          <RequestFeed
            entries={entries}
            selectedId={selectedEntry?.id ?? null}
            onSelect={setSelectedEntry}
          />
        </div>

        {/* Right: Audit detail */}
        <div style={{ width: '340px', flexShrink: 0, overflow: 'hidden' }}>
          <AuditDetail entry={selectedEntry} />
        </div>
      </div>
    </>
  );
}

export default App;
