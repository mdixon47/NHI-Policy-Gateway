# NHI Policy Gateway — DevSecOps Pipeline

Security is enforced continuously through GitHub Actions: every push and pull
request to `main` runs build, test, static analysis, dependency/secret/IaC
scanning, and container image scanning, with findings surfaced in the
repository **Security → Code scanning** tab via SARIF.

All workflows declare least-privilege `permissions` and elevate scopes only per
job where required (e.g. `security-events: write` for SARIF upload,
`packages: write` for image publishing).

## Workflows

| Workflow | File | Triggers | Purpose |
|----------|------|----------|---------|
| CI | `.github/workflows/ci.yml` | push, PR | Build/test gateway, build mock-tools, lint/build dashboard, `opa check` + `opa test` |
| CodeQL | `.github/workflows/codeql.yml` | push, PR, weekly | SAST for JavaScript/TypeScript (`security-and-quality`) |
| Security | `.github/workflows/security.yml` | push, PR, weekly | Secret scan, Trivy fs/IaC scan, Dockerfile lint, dependency review, npm audit |
| Docker | `.github/workflows/docker.yml` | push, PR | Build images, Trivy image scan, push to GHCR on `main` |

## Security gates

| Control | Tool | Gate |
|---------|------|------|
| SAST | CodeQL | Alerts uploaded to code scanning |
| Secrets | gitleaks | Job fails on any leaked secret |
| Dependency vulns (FS) | Trivy `fs` | SARIF (CRITICAL/HIGH, unfixed ignored) |
| IaC / misconfig | Trivy `misconfig` | Scans Dockerfiles + compose, SARIF |
| Dependency review (PR) | dependency-review-action | Fails on newly introduced **high** severity |
| Production deps | `npm audit --omit=dev` | Fails on **critical** advisories |
| Dockerfile hygiene | hadolint | Fails on **error**-level findings |
| Container image vulns | Trivy `image` | SARIF (CRITICAL/HIGH) per image |
| Policy correctness | OPA | `opa check` + `opa test` (24 tests) |

## Supply chain

- **Dependabot** (`.github/dependabot.yml`) opens weekly PRs for npm
  (`gateway`, `mock-tools`, `dashboard`), GitHub Actions, and Docker base
  images, keeping dependencies and pinned actions current.
- **GHCR publishing**: on `main`, images are pushed to
  `ghcr.io/<owner>/<repo>/<service>` tagged with both the commit SHA and
  `latest`. PR builds are scanned but not published.

## Pinned versions

- **OPA**: `1.17.1` (matches `docker-compose.yml` and local runs)
- **Node**: `20` across all CI jobs and Dockerfiles

## Running the checks locally

```bash
# Gateway: build + tests
cd gateway && npm ci && npm run build && npm test

# Mock tools: build
cd mock-tools && npm ci && npm run build

# Dashboard: lint + build
cd dashboard && npm ci && npm run lint && npm run build

# Policies: lint + tests (Docker, no local OPA needed)
docker run --rm -v "$PWD":/work -w /work \
  openpolicyagent/opa:1.17.1 check policies/
docker run --rm -v "$PWD":/work -w /work \
  openpolicyagent/opa:1.17.1 test policies/ tests/ -v

# Filesystem vulnerability + IaC scan
docker run --rm -v "$PWD":/src aquasec/trivy:latest \
  fs --scanners vuln,secret,misconfig --severity CRITICAL,HIGH /src

# Secret scan
docker run --rm -v "$PWD":/repo zricethezav/gitleaks:latest \
  detect --source=/repo --no-banner
```

## Notes

- Trivy findings use `ignore-unfixed: true` so the pipeline focuses on
  actionable, fixable vulnerabilities.
- `gitleaks-action@v2` is free for personal/public repositories; organizations
  require a `GITLEAKS_LICENSE` secret.
- See [`issue.md`](./issue.md) and [`update.md`](./update.md) for the security
  review findings and the application-layer hardening these pipelines guard.
