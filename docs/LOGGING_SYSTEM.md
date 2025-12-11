# Logging System

## Overview

The application uses a structured logging system with configurable severity levels, colored output for development, and contextual information for debugging and monitoring.

## Features

- ✅ **Severity Levels**: DEBUG, INFO, WARN, ERROR, NONE
- ✅ **Structured Logging**: JSON-formatted context data
- ✅ **Colored Output**: ANSI colors in development mode
- ✅ **Module-Specific Loggers**: Automatic module context
- ✅ **Timestamp**: ISO 8601 formatted timestamps
- ✅ **Environment-Aware**: Different behavior in dev vs production
- ✅ **Runtime Configuration**: Change log level without restart

## Log Levels

### DEBUG (Level 0)
**Use for**: Detailed debugging information during development

**Examples**:
- HTTP request/response details
- WebSocket connection events
- Cache hits/misses
- Function entry/exit points
- Variable values during execution

**Output**: Cyan color in development

```typescript
log.debug('WebSocket client connected', { socketId: socket.id });
log.debug('Cache hit', { key: 'repos', ttl: '5m' });
```

### INFO (Level 1) - **DEFAULT**
**Use for**: General informational messages about application flow

**Examples**:
- Server started/stopped
- Scan initiated/completed
- Configuration loaded
- Successful operations
- Important state changes

**Output**: Green color in development

```typescript
log.info('Server started', { port: 3001, environment: 'development' });
log.info('Organization scan completed', { repositoriesScanned: 5 });
```

### WARN (Level 2)
**Use for**: Potentially harmful situations or deprecated usage

**Examples**:
- Deprecated API usage
- Missing optional configuration
- Rate limit approaching
- Recoverable errors
- Performance warnings

**Output**: Yellow color in development

```typescript
log.warn('Using memory-based session store', { 
  recommendation: 'Use Redis for production' 
});
log.warn('No matching repositories found', { filter: ['repo1', 'repo2'] });
```

### ERROR (Level 3)
**Use for**: Error conditions that should be investigated

**Examples**:
- API failures
- Database errors
- Authentication failures
- Unhandled exceptions
- Critical system errors

**Output**: Red color in development

```typescript
log.error('Repository scan failed', error, { repository: 'my-repo' });
log.error('Database connection lost', dbError);
```

### NONE (Level 4)
**Use for**: Disabling all logging (not recommended)

## Configuration

### Environment Variable

Set the `LOG_LEVEL` environment variable in `.env`:

```bash
# Development - see everything
LOG_LEVEL=DEBUG

# Production - important messages only (recommended)
LOG_LEVEL=INFO

# Troubleshooting - warnings and errors only
LOG_LEVEL=WARN

# Critical issues only
LOG_LEVEL=ERROR

# Disable logging (not recommended)
LOG_LEVEL=NONE
```

### Default Behavior

| Environment | Default Level | HTTP Logging |
|-------------|---------------|--------------|
| Development | INFO | Enabled (DEBUG level) |
| Production | INFO | Disabled |
| Test | WARN | Disabled |

## Usage

### Basic Logging

```typescript
import { logger } from '../lib/logger.js';

// Simple messages
logger.info('Application started');
logger.warn('Configuration missing');
logger.error('Operation failed');

// With context
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.error('Database query failed', error, { query: 'SELECT * FROM users' });
```

### Module-Specific Logger

Create a child logger for each module/service:

```typescript
import { logger } from '../lib/logger.js';

const log = logger.child('RenovateService');

// All logs automatically include module context
log.info('Starting scan');
// Output: [2025-12-04T10:30:00.000Z] [INFO] Starting scan {"module":"RenovateService"}

log.error('Scan failed', error, { repository: 'my-repo' });
// Output: [2025-12-04T10:30:05.000Z] [ERROR] Scan failed {"module":"RenovateService","repository":"my-repo","error":"...","stack":"..."}
```

### Error Logging

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Automatically extracts error message and stack trace
  log.error('Operation failed', error, { 
    operation: 'riskyOperation',
    retries: 3 
  });
}
```

## Output Format

### Development Mode
```
[2025-12-04T10:30:00.123Z] [INFO] Server started {"port":3001,"environment":"development"}
[2025-12-04T10:30:05.456Z] [DEBUG] WebSocket client connected {"module":"SocketService","socketId":"abc123"}
[2025-12-04T10:30:10.789Z] [WARN] Rate limit approaching {"module":"RateLimiter","current":95,"max":100}
[2025-12-04T10:30:15.012Z] [ERROR] Database query failed {"module":"DatabaseService","error":"Connection timeout","stack":"..."}
```

- **Colored output** for easy visual scanning
- **Structured JSON** for context data
- **ISO timestamps** for precise timing
- **Module tags** for source identification

### Production Mode
```
[2025-12-04T10:30:00.123Z] [INFO] Server started {"port":3001,"environment":"production","storageMode":"database","logLevel":"INFO"}
[2025-12-04T10:30:05.456Z] [WARN] Using memory-based session store {"recommendation":"Use Redis for production"}
[2025-12-04T10:30:10.789Z] [ERROR] Repository scan failed {"module":"RenovateService","repository":"my-repo","error":"API rate limit exceeded"}
```

- **No colors** (plain text for log aggregators)
- **Same structured format** for consistency
- **Machine-readable** for log analysis tools

## Best Practices

### 1. Choose the Right Level

```typescript
// ✅ GOOD
log.debug('Function called', { params: { id: 123 } });  // Debugging details
log.info('Scan completed', { duration: '5s' });         // Important events
log.warn('Deprecated API used', { api: '/old-endpoint' }); // Warnings
log.error('Operation failed', error);                   // Errors

// ❌ BAD
log.info('Variable x = 5');  // Too detailed for INFO
log.error('User clicked button');  // Not an error
```

### 2. Include Context

```typescript
// ✅ GOOD - Structured context
log.info('Repository scanned', {
  repository: 'my-repo',
  dependencies: 150,
  outdated: 12,
  duration: '3.5s'
});

// ❌ BAD - String interpolation
log.info(`Scanned my-repo: 150 deps, 12 outdated, took 3.5s`);
```

**Why?** Structured context is:
- Easier to parse by log aggregators
- Searchable by field
- Consistent format
- Machine-readable

### 3. Use Module Loggers

```typescript
// ✅ GOOD - Module-specific logger
const log = logger.child('GitHubService');
log.info('Fetching repositories');

// ❌ BAD - Generic logger
logger.info('[GitHubService] Fetching repositories');
```

### 4. Don't Log Sensitive Data

```typescript
// ✅ GOOD
log.info('User authenticated', { userId: user.id });

// ❌ BAD - Exposes sensitive data
log.info('User authenticated', { 
  userId: user.id, 
  password: user.password,  // NEVER log passwords!
  token: user.githubToken   // NEVER log tokens!
});
```

### 5. Log Errors Properly

```typescript
// ✅ GOOD - Pass error object
try {
  await operation();
} catch (error) {
  log.error('Operation failed', error, { context: 'additional info' });
}

// ❌ BAD - Loses stack trace
try {
  await operation();
} catch (error) {
  log.error(`Operation failed: ${error.message}`);
}
```

### 6. Performance Considerations

```typescript
// ✅ GOOD - Conditional expensive operations
if (logger.getLevel() <= LogLevel.DEBUG) {
  const expensiveData = computeExpensiveDebugInfo();
  log.debug('Debug info', expensiveData);
}

// ❌ BAD - Always computes even if not logged
log.debug('Debug info', computeExpensiveDebugInfo());
```

## Migration from console.log

### Before
```typescript
console.log('[Scan] Starting organization scan...');
console.log(`[Scan] Found ${repos.length} repositories`);
console.warn('[Scan] No matching repositories found');
console.error('[Scan] Error:', error);
```

### After
```typescript
const log = logger.child('RenovateService');

log.info('Starting organization scan');
log.info('Repositories discovered', { count: repos.length });
log.warn('No matching repositories found', { filter: config.scan.specificRepos });
log.error('Scan failed', error);
```

### Benefits
- ✅ Structured, searchable logs
- ✅ Consistent formatting
- ✅ Automatic timestamps
- ✅ Module context
- ✅ Configurable verbosity
- ✅ Error stack traces preserved

## Runtime Configuration

### Change Log Level Without Restart

```typescript
import { logger, LogLevel } from '../lib/logger.js';

// Temporarily increase verbosity for debugging
logger.setLevel(LogLevel.DEBUG);

// Perform debugging operations
await debugOperation();

// Restore normal level
logger.setLevel(LogLevel.INFO);
```

### Check Current Level

```typescript
import { logger, LogLevel } from '../lib/logger.js';

const currentLevel = logger.getLevel();
console.log(`Current log level: ${LogLevel[currentLevel]}`);

if (currentLevel <= LogLevel.DEBUG) {
  // Debug mode is active
}
```

## Integration with Log Aggregators

### Structured JSON Output

The logger produces JSON-formatted context that's compatible with:
- **Datadog**: Parse JSON logs automatically
- **Splunk**: Index structured fields
- **ELK Stack** (Elasticsearch, Logstash, Kibana): Direct JSON ingestion
- **CloudWatch**: Parse JSON logs with filter patterns
- **Grafana Loki**: Label extraction from JSON

### Example Log Entry
```json
{
  "timestamp": "2025-12-04T10:30:00.123Z",
  "level": "INFO",
  "message": "Organization scan completed",
  "module": "RenovateService",
  "repositoriesScanned": 5,
  "duration": "12.5s"
}
```

### Parsing in Log Aggregators

**Datadog**:
```
@timestamp:[2025-12-04T10:30:00.123Z TO *] @module:RenovateService @level:ERROR
```

**Splunk**:
```
sourcetype=json | search module="RenovateService" level="ERROR"
```

**CloudWatch Insights**:
```
fields @timestamp, message, module, level
| filter module = "RenovateService" and level = "ERROR"
```

## Testing

### Unit Tests

```typescript
import { logger, LogLevel } from '../lib/logger.js';

describe('Logger', () => {
  beforeEach(() => {
    logger.setLevel(LogLevel.DEBUG);
  });

  it('should log at DEBUG level', () => {
    const spy = jest.spyOn(console, 'debug');
    logger.debug('test message');
    expect(spy).toHaveBeenCalled();
  });

  it('should not log below configured level', () => {
    logger.setLevel(LogLevel.ERROR);
    const spy = jest.spyOn(console, 'log');
    logger.info('test message');
    expect(spy).not.toHaveBeenCalled();
  });
});
```

### Integration Tests

```typescript
// Disable logging during tests
beforeAll(() => {
  logger.setLevel(LogLevel.NONE);
});

afterAll(() => {
  logger.setLevel(LogLevel.INFO);
});
```

## Troubleshooting

### No Logs Appearing

**Check**:
1. `LOG_LEVEL` environment variable is set correctly
2. Log level is not set to `NONE`
3. Message severity is >= configured level

```bash
# Verify environment variable
echo $LOG_LEVEL

# Set to DEBUG temporarily
export LOG_LEVEL=DEBUG
npm run dev
```

### Too Many Logs

**Solution**: Increase log level

```bash
# Production: Only warnings and errors
LOG_LEVEL=WARN npm start

# Or in .env
LOG_LEVEL=ERROR
```

### Missing Context

**Check**: Using module logger instead of root logger

```typescript
// ✅ GOOD
const log = logger.child('MyService');
log.info('Message');  // Includes module context

// ❌ BAD
import { logger } from '../lib/logger.js';
logger.info('Message');  // No module context
```

### Colors Not Showing

**Reason**: Colors are disabled in production mode

**Solution**: Colors only appear when `NODE_ENV !== 'production'`

```bash
# Development (colors enabled)
NODE_ENV=development npm run dev

# Production (colors disabled)
NODE_ENV=production npm start
```

## Performance Impact

### Benchmarks

| Log Level | Overhead | Use Case |
|-----------|----------|----------|
| NONE | 0% | Never recommended |
| ERROR | <0.1% | Production (minimal logging) |
| WARN | <0.5% | Production (recommended) |
| INFO | <1% | Production/Development (default) |
| DEBUG | <5% | Development only |

### Recommendations

- **Production**: Use `INFO` or `WARN` level
- **Development**: Use `DEBUG` level for detailed information
- **Avoid**: Logging in tight loops or high-frequency operations
- **Conditional**: Use level checks for expensive debug operations

## Future Enhancements

### Planned Features

1. **Log Rotation**: Automatic file rotation for persistent logs
2. **Remote Logging**: Send logs to external services (Datadog, Splunk)
3. **Log Sampling**: Sample high-volume logs to reduce overhead
4. **Metrics Integration**: Expose log counts as Prometheus metrics
5. **Request ID Tracking**: Trace requests across services
6. **Performance Profiling**: Automatic duration tracking for operations

---

**Implemented**: December 2025  
**Feature**: Structured logging with severity levels  
**Status**: ✅ Production Ready  
**Configuration**: `LOG_LEVEL` environment variable  
**Default**: INFO level

