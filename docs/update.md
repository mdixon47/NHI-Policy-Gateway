# NHI Policy Gateway — Enterprise Hardening Changes

Remediation log for the findings in [`issue.md`](./issue.md). All changes are
safe-by-default: new controls are gated behind environment variables so the
existing demo continues to run unchanged. IDs below reference the finding they
resolve.

## Verification status

| Layer | Command | Result |
|-------|---------|--------|
| TypeScript build | `npm run build` (`tsc`) | ✅ clean |
| Gateway tests | `npm test` (`vitest run`) | ✅ 17/17 |
| OPA policies | `opa test policies/ tests/` (Docker `1.17.1`) | ✅ 24/24 |

---

## Identity & trust (C1, C2)

- **JWT/JWKS verification** — new `gateway/src/auth.ts` verifies a bearer token
  (JWKS URI, public key, or shared secret) and derives the agent identity and
  credential from verified claims. Gated by `AUTH_MODE` (`disabled` default
  preserves the header/profile demo mode; `jwt` enforces verification, 401 on
  failure). [C1]
- **Central delegation cap** — `effectiveMaxDepth()` in `mcp-handler.ts` sources
  the limit from `config.delegationMaxDepth`; client/profile values may only
  *tighten* it, never raise it. [C2]

## Availability & resilience (C3, H2, M1)

- **Fail-closed handler** — `/mcp/tools/call` now awaits and wraps the decision
  pipeline; any error returns a `GATEWAY_ERROR` deny (403) instead of hanging or
  proceeding. [C3]
- **Bounded timeouts** — all OPA and tool-server calls use configurable timeouts
  (`OPA_TIMEOUT_MS`, `TOOL_TIMEOUT_MS`). [H2]
- **Parallel evaluation** — `opa-client.ts` evaluates all policies concurrently
  with `Promise.all`, each failing closed independently on error. [M1]

## Policy enforcement (H1, M6)

- **Declared data now enforced** — `credential_checks.rego` adds
  `disallowed_credential_type` (from `allowed_credential_types`) and
  `excessive_ttl` (from `max_ttl_hours`), each emitting a structured
  `denial_reasons` entry. Rules are inert unless the data is present, so they
  are backward compatible. [H1]
- **OWASP label fix** — corrected the delegation policy's OWASP mapping. [M6]

## Auditing (H3, M2)

- **Durable, tamper-evident sink** — new `gateway/src/audit-sink.ts` appends
  every decision to a file with a SHA-256 hash chain (each record hashes the
  previous), enabling tamper detection. The tail is reloaded on startup. Enabled
  via `AUDIT_FILE`. [H3]
- **Bounded in-memory log** — retention capped via `AUDIT_RETENTION`. [H3]
- **Audit-feed auth** — `/audit/feed` requires a bearer token when
  `AUDIT_FEED_TOKEN` is set (open in demo mode otherwise). [M2]

## Edge & transport (M2, M3, M4, M5)

- **Security middleware** — `helmet` headers and `express-rate-limit` on the
  tool-call endpoint (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`). [M3]
- **Configurable CORS** — origin sourced from `CORS_ORIGIN`. [M2]
- **TLS / mTLS** — new `gateway/src/tls.ts` provides an inbound HTTPS/mTLS
  server and an outbound mTLS `https.Agent` for OPA/tool calls, all gated by
  `TLS_*` / `OUTBOUND_*` env vars. [M4]
- **Pinned OPA image** — `docker-compose.yml` pins `openpolicyagent/opa:1.17.1`
  in place of `:latest`. [M4]
- **Hardened container** — multi-stage `Dockerfile` running as non-root `node`
  with production-only dependencies. [M5]

## Testing (M7)

New Vitest + Supertest suite under `gateway/test/`:

| File | Covers |
|------|--------|
| `auth.test.ts` | JWT/JWKS verification paths |
| `audit-sink.test.ts` | Hash-chain append + integrity |
| `opa-client.test.ts` | Aggregation, denial reasons, **fail-closed** |
| `routes.test.ts` | `/health`, audit-feed auth, delegation cap |

`index.ts` was refactored to export `createApp()` so routes can be tested
without binding a port.

---

## Configuration reference

All knobs live in `gateway/src/config.ts` and read from the environment.
Defaults preserve demo behavior.

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUTH_MODE` | `disabled` | `jwt` to enforce token verification |
| `JWT_JWKS_URI` / `JWT_PUBLIC_KEY` / `JWT_SECRET` | — | Verification key source |
| `JWT_ISSUER` / `JWT_AUDIENCE` | — | Claim validation |
| `OPA_TIMEOUT_MS` | `2000` | OPA call timeout |
| `TOOL_TIMEOUT_MS` | `5000` | Tool-server call timeout |
| `DELEGATION_MAX_DEPTH` | `3` | Central delegation cap |
| `AUDIT_FILE` | — | Path to durable hash-chained audit log |
| `AUDIT_RETENTION` | `1000` | In-memory audit cap |
| `AUDIT_FEED_TOKEN` | — | Bearer token for `/audit/feed` |
| `CORS_ORIGIN` | `*` | Allowed origin |
| `MAX_BODY_BYTES` | `256kb` | JSON body limit |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `60000` / `120` | Tool-call rate limit |
| `TLS_CERT_FILE` / `TLS_KEY_FILE` / `TLS_CA_FILE` | — | Inbound TLS/mTLS |
| `TLS_REQUIRE_CLIENT_CERT` | `false` | Require client cert (mTLS) |
| `OUTBOUND_CERT_FILE` / `OUTBOUND_KEY_FILE` / `OUTBOUND_CA_FILE` | — | Outbound mTLS to OPA/tools |
