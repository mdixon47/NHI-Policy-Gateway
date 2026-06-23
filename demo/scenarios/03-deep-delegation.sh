#!/bin/bash
# Agent Delta is at the end of a 5-hop delegation chain (max is 3)
echo "=== SCENARIO 3: Delegation Chain Exceeded ==="
echo "Agent: agent-delta (5-hop chain, max allowed is 3)"
echo "Tool:  db_query"
echo "Expected: DENY — CHAIN_DEPTH_EXCEEDED (ASI08, NHI5)"
echo ""

curl -s -X POST http://localhost:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: agent-delta" \
  -H "X-Agent-Environment: development" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "db_query",
      "arguments": {"query": "SELECT * FROM customers"}
    },
    "delegation_chain": [
      {"agent_id": "orchestrator-root", "scopes": ["file_read","db_query","api_call"]},
      {"agent_id": "planner-agent", "scopes": ["file_read","db_query"]},
      {"agent_id": "sub-planner", "scopes": ["db_query"]},
      {"agent_id": "worker-agent", "scopes": ["db_query"]},
      {"agent_id": "agent-delta", "scopes": ["db_query"]}
    ]
  }' | jq .
