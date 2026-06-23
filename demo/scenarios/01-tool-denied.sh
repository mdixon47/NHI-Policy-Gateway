#!/bin/bash
# Agent Beta tries to use api_call (not in its allowlist)
echo "=== SCENARIO 1: Tool Access Denied ==="
echo "Agent: agent-beta (dev agent, file_read only)"
echo "Tool:  api_call"
echo "Expected: DENY — TOOL_NOT_ALLOWED (ASI02, NHI5)"
echo ""

curl -s -X POST http://localhost:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: agent-beta" \
  -H "X-Agent-Environment: development" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "api_call",
      "arguments": {"url": "https://api.payments.example.com/transactions"}
    }
  }' | jq .
