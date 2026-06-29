# NHI Policy Gateway — Code Review Findings

A prioritized security and reliability review of the NHI Policy Gateway
(enforcement layer for Non-Human Identity governance in agentic AI systems).
Findings are ordered by severity. Each maps to the remediation tracked in
[`update.md`](./update.md).

## Severity legend

| Level | Meaning |
|-------|---------|
| 🔴 Critical | Exploitable trust or availability gap; blocks enterprise adoption |
| 🟠 High | Material weakness that undermines the governance guarantee |
| 🟡 Medium | Hardening gap or operational risk |

---

## 🔴 Critical

### C1 — Spoofable identity (no authentication)
The gateway derived the agent identity and credential from client-supplied
headers / profile JSON with no verification. Any caller could assert any NHI,
defeating the entire governance model — policy decisions are only as
trustworthy as the identity they are evaluated against.

### C2 — Client-controlled trust thresholds
The delegation `max_depth` (and related trust-sensitive limits) could be
supplied or raised by the client/profile input. A caller could relax the very
boundary meant to constrain it, so deep delegation chains could bypass the
intended cap.

### C3 — Fail-open on gateway/engine failure
The `/mcp/tools/call` handler did not consistently await and catch downstream
errors. An OPA outage, network error, or unhandled rejection could hang the
request or allow it to proceed without a completed policy decision — the
opposite of fail-closed.

---

## 🟠 High

### H1 — Declared policy data not enforced
`policy_data.json` declared `allowed_credential_types` and `max_ttl_hours`,
but no Rego rule consumed them. The data implied a control that did not exist,
giving a false sense of coverage for credential-lifecycle governance.

### H2 — No bounded latency on outbound calls
OPA and tool-server HTTP calls had no timeouts. A slow or stuck upstream could
exhaust connections and stall the gateway indefinitely, turning a dependency
slowdown into a gateway-wide outage.

### H3 — Volatile, tamper-evident-free audit trail
Decisions were kept only in an in-memory array. The audit history was lost on
restart, grew unbounded, and offered no integrity guarantee — unacceptable for
a control plane that must produce a defensible record of access decisions.

---

## 🟡 Medium

### M1 — Sequential policy evaluation latency
Each request evaluated up to four policies (two round-trips each) serially —
up to eight sequential OPA calls, adding avoidable tail latency.

### M2 — Open CORS and unauthenticated audit feed
CORS defaulted to `*` and `/audit/feed` was readable without authentication,
exposing the decision history to any origin/caller.

### M3 — Missing edge middleware
No security headers (`helmet`) and no rate limiting on the tool-call endpoint,
leaving the gateway exposed to trivial header-based attacks and abuse.

### M4 — Plaintext inter-service traffic
Gateway ↔ OPA ↔ tool-server traffic was plain HTTP with no TLS/mTLS option,
and the OPA container image was unpinned (`:latest`).

### M5 — Container hardening
The image ran as root with full dev dependencies and no multi-stage build.

### M6 — OWASP mapping inconsistency
The delegation policy carried an incorrect OWASP label, weakening the
traceability of findings back to the OWASP ASI / NHI Top 10.

### M7 — No gateway test coverage
Only the Rego layer had tests; the TypeScript gateway (auth, audit chain,
fail-closed aggregation, delegation cap, routes) was untested.

---

## Summary

| ID | Severity | Area | Remediation |
|----|----------|------|-------------|
| C1 | 🔴 | Identity | JWT/JWKS verification (`auth.ts`) |
| C2 | 🔴 | Trust boundary | Central delegation cap |
| C3 | 🔴 | Availability | Fail-closed handler |
| H1 | 🟠 | Policy | Enforce declared `policy_data` |
| H2 | 🟠 | Resilience | Bounded timeouts |
| H3 | 🟠 | Audit | Durable hash-chained sink |
| M1 | 🟡 | Performance | Parallelized evaluation |
| M2 | 🟡 | Exposure | CORS + audit-feed auth |
| M3 | 🟡 | Edge | helmet + rate limiting |
| M4 | 🟡 | Transport | TLS/mTLS + pinned image |
| M5 | 🟡 | Container | Multi-stage non-root build |
| M6 | 🟡 | Traceability | OWASP label fix |
| M7 | 🟡 | Testing | Gateway test suite |
