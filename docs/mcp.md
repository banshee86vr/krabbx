# Krabbx MCP

Connect Cursor (or any MCP client) to a running Krabbx instance using a personal API token.

## Prerequisites

1. Krabbx backend running (default `http://localhost:3001`)
2. Sign in (or use local no-auth mode) and open **Settings → API tokens**
3. Create a token (optionally read-only). Copy it once; it is not shown again.

## Install

From the repo root:

```bash
pnpm install
pnpm mcp:build
```

## Local Cursor (stdio)

Add to your Cursor MCP config (e.g. `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "krabbx": {
      "command": "node",
      "args": ["/absolute/path/to/krabbx/mcp/dist/index.js"],
      "env": {
        "KRABBX_API_URL": "http://localhost:3001",
        "KRABBX_API_TOKEN": "krabbx_..."
      }
    }
  }
}
```

## Product / remote (Streamable HTTP)

HTTP mode requires a **separate** client credential (`MCP_HTTP_TOKEN`) and binds to localhost by default.

```bash
KRABBX_API_URL=https://krabbx.example.com \
KRABBX_API_TOKEN=krabbx_... \
MCP_HTTP_TOKEN="$(openssl rand -hex 32)" \
MCP_HOST=127.0.0.1 \
MCP_PORT=3101 \
pnpm mcp:http
```

| Variable | Purpose |
|----------|---------|
| `KRABBX_API_TOKEN` | Personal API token used by the MCP process to call Krabbx |
| `MCP_HTTP_TOKEN` | Required. Clients must send `Authorization: Bearer <MCP_HTTP_TOKEN>` on `/mcp` |
| `MCP_HOST` | Bind address (default `127.0.0.1`). Set to `0.0.0.0` only behind an authenticated reverse proxy / mTLS |
| `MCP_PORT` | Listen port (default `3101`) |

Without `MCP_HTTP_TOKEN`, anyone who can reach `/mcp` could drive all tools using the process Krabbx token. Treat `/mcp` as a private control plane: keep it on loopback, or terminate TLS and auth at a reverse proxy before opening it on a network.

## Tools

Read tools cover health, settings (no secrets), dashboard summary/trends/activity, top outdated, gamification, GitHub rate limit, repositories, scan status, dependencies, package managers, and Renovate PRs.

Write tools (require token `write` scope; confirm with the user before use):

- `trigger_org_scan` / `trigger_repo_scan`
- `update_settings` (`scanIntervalMinutes`, `maxScanLimit` only)

## Security notes

- Tokens are hashed at rest; plaintext is shown only once at creation.
- Validated Bearer API tokens skip CSRF; cookie sessions still use double-submit CSRF. A bogus `Authorization` header does not bypass CSRF.
- Never expose `GITHUB_TOKEN`, OAuth secrets, or session secrets via MCP.
- Stdio mode keeps secrets in the local Cursor process env; do not commit them.
