# Krabbx - Renovate Dashboard

Krabbx is a self-hosted dashboard for monitoring Renovate adoption and dependency update activity across GitHub organizations and user repositories.

![Dashboard Preview](docs/dashboard-preview.png)

## Features

- Centralized view of repositories, dependencies, and open Renovate PRs
- Organization and user-level scanning with scheduled runs
- GitHub OAuth authentication with optional team-based access control
- Real-time dashboard updates via Socket.io
- Memory mode for fast local setup and PostgreSQL mode for persistence
- Docker and Helm support for production deployments

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind, React Query, Recharts
- Backend: Node.js, Express, TypeScript, Prisma, Socket.io
- Storage: In-memory mode or PostgreSQL
- Sessions / scaling: Redis (`connect-redis` + Socket.io Redis adapter)

## Quick Start

### Prerequisites

- Node.js 24+
- pnpm
- GitHub token for scanning
- (Optional) PostgreSQL for persistent storage

### 1) Install

```bash
git clone <repo-url>
cd krabbx
pnpm install
```

### 2) Configure

```bash
cp .env.example .env
```

At minimum, set:

- `GITHUB_TOKEN`
- `GITHUB_TARGETS` (comma-separated owners) or `GITHUB_ORG` (single owner)
- `SESSION_SECRET`

For local no-auth demo mode:

- `AUTH_ENABLED=false`
- `ALLOW_INSECURE_NOAUTH=true`

### 3) Run (memory mode)

```bash
# In .env: STORAGE_MODE=memory
pnpm run dev
```

Applications:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Database Mode (PostgreSQL)

Set `STORAGE_MODE=database` and `DATABASE_URL` in `.env`, then run:

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run dev
```

## Docker Compose

```bash
cp .env.example .env
# edit .env
pnpm run docker:up
```

Services started from `docker/docker-compose.yml`:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Stop stack:

```bash
pnpm run docker:down
```

## Useful Scripts

- `pnpm run dev` - run frontend + backend
- `pnpm run build` - build all packages
- `pnpm run lint` - lint frontend and backend
- `pnpm run test` - run frontend and backend tests
- `pnpm run db:migrate` - run Prisma migrations
- `pnpm run db:studio` - open Prisma Studio

## Security

- Vulnerability reporting and operational hardening are documented in `SECURITY.md`.
- Do not use insecure auth mode in production.

## Contributing

1. Create a feature branch.
2. Make your changes and run `pnpm run lint` and `pnpm run test`.
3. Open a pull request using the project PR template.

## License

MIT License. See `LICENSE`.
