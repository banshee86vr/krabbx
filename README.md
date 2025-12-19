# RenovateBot Dashboard

A secure monitoring dashboard for tracking Renovate Bot adoption across repositories within a GitHub organization, displaying outdated dependencies detected by the bot.

![Dashboard Preview](docs/dashboard-preview.png)

## Features

- 🔐 **Secure Authentication**: GitHub OAuth SSO with team-based access control
- 📊 **Repository Monitoring**: Track which repositories have adopted Renovate Bot
- 🔍 **Outdated Dependencies**: View outdated dependencies detected by Renovate across all repos
- ⚡ **Real-time Updates**: WebSocket-powered live notifications
- 📧 **Multi-channel Notifications**: Alerts via Microsoft Teams, Email, or in-app
- ⏰ **Scheduled Scanning**: Automatic periodic scans of your organization
- 🎨 **Beautiful UI**: Modern dark/light mode dashboard with dynamic animations
- 🚀 **Two Storage Modes**: Quick start with memory storage or persistent PostgreSQL database
- 🛡️ **Production-Ready Security**: Rate limiting, CSP headers, non-root Docker containers

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Recharts
- **Backend**: Node.js, Express, TypeScript, Passport.js
- **Database**: PostgreSQL (optional - can use in-memory storage)
- **Real-time**: Socket.io with authentication
- **Security**: Helmet, express-rate-limit, GitHub OAuth
- **ORM**: Prisma (when using database mode)

## Quick Start

### ⚡ TL;DR - Get Running in 5 Minutes

**No Database (Memory Mode):**

```bash
# 1. Clone and install
git clone <repo-url> && cd renovate-bot-dashboard && pnpm install

# 2. Configure (edit backend/.env with your GitHub credentials)
cp backend/.env.example backend/.env

# 3. Set STORAGE_MODE=memory in backend/.env

# 4. Start
pnpm run dev
```

**With PostgreSQL Database:**

```bash
# 1. Clone and install
git clone <repo-url> && cd renovate-bot-dashboard && pnpm install

# 2. Start PostgreSQL (Docker)
docker run --name renovate-postgres \
  -e POSTGRES_DB=renovate_dashboard \
  -e POSTGRES_USER=renovate \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5432:5432 -d postgres:16-alpine

# 3. Configure (edit backend/.env with your credentials and DATABASE_URL)
cp backend/.env.example backend/.env

# 4. Initialize database
cd backend
pnpm run db:generate && pnpm run db:migrate && pnpm run db:seed
cd ..

# 5. Start
pnpm run dev
```

Access at: http://localhost:5173

### Prerequisites

- Node.js 18+ or 20+
- pnpm (recommended) or npm
- GitHub Personal Access Token with `repo` and `read:org` scopes
- GitHub OAuth App for authentication
- PostgreSQL 14+ (optional - only for database mode)

### 🚀 Local Development (No Database Required)

**Perfect for testing and development!** Start in minutes without setting up a database.

1. **Clone and install dependencies**

```bash
git clone https://github.com/your-org/renovate-bot-dashboard.git
cd renovate-bot-dashboard
pnpm install
```

2. **Configure environment**

```bash
# Copy example environment file
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your credentials:

```env
# GitHub Configuration
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_ORG=your-organization-name

# GitHub OAuth (create at: https://github.com/settings/developers)
GITHUB_AUTH_CLIENT_ID=your_oauth_client_id
GITHUB_AUTH_CLIENT_SECRET=your_oauth_client_secret

# Session Security (generate with: openssl rand -base64 32)
SESSION_SECRET=your_random_32_character_secret_string

# Storage Mode - Use memory for quick start
STORAGE_MODE=memory

# URLs
PORT=3001
FRONTEND_URL=http://localhost:5173
```

3. **Start the application**

```bash
# From project root
pnpm run dev
```

The application will start:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

### 🗄️ Production Setup with PostgreSQL Database

For persistent data storage in production environments, follow these steps to set up from scratch:

#### Step 1: Install Dependencies

```bash
git clone https://github.com/your-org/renovate-bot-dashboard.git
cd renovate-bot-dashboard
pnpm install
```

#### Step 2: Setup PostgreSQL Database

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL container
docker run --name renovate-postgres \
  -e POSTGRES_DB=renovate_dashboard \
  -e POSTGRES_USER=renovate \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5432:5432 \
  -d postgres:16-alpine
```

**Option B: Using Local PostgreSQL**

```bash
# Create database (macOS with Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Create database and user
psql postgres
CREATE DATABASE renovate_dashboard;
CREATE USER renovate WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE renovate_dashboard TO renovate;
\q
```

#### Step 3: Configure Environment

```bash
# Copy example environment file
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
# GitHub Configuration
GITHUB_TOKEN=ghp_your_personal_access_token_here
GITHUB_ORG=your-organization-name

# GitHub OAuth
GITHUB_AUTH_CLIENT_ID=your_oauth_client_id
GITHUB_AUTH_CLIENT_SECRET=your_oauth_client_secret

# Session Security
SESSION_SECRET=your_random_32_character_secret_string

# Database Configuration
STORAGE_MODE=database
DATABASE_URL=postgresql://renovate:yourpassword@localhost:5432/renovate_dashboard

# URLs
PORT=3001
FRONTEND_URL=http://localhost:5173
```

#### Step 4: Initialize Prisma and Database

```bash
# Navigate to backend directory
cd backend

# Generate Prisma Client (creates TypeScript types and query engine)
pnpm run db:generate

# Run database migrations (creates tables and schema)
pnpm run db:migrate

# Optional: Seed database with sample data
pnpm run db:seed

# Return to project root
cd ..
```

**What each command does:**

- `db:generate` - Generates Prisma Client from your schema (required before first run)
- `db:migrate` - Creates database tables based on Prisma schema
- `db:seed` - Populates database with initial/sample data (optional)

#### Step 5: Start the Application

```bash
# From project root
pnpm run dev
```

Access the dashboard at http://localhost:5173

#### Step 6: Verify Database Connection

Check the backend logs for successful connection:

```
✓ Database connection established
✓ Server running on http://localhost:3001
```

You can also explore your database:

```bash
cd backend
pnpm run db:studio
```

This opens Prisma Studio at http://localhost:5555 for visual database management.

### 🐳 Docker Setup

Perfect for production deployments with all services containerized. See our [Docker Setup Guide](docs/DOCKER_SETUP.md) for comprehensive documentation.

1. **Configure environment**

   ```bash
   cp .env.example .env
   # Edit .env with your production settings
   ```

2. **Start all services** (Frontend, Backend, PostgreSQL, Redis)

   ```bash
   cd docker
   docker-compose up -d
   ```

   The dashboard will be available at http://localhost

3. **View logs**

   ```bash
   docker-compose logs -f
   ```

4. **Stop services**
   ```bash
   docker-compose down
   ```

**What's Included:**

- PostgreSQL 16 (persistent database)
- Redis 7 (session storage & Socket.io)
- Backend API (Node.js/Express)
- Frontend (Nginx serving React SPA)
- Automatic database migrations

**Security Features:**

- Non-root execution (backend: UID 1001, frontend: UID 101)
- Isolated Docker network
- Health checks for all services
- Secure session management with Redis

## Database Commands Reference

All database commands should be run from the `backend/` directory:

```bash
cd backend
```

### Essential Commands

| Command                    | Description                    | When to Use                                |
| -------------------------- | ------------------------------ | ------------------------------------------ |
| `pnpm run db:generate`     | Generate Prisma Client         | After `pnpm install`, after schema changes |
| `pnpm run db:migrate`      | Run database migrations        | First setup, after schema changes          |
| `pnpm run db:seed`         | Seed database with sample data | Testing, development                       |
| `pnpm run db:studio`       | Open Prisma Studio GUI         | Viewing/editing database visually          |
| `pnpm run db:migrate:prod` | Deploy migrations (no prompts) | Production deployments                     |

### Common Workflows

**Initial Setup (First Time)**

```bash
cd backend
pnpm run db:generate  # Generate Prisma Client
pnpm run db:migrate   # Create database tables
pnpm run db:seed      # Add sample data (optional)
```

**After Changing Schema (backend/prisma/schema.prisma)**

```bash
cd backend
pnpm run db:migrate   # Create and apply migration
pnpm run db:generate  # Regenerate Prisma Client
```

**Reset Database (Start Fresh)**

```bash
cd backend
# Drop and recreate database
psql -U postgres -c "DROP DATABASE renovate_dashboard;"
psql -U postgres -c "CREATE DATABASE renovate_dashboard;"
# Run migrations
pnpm run db:migrate
pnpm run db:seed
```

**Production Deployment**

```bash
cd backend
pnpm run db:generate       # Generate client
pnpm run db:migrate:prod   # Deploy migrations (no prompts)
```

## Configuration

### Environment Variables

#### Required

| Variable                    | Description                               | How to get                                                 |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `GITHUB_TOKEN`              | GitHub PAT with `repo`, `read:org` scopes | [Create token](https://github.com/settings/tokens)         |
| `GITHUB_ORG`                | GitHub organization to monitor            | Your org name                                              |
| `GITHUB_AUTH_CLIENT_ID`     | OAuth App Client ID                       | [Create OAuth App](https://github.com/settings/developers) |
| `GITHUB_AUTH_CLIENT_SECRET` | OAuth App Client Secret                   | Same OAuth App                                             |
| `SESSION_SECRET`            | Random string for session encryption      | Generate: `openssl rand -base64 32`                        |

#### Storage Configuration

| Variable       | Required                | Default  | Description                  |
| -------------- | ----------------------- | -------- | ---------------------------- |
| `STORAGE_MODE` | No                      | `memory` | `memory` or `database`       |
| `DATABASE_URL` | Only if `database` mode | -        | PostgreSQL connection string |

#### Optional

| Variable                  | Default               | Description                            |
| ------------------------- | --------------------- | -------------------------------------- |
| `PORT`                    | 3001                  | Backend server port                    |
| `FRONTEND_URL`            | http://localhost:5173 | Frontend URL for CORS and OAuth        |
| `SCAN_INTERVAL_MINUTES`   | 60                    | Auto-scan interval                     |
| `MAX_SCAN_LIMIT`          | 0                     | Max repos per scan (0=unlimited)       |
| `SCAN_REPOS`              | -                     | Comma-separated list of specific repos |
| `TEAMS_WEBHOOK_URL`       | -                     | MS Teams incoming webhook              |
| `SMTP_HOST`               | -                     | SMTP server for emails                 |
| `SMTP_PORT`               | 587                   | SMTP port                              |
| `SMTP_USER`               | -                     | SMTP username                          |
| `SMTP_PASS`               | -                     | SMTP password                          |
| `NOTIFICATION_FROM_EMAIL` | -                     | Email sender address                   |

### GitHub OAuth App Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: RenovateBot Dashboard
   - **Homepage URL**: `http://localhost:5173` (dev) or your production URL
   - **Authorization callback URL**: `http://localhost:3001/api/auth/callback`
4. Copy Client ID and Client Secret to `.env`

### Team-Based Access Control

By default, only users in the `team_cloud_and_platforms` team under the `prom-candp` organization can access the dashboard. To change this, modify:

- `backend/src/routes/auth.routes.ts` (lines 10-11)

### Notification Triggers

Configure notifications for different events:

- **Critical Updates**: Major version updates detected
- **New Adoption**: Repository adopts Renovate
- **Stale PRs**: Renovate PRs open too long
- **Scan Complete**: Organization scan finished

## Security Features

🔐 This application implements production-grade security:

- ✅ **GitHub OAuth SSO** - Mandatory authentication with team-based authorization
- ✅ **Rate Limiting** - Three-tier system (100 req/15min general, 5 req/15min auth, 10 req/hour scans)
- ✅ **Security Headers** - CSP, HSTS, X-Frame-Options via Helmet
- ✅ **Session Security** - httpOnly, secure, sameSite cookies
- ✅ **WebSocket Authentication** - Cookie-based session verification
- ✅ **Non-Root Docker** - Containers run as UID 1001
- ✅ **CSRF Protection** - OAuth state parameter validation
- ✅ **Input Validation** - Zod schema validation on all endpoints

See [SECURITY.md](docs/SECURITY.md) for comprehensive security documentation.

## API Endpoints

All endpoints require authentication except `/api/auth/*` and `/health`.

### Authentication

- `GET /api/auth/login` - Initiate GitHub OAuth
- `GET /api/auth/callback` - OAuth callback
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/logout` - Logout user

### Dashboard

- `GET /api/dashboard/summary` - Dashboard overview
- `GET /api/dashboard/trends` - Historical trends (30 days)
- `GET /api/dashboard/activity` - Recent activity
- `GET /api/dashboard/github-status` - GitHub API rate limit

### Repositories

- `GET /api/repositories` - List repositories (paginated)
- `GET /api/repositories/:id` - Repository details with dependencies
- `GET /api/repositories/stats` - Aggregate statistics
- `POST /api/repositories/scan` - Trigger organization scan
- `POST /api/repositories/:id/scan` - Scan single repository

### Dependencies

- `GET /api/dependencies` - List all dependencies (paginated)
- `GET /api/dependencies/outdated` - List outdated dependencies
- `GET /api/dependencies/stats` - Dependency statistics
- `GET /api/dependencies/package-managers` - List detected package managers

### Notifications

- `GET /api/notifications/config` - Get notification configs
- `POST /api/notifications/config` - Create notification config
- `PUT /api/notifications/config/:id` - Update config
- `DELETE /api/notifications/config/:id` - Delete config
- `POST /api/notifications/test` - Send test notification
- `GET /api/notifications/history` - Notification history
- `GET /api/notifications/triggers` - Available triggers

### Settings

- `GET /api/settings` - Get application settings
- `PUT /api/settings` - Update settings

## Project Structure

```
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client
│   │   ├── context/        # React contexts
│   │   └── types/          # TypeScript types
│   └── ...
├── backend/                # Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   └── config/         # Configuration
│   └── prisma/             # Database schema
├── docker/                 # Docker configs
└── docs/                   # Documentation
```

## Documentation

- 📖 [Local Setup Guide](docs/LOCAL_SETUP.md) - Step-by-step guide to run without database
- 🔐 [Security Documentation](docs/SECURITY.md) - Comprehensive security guide
- 📊 [Security Audit Report](docs/SECURITY_AUDIT_REPORT.md) - Latest security audit results
- 🏗️ [Implementation Steps](docs/IMPLEMENTATION_STEPS.md) - Development roadmap
- 🤖 [CLAUDE.md](CLAUDE.md) - AI assistant reference documentation

## Troubleshooting

### Common Issues

**Error: Cannot find module '.prisma/client/default'**

- This means Prisma Client hasn't been generated yet
- Solution: Run `cd backend && pnpm run db:generate`
- This must be done after `pnpm install` and before starting the server
- The Prisma Client is generated from your schema and contains TypeScript types

**Database connection errors**

- Verify PostgreSQL is running: `psql -U renovate -d renovate_dashboard`
- Check `DATABASE_URL` in `.env` matches your database credentials
- Ensure database exists: `psql -U postgres -c "CREATE DATABASE renovate_dashboard;"`
- Check firewall rules if using remote PostgreSQL

**Migration errors: "Schema does not match database"**

- Your database schema is out of sync
- Solution: `cd backend && pnpm run db:migrate`
- For a fresh start: Drop database and run migrations again
- Check `backend/prisma/migrations` folder for migration history

**Port already in use (EADDRINUSE)**

- Backend (3001) or Frontend (5173) port is already taken
- Find process: `lsof -i :3001` or `lsof -i :5173`
- Kill process: `kill -9 <PID>`
- Or change port in `.env` (PORT) or `vite.config.ts`

**Authentication fails with "Invalid state parameter"**

- Clear browser cookies and try again
- Check that `FRONTEND_URL` matches your actual frontend URL
- Verify OAuth callback URL in GitHub matches `http://localhost:3001/api/auth/callback`

**"Too many requests" error**

- Rate limiting is active. Wait 15 minutes or restart backend in development mode
- In production, this prevents abuse
- Rate limits: 100 req/15min general, 5 req/15min auth, 10 req/hour scans

**Dependencies not showing**

- Run a scan: Click "Start Scan" button in the dashboard
- Check GitHub token has correct permissions (`repo`, `read:org`)
- Verify organization has Renovate Bot PRs
- Check backend logs for GitHub API errors

**WebSocket connection fails**

- Check that backend is running on port 3001
- Verify CORS settings match your frontend URL
- Open browser DevTools → Network tab → WS to see connection errors

**Prisma Studio won't start**

- Ensure `DATABASE_URL` is set correctly in backend/.env
- Run `cd backend && pnpm run db:generate` first
- Check if port 5555 is available

**pnpm install fails**

- Try clearing cache: `pnpm store prune`
- Delete node_modules and lockfile: `rm -rf node_modules pnpm-lock.yaml`
- Run `pnpm install` again
- Ensure Node.js version is 18+ or 20+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run linter: `pnpm run lint`
5. Test security: `pnpm audit` and `trivy fs .`
6. Commit using conventional commits (`feat:`, `fix:`, `chore:`)
7. Push and create a Pull Request

## Performance

- ⚡ GitHub API responses cached for 5 minutes
- 📊 React Query caching on frontend
- 🔄 WebSocket for real-time updates (no polling)
- 🗄️ Memory storage mode: sub-second response times
- 🔍 Pagination on all list endpoints
