# Security

## Supported versions

Security updates are applied to the **latest minor release** on the default branch (`main`). Use tags / releases for production deployments.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security reports.**

1. Use **GitHub → Security → Advisories → Report a vulnerability** on this repository (recommended), **or**
2. Email the maintainers with subject line `[SECURITY] krabbx` (use the contact on the repository profile if no email is published).

Include:

- Description and impact
- Steps to reproduce (or proof-of-concept where safe)
- Affected version / commit if known

We aim to acknowledge within a few business days and coordinate disclosure.

## Hardening checklist (operators)

- **Never** set `AUTH_ENABLED=false` with `NODE_ENV=production`. Use GitHub OAuth in production.
- If you must run without OAuth in a **non-production** environment, set `AUTH_ENABLED=false` **and** `ALLOW_INSECURE_NOAUTH=true`.
- Use a strong, random `SESSION_SECRET` (32+ characters). Rotate if leaked.
- Terminate TLS at your ingress/reverse proxy and set:
  - `TRUST_PROXY=1` (or the number of proxy hops) on the backend
  - `SESSION_COOKIE_SECURE=true` when the browser only uses HTTPS (default when `NODE_ENV=production` unless overridden).
- Prefer **Redis-backed sessions** in production (`USE_REDIS=true`, `REDIS_URL=...`).
- **CSRF**: The SPA obtains a token from `GET /api/auth/status` or `GET /api/auth/csrf`. All mutating `/api/*` calls must send header `X-CSRF-Token`.
- **Helm**: Prefer `values-production.yaml` (or equivalent) — network policies, TLS ingress, pinned image tags, Redis auth, and **no** insecure auth flags.
- **Docker Compose** binds services to **127.0.0.1** by default; do not expose Postgres/Redis to untrusted networks.
- Run dependency and image scans in CI (`security.yml`), and review **Trivy** / **CodeQL** / **gitleaks** results regularly.

## CI / supply chain

- CodeQL (JavaScript/TypeScript), Trivy (repo + container images), `pnpm audit`, dependency review (on PRs), gitleaks, and Helm lint/dry-run run in GitHub Actions.
- Consider **branch protection** and **required checks** on `main` for these workflows.

## Past security-related changes

See [CHANGELOG.md](CHANGELOG.md) for notable security-related releases.
