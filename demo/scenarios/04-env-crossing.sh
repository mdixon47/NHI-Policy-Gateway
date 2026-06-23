#!/bin/bash
# Agent Beta (dev) tries to access a production tool
echo "=== SCENARIO 4: Cross-Environment Violation ==="
echo "Agent: agent-beta (development environment)"
echo "Tool:  file_read (targeting production)"
echo "Expected: DENY — CROSS_ENVIRONMENT_ACCESS (ASI08, NHI8)"
echo ""

curl -s -X POST http://localhost:3000/mcp/tools/call \
  -H "Content-Type: application/json" \
  -H "X-Agent-Id: agent-beta" \
  -H "X-Agent-Environment: development" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "file_read",
      "arguments": {"path": "/data/reports/q2.csv"}
    },
    "target_environment": "production"
  }' | jq .
