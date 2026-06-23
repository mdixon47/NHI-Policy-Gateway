#!/bin/bash
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   NHI Policy Gateway Demo — KAMO Consulting                ║"
echo "║   OPA/Rego enforcement for Agentic AI governance           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

for scenario in demo/scenarios/0*.sh; do
  bash "$scenario"
  echo ""
  echo "─────────────────────────────────────────────────────"
  echo ""
  sleep 2
done

echo "Demo complete. Audit log:"
curl -s http://localhost:3000/audit/feed | jq .
