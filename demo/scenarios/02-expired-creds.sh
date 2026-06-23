#!/bin/bash
# Agent Gamma has valid tool access but expired credentials
echo "=== SCENARIO 2: Credential Expired ==="
echo "Agent: agent-gamma (full-access, but expired JWT)"
echo "Tool:  file_read"
echo "Expected: DENY — CREDENTIAL_EXPIRED (ASI03, NHI4)"
echo ""

curl -s -X POST http://localhost:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: agent-gamma" \
  -H "X-Agent-Environment: production" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "file_read",
      "arguments": {"path": "/data/reports/q2.csv"}
    }
  }' | jq .
