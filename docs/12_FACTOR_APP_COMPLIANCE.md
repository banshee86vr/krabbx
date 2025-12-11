# 12-Factor App Compliance Analysis

This document analyzes the Renovate Bot Dashboard project against the [12-Factor App](https://12factor.net/) principles and documents compliance status and recommendations.

## ✅ Compliant Factors

### I. Codebase
**Status: ✅ COMPLIANT**

- Single codebase tracked in Git
- Multiple deploys supported (dev, staging, prod)
- Monorepo structure with clear separation (backend/frontend)

### II. Dependencies
**Status: ✅ COMPLIANT**

- All dependencies explicitly declared in `package.json`
- Lock files (`pnpm-lock.yaml`) ensure deterministic builds
- Docker multi-stage builds isolate dependencies
- `pnpm` workspace for dependency management

**Evidence:**
```json
// backend/package.json, frontend/package.json
{
  "dependencies": { ... },
  "devDependencies": { ... }
}
```

### III. Config
**Status: ✅ COMPLIANT**

- All configuration stored in environment variables
- Validated using Zod schema in `backend/src/config/env.ts`
- `.env.example` provided as template
- Docker Compose uses environment variable substitution

**Configuration Categories:**
- GitHub API credentials
- GitHub OAuth credentials
- Database connection
- Session secrets
- Email/Teams webhooks
- Scheduler settings
- Storage mode
- Logging level

### IV. Backing Services
**Status: ✅ COMPLIANT**

- PostgreSQL treated as attached resource via `DATABASE_URL`
- GitHub API treated as external service
- Email/Teams webhooks as optional backing services
- Can swap between memory and database storage via config
- Services can be changed without code changes

### V. Build, Release, Run
**Status: ✅ COMPLIANT**

- **Build**: TypeScript compilation, Docker image creation
- **Release**: Environment-specific config combined with built artifacts
- **Run**: Containerized execution with immutable images

**Docker Multi-Stage Build:**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
RUN npm run build

# Production stage
FROM node:20-alpine
COPY --from=builder /app/dist ./dist
```

### VII. Port Binding
**Status: ✅ COMPLIANT**

- Backend exports HTTP service on configurable `PORT` (default: 3001)
- Frontend served on port 8080 (non-root user)
- No external web server dependency in production
- Uses Node.js native `http.createServer()`

### IX. Disposability
**Status: ✅ COMPLIANT**

- Fast startup time (~2-3 seconds)
- Graceful shutdown handlers implemented:
  ```typescript
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  ```
- Closes server and database connections on shutdown
- Robust against sudden death
- Health checks implemented for container orchestration

### X. Dev/prod Parity
**Status: ✅ COMPLIANT**

- Same PostgreSQL version in dev and prod (16-alpine)
- Docker Compose provides dev environment matching production
- Time gap minimized (continuous deployment capable)
- Personnel gap minimized (developers deploy own code)
- Tools gap minimized (same database, same Node version)

### XII. Admin Processes
**Status: ✅ COMPLIANT**

- Database migrations run as one-off processes
- Separate Docker service for migrations:
  ```yaml
  migrations:
    command: npx prisma migrate deploy
    restart: "no"
  ```
- Admin tasks use same codebase and environment

## ⚠️ Partial Compliance / Needs Improvement

### VI. Processes
**Status: ⚠️ PARTIAL COMPLIANCE**

**Issue:** Using in-memory session store in production

**Current Implementation:**
```typescript
app.use(session({
  secret: config.auth.sessionSecret,
  resave: false,
  saveUninitialized: false,
  // WARNING: Using default MemoryStore
}));
```

**Warning Logged:**
```typescript
if (config.nodeEnv === 'production') {
  logger.warn('Using memory-based session store. For production, configure a persistent session store (Redis, MongoDB, etc.)');
}
```

**Recommendations:**
1. **For production, use Redis for session storage:**
   ```bash
   npm install connect-redis redis
   ```
   ```typescript
   import RedisStore from 'connect-redis';
   import { createClient } from 'redis';
   
   const redisClient = createClient({ url: process.env.REDIS_URL });
   
   app.use(session({
     store: new RedisStore({ client: redisClient }),
     secret: config.auth.sessionSecret,
     // ...
   }));
   ```

2. **Add Redis to docker-compose.yml:**
   ```yaml
   redis:
     image: redis:7-alpine
     restart: unless-stopped
     volumes:
       - redis_data:/data
   ```

3. **Environment variables needed:**
   ```env
   REDIS_URL=redis://redis:6379
   ```

**Current Impact:**
- Sessions lost on server restart
- Cannot scale horizontally (sticky sessions required)
- Not suitable for multi-instance deployments

### VIII. Concurrency
**Status: ⚠️ PARTIAL COMPLIANCE**

**Current State:**
- Single Node.js process per container
- Socket.io handles concurrent connections
- Can scale by running multiple containers
- No built-in clustering

**Recommendations for Horizontal Scaling:**
1. **Add Redis adapter for Socket.io:**
   ```typescript
   import { createAdapter } from '@socket.io/redis-adapter';
   
   io.adapter(createAdapter(pubClient, subClient));
   ```

2. **Load balancer configuration needed:**
   - Sticky sessions for WebSocket connections
   - Or use Redis adapter to sync across instances

3. **Current docker-compose.yml supports scaling:**
   ```bash
   docker-compose up --scale backend=3
   ```
   But requires Redis for session/socket sync.

### XI. Logs
**Status: ⚠️ NEEDS IMPROVEMENT**

**Issues Found:**
- 35+ instances of `console.log/error/warn` instead of structured logger
- Custom logger implemented but not used consistently

**Files with console usage:**
- `backend/src/routes/repository.routes.ts` (3 instances)
- `backend/src/routes/auth.routes.ts` (1 instance)
- `backend/src/services/github.service.ts` (15 instances)
- `backend/src/services/notification.service.ts` (2 instances)
- `backend/src/services/scheduler.service.ts` (7 instances)
- `backend/src/middleware/errorHandler.ts` (1 instance)
- `backend/src/storage/index.ts` (2 instances)

**Recommendation:** Replace all console statements with the logger utility.

## 📝 Summary

| Factor | Status | Priority |
|--------|--------|----------|
| I. Codebase | ✅ Compliant | - |
| II. Dependencies | ✅ Compliant | - |
| III. Config | ✅ Compliant | - |
| IV. Backing services | ✅ Compliant | - |
| V. Build, release, run | ✅ Compliant | - |
| VI. Processes | ⚠️ Partial | **HIGH** |
| VII. Port binding | ✅ Compliant | - |
| VIII. Concurrency | ⚠️ Partial | **MEDIUM** |
| IX. Disposability | ✅ Compliant | - |
| X. Dev/prod parity | ✅ Compliant | - |
| XI. Logs | ⚠️ Needs work | **MEDIUM** |
| XII. Admin processes | ✅ Compliant | - |

**Overall Compliance: 8/12 Fully Compliant, 3/12 Partial, 1/12 Needs Work**

## 🔧 Immediate Action Items

1. **HIGH Priority:** Add Redis for session storage in production
2. **MEDIUM Priority:** Replace all console.log statements with structured logger
3. **MEDIUM Priority:** Add Redis adapter for Socket.io horizontal scaling
4. **LOW Priority:** Document scaling configuration in production guide

## 📚 Additional Resources

- [12-Factor App Methodology](https://12factor.net/)
- [Express Session Best Practices](https://github.com/expressjs/session#compatible-session-stores)
- [Socket.io Adapter Documentation](https://socket.io/docs/v4/redis-adapter/)

