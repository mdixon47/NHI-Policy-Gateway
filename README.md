# NHI Policy Gateway

[![CI](https://github.com/mdixon47/NHI-Policy-Gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/mdixon47/NHI-Policy-Gateway/actions/workflows/ci.yml)
[![Security](https://github.com/mdixon47/NHI-Policy-Gateway/actions/workflows/security.yml/badge.svg)](https://github.com/mdixon47/NHI-Policy-Gateway/actions/workflows/security.yml)
[![CodeQL](https://github.com/mdixon47/NHI-Policy-Gateway/actions/workflows/codeql.yml/badge.svg)](https://github.com/mdixon47/NHI-Policy-Gateway/actions/workflows/codeql.yml)

MCP Policy Gateway enforcing Non-Human Identity governance with OPA/Rego. Maps to OWASP Agentic AI Top 10 and NHI Top 10.

📚 **Documentation:** [Security review findings](docs/issue.md) · [Hardening changes](docs/update.md) · [DevSecOps pipeline](docs/devsecops.md)

An enforcement layer for NHI governance in agentic systems. Every AI agent that wants to invoke a tool goes through this gateway. The gateway consults OPA — running Rego policies — and makes four checks before allowing execution.

## Architecture

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────┐    ┌──────────────┐
│  Demo CLI   │───▶│   MCP Policy     │───▶│  OPA Server │    │  Mock Tool   │
│  (curl /    │    │   Gateway        │◀───│  (Rego      │    │  Servers     │
│   web UI)   │    │   (Node.js)      │    │  Policies)  │    │  (3 tools)   │
└─────────────┘    │                  │───▶│             │    │              │
                   │  - Intercepts    │    └─────────────┘    │  - file_read │
                   │  - Extracts ctx  │                       │  - db_query  │
                   │  - Queries OPA   │──────────────────────▶│  - api_call  │
                   │  - Enforces      │                       └──────────────┘
                   │  - Audit logs    │
                   └──────────────────┘
```

## Four Policy Domains

| Policy | What It Checks | OWASP ASI | OWASP NHI |
|--------|---------------|-----------|-----------|
| **Tool Allowlist** | Which agents can use which tools | ASI02 | NHI5 |
| **Credential Lifecycle** | Expired tokens, static keys, rotation age | ASI03 | NHI4, NHI7 |
| **Delegation Chain** | Depth limits, privilege escalation detection | ASI08 | NHI5, NHI9 |
| **Environment Isolation** | Cross-environment access, NHI reuse | ASI08 | NHI8, NHI9 |

All policies default to **deny**. If OPA is unreachable, the gateway **fails closed** — nothing gets through.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Compose v2)
- [Node.js 20+](https://nodejs.org/) and npm
- [OPA CLI](https://www.openpolicyagent.org/docs/latest/#running-opa) (optional, for local policy testing)

## Quick Start

```bash
git clone <repo-url> && cd nhi-policy-gateway
docker compose up --build -d
```

This starts four services:

| Service | Port | Description |
|---------|------|-------------|
| OPA | 8181 | Policy engine running 4 Rego policies |
| Gateway | 3000 | Node.js/Express — intercepts requests, queries OPA, enforces decisions |
| Mock Tools | 3001 | 3 simulated MCP tool servers |
| Dashboard | 5173 | React UI showing live allow/deny decisions |

## How to Test

### Run All Demo Scenarios

```bash
bash demo/run-all.sh
```

This runs five scenarios sequentially and prints the audit log at the end.

### Run Individual Scenarios

```bash
# Scenario 1: Agent Beta tries api_call (not in its allowlist)
# Expected: DENY — TOOL_NOT_ALLOWED (ASI02, NHI5)
bash demo/scenarios/01-tool-denied.sh

# Scenario 2: Agent Gamma has valid tool access but expired JWT
# Expected: DENY — CREDENTIAL_EXPIRED (ASI03, NHI4)
bash demo/scenarios/02-expired-creds.sh

# Scenario 3: Agent Delta is at end of a 5-hop delegation chain (max is 3)
# Expected: DENY — CHAIN_DEPTH_EXCEEDED (ASI08, NHI5)
bash demo/scenarios/03-deep-delegation.sh

# Scenario 4: Agent Beta (dev) tries to access a production tool
# Expected: DENY — CROSS_ENVIRONMENT_ACCESS (ASI08, NHI8)
bash demo/scenarios/04-env-crossing.sh

# Scenario 5: Agent Alpha — valid creds, approved tool, correct env
# Expected: ALLOW with tool output
bash demo/scenarios/05-happy-path.sh
```

### Use the Dashboard

Open [http://localhost:5173](http://localhost:5173) in your browser.

- **Left panel**: Select an agent profile and tool
- **Center**: Live feed of ALLOW/DENY decisions with color coding
- **Right panel**: Click any decision to see full audit detail with OWASP risk mapping
- **Top bar**: Policy status showing which policies are active and denial counts

Click **Send Request** to fire requests and watch them get evaluated in real time.

### Check the Audit Log

```bash
# Get all recent audit entries
curl -s http://localhost:3000/audit/feed | jq .

# Get just the decisions summary
curl -s http://localhost:3000/audit/feed | jq '.[] | {agent: .agent_id, tool: .tool, decision: .decision}'
```

### Test Fail-Closed Behavior

The gateway denies all requests when OPA is unavailable:

```bash
# Stop OPA
docker compose stop opa

# This should now DENY with POLICY_ENGINE_UNAVAILABLE
bash demo/scenarios/05-happy-path.sh

# Restore OPA
docker compose start opa
```

### Run OPA Unit Tests

22 unit tests covering all four policy domains:

```bash
opa test policies/ tests/ -v
```

### Manual curl Request

```bash
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
```

### Health Checks

```bash
curl -s http://localhost:3000/health | jq .   # Gateway
curl -s http://localhost:3001/health | jq .   # Mock Tools
curl -s http://localhost:8181/health           # OPA
```

### Stop Everything

```bash
docker compose down
```

## Agent Profiles

| Agent | Environment | Allowed Tools | Scenario |
|-------|------------|---------------|----------|
| agent-alpha | production | file_read, db_query | Compliant agent (happy path) |
| agent-beta | development | file_read | Limited dev agent |
| agent-gamma | production | file_read, db_query, api_call | Expired credentials |
| agent-delta | development | db_query | Deep delegation chain |

## Project Structure

```
nhi-policy-gateway/
├── docker-compose.yml          # Orchestrates all services
├── gateway/                    # MCP Policy Gateway (Node.js/TypeScript)
│   └── src/
│       ├── index.ts            # Express server
│       ├── mcp-handler.ts      # MCP protocol handling
│       ├── opa-client.ts       # OPA query client
│       ├── audit-logger.ts     # Structured audit logging + SSE
│       ├── types.ts            # TypeScript interfaces
│       └── config.ts           # Configuration
├── policies/                   # OPA/Rego policies
│   ├── tool-access/            # Tool allowlist policy
│   ├── credential-lifecycle/   # Credential checks policy
│   ├── delegation/             # Delegation chain policy
│   ├── environment-isolation/  # Environment isolation policy
│   └── policy_data.json        # Agent permissions & environment map
├── mock-tools/                 # Simulated MCP tool servers
│   └── src/tools/              # file_read, db_query, api_call
├── demo/
│   ├── scenarios/              # 5 demo scripts
│   ├── agents/                 # Agent identity profiles
│   └── run-all.sh              # Runs all scenarios
├── dashboard/                  # React web UI
│   └── src/components/         # RequestFeed, AuditDetail, AgentSelector, PolicyStatus
└── tests/                      # OPA policy unit tests (22 tests)
```

## License

Apache 2.0

---

*KAMO Consulting / KAMO Tune AI, LLC — June 2026*
