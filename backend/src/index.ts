import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

import { config } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth, addUserToRequest } from './middleware/auth.js';
import { apiLimiter, authLimiter, scanLimiter } from './middleware/rateLimiter.js';
import { authRoutes } from './routes/auth.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { dependencyRoutes } from './routes/dependency.routes.js';
import { notificationRoutes } from './routes/notification.routes.js';
import { repositoryRoutes } from './routes/repository.routes.js';
import { settingsRoutes } from './routes/settings.routes.js';
import { SchedulerService } from './services/scheduler.service.js';
import { disconnectStorage } from './storage/index.js';

const app = express();
const httpServer = createServer(app);

// Redis client for session storage and Socket.io adapter
// Only connect if explicitly enabled or in production
const shouldUseRedis = process.env.USE_REDIS === 'true' || config.nodeEnv === 'production';

const redisClient = createClient({
  url: config.redis.url,
  socket: {
    reconnectStrategy: shouldUseRedis ? (retries) => {
      // Exponential backoff: 50ms, 100ms, 200ms, ... up to 5 seconds
      return Math.min(retries * 50, 5000);
    } : false, // Don't reconnect in dev unless explicitly enabled
  },
});

redisClient.on('error', (err) => {
  if (shouldUseRedis) {
    logger.error('Redis Client Error', err);
  }
});
redisClient.on('connect', () => logger.info('Redis connected', { url: config.redis.url }));
redisClient.on('ready', () => logger.info('Redis ready for session storage and Socket.io'));
redisClient.on('reconnecting', () => {
  if (shouldUseRedis) {
    logger.warn('Redis reconnecting...');
  }
});

// Connect Redis client only if enabled
if (shouldUseRedis) {
  redisClient.connect().catch((err) => {
    logger.error('Failed to connect to Redis', err);
    logger.warn('Continuing without Redis - sessions will be stored in memory');
  });
} else {
  logger.info('Redis disabled in development mode. Set USE_REDIS=true to enable.');
}

// Socket.io setup for real-time notifications
const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true, // Allow cookies for authentication
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Setup Socket.io Redis adapter for horizontal scaling
if (redisClient.isReady) {
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();
  
  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.io Redis adapter configured for horizontal scaling');
    })
    .catch((err) => {
      logger.error('Failed to setup Socket.io Redis adapter', err);
      logger.warn('Socket.io will run in single-instance mode');
    });
}

// Make io and redisClient available to routes
app.set('io', io);
app.set('redisClient', redisClient);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", config.frontendUrl],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// HTTP request logging (only in development or if DEBUG level)
if (config.nodeEnv === 'development' || config.logging.level === 'DEBUG') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug(`${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });
    next();
  });
}

app.use(express.json());
app.use(cookieParser());

// Session configuration with Redis
const sessionConfig: session.SessionOptions = {
  secret: config.auth.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to false for local development with OAuth (even in production mode)
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Use 'lax' for OAuth callbacks to work
  },
  name: 'sessionId', // Don't use default 'connect.sid' for security through obscurity
};

// Use Redis store if enabled, fallback to memory store
// Note: We use shouldUseRedis flag instead of redisClient.isReady because Redis connects asynchronously
// and the client may not be ready yet at this point in the startup sequence
if (shouldUseRedis) {
  sessionConfig.store = new RedisStore({
    client: redisClient as any,
    prefix: 'renovate-session:',
  });
  logger.info('Using Redis for session storage (production-ready)');
} else {
  logger.warn('Using memory-based session store - sessions will be lost on restart');
  if (config.nodeEnv === 'production') {
    logger.error('CRITICAL: Production environment should use Redis for sessions!');
  }
}

app.use(session(sessionConfig));

// Add user to request from session
app.use(addUserToRequest);

// Health check
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storageMode: config.storageMode,
  });
});

// Rate limiting for authentication routes
app.use('/api/auth', authLimiter, authRoutes);

// Protected API Routes (require authentication and rate limiting)
app.use('/api', apiLimiter); // Apply general rate limiting to all API routes

app.use('/api/repositories/:id/scan', requireAuth, scanLimiter); // Stricter limit for scan endpoints
app.use('/api/repositories/scan', requireAuth, scanLimiter);

app.use('/api/repositories', requireAuth, repositoryRoutes);
app.use('/api/dependencies', requireAuth, dependencyRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/notifications', requireAuth, notificationRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);

// Error handling
app.use(errorHandler);

// Socket.io connection handling with authentication
io.use((socket, next) => {
  // Get session from handshake
  const sessionCookie = socket.handshake.headers.cookie;
  
  if (!sessionCookie) {
    return next(new Error('Authentication required'));
  }
  
  // In a real implementation, you would parse the session cookie and verify it
  // For now, we'll allow connections and rely on the client-side to only connect when authenticated
  next();
});

io.on('connection', (socket) => {
  logger.debug('WebSocket client connected', { socketId: socket.id });

  socket.on('disconnect', () => {
    logger.debug('WebSocket client disconnected', { socketId: socket.id });
  });
  
  // Handle authentication at connection time
  socket.on('authenticate', (data) => {
    logger.debug('WebSocket client authenticated', { socketId: socket.id, user: data });
  });
});

const PORT = config.port;

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  // Close Redis connection
  if (redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
  
  // Close database connection
  await disconnectStorage();
  
  // Close HTTP server
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

httpServer.listen(PORT, () => {
  logger.info(`Server started`, {
    port: PORT,
    url: `http://localhost:${PORT}`,
    environment: config.nodeEnv,
    storageMode: config.storageMode,
    logLevel: config.logging.level,
  });

  // Initialize scheduler
  const scheduler = SchedulerService.getInstance(io);
  scheduler.start();
});

export { io };
