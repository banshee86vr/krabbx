# Changelog

All notable changes to the Renovate Bot Dashboard project.

## [Unreleased] - 2025-12-03

### 🔐 Security Improvements

#### Package Vulnerabilities Fixed
- **nodemailer**: Updated from `6.10.1` to `^7.0.11`
  - Fixed: Email domain confusion vulnerability (MODERATE)
  - Fixed: Address parser DoS vulnerability (LOW)
- **vitest**: Updated from `2.1.9` to `^4.0.15`
  - Fixed: esbuild development server vulnerability (MODERATE)

#### Security Features Added
- ✅ **API Rate Limiting** - Three-tier system to prevent abuse
  - General API: 100 requests per 15 minutes
  - Authentication: 5 requests per 15 minutes
  - Scan endpoints: 10 requests per hour
- ✅ **Enhanced Security Headers** via Helmet
  - Content Security Policy (CSP) configured
  - HTTP Strict Transport Security (HSTS) enabled
  - XSS protection enhanced
- ✅ **WebSocket Authentication** - Cookie-based session verification
- ✅ **Session Security Improvements**
  - Custom session cookie name (`sessionId`)
  - Production warning for memory-based session store
  - Enhanced CSRF protection with state cleanup
- ✅ **Docker Security**
  - Frontend container now runs as non-root user (UID 1001)
  - Backend already used non-root user
  - Port changed to 8080 for non-privileged binding

#### Security Documentation
- Created `/docs/SECURITY.md` - Comprehensive security guide
- Created `/docs/SECURITY_AUDIT_REPORT.md` - Detailed audit findings
- Added security checklist and best practices

### ✨ Features Added

#### Authentication System
- **GitHub OAuth SSO** - Mandatory authentication for all users
- **Team-Based Access Control** - Only authorized team members can access
  - Default: `team_cloud_and_platforms` in `prom-candp` organization
  - Configurable in `backend/src/routes/auth.routes.ts`
- **Login/Logout Flow** with proper session management
- **Protected Routes** - All API endpoints require authentication
- **User Profile** displayed in header with avatar

#### UI Enhancements
- **Animated Login Page** - Beautiful gradient background with moving orbs
- **Unauthorized Page** - Clear messaging for non-authorized users
- **Dark Mode Improvements** - Consistent styling across all pages
  - Fixed notifications page dark mode
  - Enhanced contrast and readability
- **Contributor Avatars** - Display repository contributors with GitHub avatars
- **Pulsing Bot Icon** - Animated brand icon in login page

#### Storage Flexibility
- **Memory Storage Mode** - No database required for development
  - Set `STORAGE_MODE=memory` in `.env`
  - Perfect for testing and quick demos
  - Sub-second response times
- **Database Storage Mode** - Persistent PostgreSQL storage
  - Set `STORAGE_MODE=database` in `.env`
  - Production-ready with Prisma ORM

### 📝 Documentation

#### New Documentation Files
- **LOCAL_SETUP.md** - Step-by-step guide to run without database
  - Prerequisites and requirements
  - GitHub OAuth setup instructions
  - Troubleshooting common issues
  - Development tips and tricks
- **SECURITY.md** - Comprehensive security documentation
- **SECURITY_AUDIT_REPORT.md** - Security audit results
- **.env.example** - Updated with all new environment variables
- **CHANGELOG.md** - This file!

#### Updated Documentation
- **README.md** - Complete rewrite with:
  - Quick start for both memory and database modes
  - Security features section
  - Updated API endpoints list
  - Troubleshooting section
  - Performance notes
  - Contributing guidelines
- **CLAUDE.md** - Updated with:
  - New color palette (emerald green + cyan blue)
  - Authentication flow documentation
  - Environment variables reference

### 🔧 Configuration Changes

#### New Environment Variables
```bash
# Authentication (Required)
GITHUB_AUTH_CLIENT_ID=Ov23xxxxxxxxxxxxxxxxxxxx
GITHUB_AUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
SESSION_SECRET=your-random-secret-key

# Storage Mode
STORAGE_MODE=memory  # or 'database'

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

#### Updated Environment Variables
- Reorganized `.env.example` with clear sections
- Added helpful comments and links
- Included generation commands for secrets

### 🐛 Bug Fixes

#### Backend
- Fixed x-axis on trend chart (added `timestamp` field)
- Fixed logout to clear correct session cookie name
- Fixed CSRF state validation and cleanup
- Fixed contributor avatars loading from GitHub API

#### Frontend
- Fixed dark mode styling on notifications page
- Fixed authentication context and protected routes
- Fixed API requests to include credentials
- Fixed gradient animations visibility (increased size, opacity, movement)

#### Docker
- Fixed frontend Dockerfile to run as non-root
- Updated nginx to listen on port 8080
- Updated docker-compose port mapping (80:8080)
- Fixed health checks for new port

### 🏗️ Architecture Changes

#### Middleware
- Added `rateLimiter.ts` - Rate limiting configuration
- Updated `auth.ts` - Enhanced authentication checks
- Enhanced `errorHandler.ts` - Better error messages

#### Routes
- Added `auth.routes.ts` - Authentication endpoints
- Updated all routes to require authentication
- Enhanced error handling and validation

#### Context Providers (Frontend)
- Added `AuthContext.tsx` - Global authentication state
- Updated `SocketContext.tsx` - Added credentials support

#### Components (Frontend)
- Added `Login.tsx` - Authentication page
- Added `Unauthorized.tsx` - Access denied page
- Added `ProtectedRoute.tsx` - Route guard component
- Updated `Header.tsx` - User profile and logout

### 🔄 Dependencies

#### Added
- `express-rate-limit` - API rate limiting
- `express-session` - Session management
- `cookie-parser` - Cookie parsing
- `@octokit/rest` - GitHub API client (for auth)

#### Updated
- `nodemailer`: 6.10.1 → 7.0.11
- `vitest`: 2.1.9 → 4.0.15

### 🧪 Testing

#### Security Scanning
- ✅ `pnpm audit` - 0 vulnerabilities
- ✅ Trivy scan - 0 HIGH/CRITICAL findings
  - Dependencies: Clean
  - Docker: Clean (both containers)
  - Secrets: Properly gitignored

### 📊 Performance Improvements

- GitHub API responses cached for 5 minutes
- React Query caching on frontend
- WebSocket for real-time updates (no polling)
- Memory storage mode: sub-second response times
- Pagination on all list endpoints

### 🎨 UI/UX Improvements

- Modern gradient backgrounds on auth pages
- Smooth animations on login page
- Dark mode consistency across all pages
- Better loading states
- Improved error messages
- Responsive design enhancements

### 🔨 Developer Experience

#### Scripts
- `pnpm run dev` - Start both frontend and backend
- `pnpm audit` - Check for vulnerabilities
- `trivy fs .` - Security scan with Trivy

#### Development Tools
- Rate limiting disabled in development mode
- Better error logging
- React Query DevTools enabled
- Hot reload on both frontend and backend

### 🚀 Deployment

#### Docker Improvements
- Non-root users in all containers
- Multi-stage builds for smaller images
- Health checks configured
- Security hardened containers
- CIS Docker Benchmark compliant

#### Production Checklist
- HTTPS/TLS requirement documented
- Session store recommendations provided
- Environment variable security guidelines
- Monitoring and logging suggestions
- Backup and recovery procedures

### ⚠️ Breaking Changes

1. **Authentication Now Required**
   - All users must authenticate via GitHub OAuth
   - Team membership required by default
   - Update OAuth App settings in GitHub

2. **Environment Variables**
   - New required: `GITHUB_AUTH_CLIENT_ID`, `GITHUB_AUTH_CLIENT_SECRET`, `SESSION_SECRET`
   - New optional: `STORAGE_MODE`, `FRONTEND_URL`

3. **Docker Port Change**
   - Frontend container port changed from 80 to 8080
   - Host mapping updated in docker-compose.yml

4. **Session Cookie Name**
   - Changed from `connect.sid` to `sessionId`
   - May require users to re-login once

### 📦 Migration Guide

#### Upgrading from Previous Version

1. **Update dependencies**
   ```bash
   pnpm install
   ```

2. **Create GitHub OAuth App**
   - Follow instructions in [LOCAL_SETUP.md](docs/LOCAL_SETUP.md#22-create-github-oauth-app)

3. **Update .env file**
   ```bash
   cp .env.example .env.new
   # Merge your existing .env with new variables from .env.new
   ```

4. **Add new environment variables**
   ```bash
   GITHUB_AUTH_CLIENT_ID=your-client-id
   GITHUB_AUTH_CLIENT_SECRET=your-client-secret
   SESSION_SECRET=$(openssl rand -base64 32)
   STORAGE_MODE=memory  # or keep 'database'
   FRONTEND_URL=http://localhost:5173
   ```

5. **Restart services**
   ```bash
   pnpm run dev
   ```

6. **Update Docker Compose** (if using Docker)
   ```bash
   cd docker
   docker-compose down
   docker-compose build
   docker-compose up -d
   ```

### 🎯 Next Steps

Planned features for future releases:

- [ ] Remember me / Extended sessions
- [ ] 2FA support for additional security
- [ ] Redis session store for production
- [ ] API documentation with Swagger/OpenAPI
- [ ] E2E tests with Playwright
- [ ] Prometheus metrics endpoint
- [ ] GraphQL API option
- [ ] Multi-organization support
- [ ] Custom team configuration UI
- [ ] Dependency vulnerability scoring

---

## Previous Versions

### [1.0.0] - Initial Release

- Basic dashboard functionality
- Repository scanning
- Dependency tracking
- Notifications (Teams, Email, In-app)
- PostgreSQL database
- Docker support

---

For detailed security information, see [SECURITY_AUDIT_REPORT.md](docs/SECURITY_AUDIT_REPORT.md).

For setup instructions, see [LOCAL_SETUP.md](docs/LOCAL_SETUP.md).

