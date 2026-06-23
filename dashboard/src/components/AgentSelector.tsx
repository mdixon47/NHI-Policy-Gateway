import { useState } from 'react';
import type { GatewayResponse } from '../types';

const GATEWAY_URL = 'http://localhost:3000';

const agents = [
  { id: 'agent-alpha', label: 'Alpha', env: 'production', desc: 'Prod analyst (valid creds)' },
  { id: 'agent-beta', label: 'Beta', env: 'development', desc: 'Dev agent (file_read only)' },
  { id: 'agent-gamma', label: 'Gamma', env: 'production', desc: 'Expired credentials' },
  { id: 'agent-delta', label: 'Delta', env: 'development', desc: 'Deep delegation chain' },
];

const tools = ['file_read', 'db_query', 'api_call'];

interface Props {
  onResponse: (resp: GatewayResponse) => void;
}

export function AgentSelector({ onResponse }: Props) {
  const [selectedAgent, setSelectedAgent] = useState(agents[0]);
  const [selectedTool, setSelectedTool] = useState(tools[0]);
  const [targetEnv, setTargetEnv] = useState('');
  const [sending, setSending] = useState(false);

  async function sendRequest() {
    setSending(true);
    try {
      const body: Record<string, unknown> = {
        method: 'tools/call',
        params: {
          name: selectedTool,
          arguments: selectedTool === 'file_read'
            ? { path: '/data/reports/q2.csv' }
            : selectedTool === 'db_query'
            ? { query: 'SELECT * FROM customers WHERE region = \'northeast\'' }
            : { url: 'https://api.payments.example.com/transactions', method: 'GET' },
        },
      };
      if (targetEnv) body.target_environment = targetEnv;
      if (selectedAgent.id === 'agent-delta') {
        body.delegation_chain = [
          { agent_id: 'orchestrator-root', scopes: ['file_read', 'db_query', 'api_call'] },
          { agent_id: 'planner-agent', scopes: ['file_read', 'db_query'] },
          { agent_id: 'sub-planner', scopes: ['db_query'] },
          { agent_id: 'worker-agent', scopes: ['db_query'] },
          { agent_id: 'agent-delta', scopes: ['db_query'] },
        ];
      }

      const resp = await fetch(`${GATEWAY_URL}/mcp/tools/call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Agent-Id': selectedAgent.id,
          'X-Agent-Environment': selectedAgent.env,
        },
        body: JSON.stringify(body),
      });
      const data: GatewayResponse = await resp.json();
      onResponse(data);
    } catch (err) {
      console.error('Request failed:', err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
          Agent
        </div>
        {agents.map(a => (
          <button
            key={a.id}
            onClick={() => setSelectedAgent(a)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              marginBottom: '4px',
              background: selectedAgent.id === a.id ? 'var(--navy)' : 'transparent',
              border: selectedAgent.id === a.id ? '1px solid var(--gold)' : '1px solid var(--border)',
              borderRadius: '6px',
              color: selectedAgent.id === a.id ? 'var(--text-bright)' : 'var(--text)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
            }}
          >
            <div style={{ fontWeight: 600 }}>{a.label}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>{a.desc}</div>
          </button>
        ))}
      </div>

      <div>
        <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
          Tool
        </div>
        {tools.map(t => (
          <button
            key={t}
            onClick={() => setSelectedTool(t)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              marginBottom: '4px',
              background: selectedTool === t ? 'var(--navy)' : 'transparent',
              border: selectedTool === t ? '1px solid var(--gold)' : '1px solid var(--border)',
              borderRadius: '6px',
              color: selectedTool === t ? 'var(--text-bright)' : 'var(--text)',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'var(--mono)',
              fontSize: '13px',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div>
        <div style={{ color: 'var(--gold)', fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
          Target Environment (optional)
        </div>
        <select
          value={targetEnv}
          onChange={e => setTargetEnv(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text)',
            fontSize: '13px',
          }}
        >
          <option value="">Same as agent</option>
          <option value="production">production</option>
          <option value="development">development</option>
        </select>
      </div>

      <button
        onClick={sendRequest}
        disabled={sending}
        style={{
          padding: '12px',
          background: sending ? 'var(--navy-light)' : 'var(--gold)',
          color: sending ? 'var(--text)' : '#000',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '14px',
          cursor: sending ? 'wait' : 'pointer',
          marginTop: '8px',
        }}
      >
        {sending ? 'Sending...' : 'Send Request'}
      </button>
    </div>
  );
}
