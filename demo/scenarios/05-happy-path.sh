#!/bin/bash
# Agent Alpha — valid creds, approved tool, correct env, no delegation issues
echo "=== SCENARIO 5: Happy Path — ALLOWED ==="
echo "Agent: agent-alpha (production, valid creds, approved tools)"
echo "Tool:  file_read"
echo "Expected: ALLOW with tool output"
echo ""

curl -s -X POST http://localhost:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: agent-alpha" \
  -H "X-Agent-Environment: production" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "file_read",
      "arguments": {"path": "/data/reports/q2.csv"}
    }
  }' | jq .
