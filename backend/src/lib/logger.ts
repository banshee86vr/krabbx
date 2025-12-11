/**
 * Application Logger
 * 
 * Provides structured logging with severity levels and formatted output.
 * Supports different log levels for development and production environments.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
    this.level = this.parseLogLevel(process.env.LOG_LEVEL || 'INFO');
  }

  private parseLogLevel(level: string): LogLevel {
    const normalized = level.toUpperCase();
    switch (normalized) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
      case 'WARNING':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'NONE':
      case 'SILENT':
        return LogLevel.NONE;
      default:
        console.warn(`Unknown log level: ${level}, defaulting to INFO`);
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  private formatMessage(
    level: string,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = this.formatTimestamp();
    const prefix = `[${timestamp}] [${level}]`;

    if (context && Object.keys(context).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(context)}`;
    }

    return `${prefix} ${message}`;
  }

  private colorize(level: string, message: string): string {
    if (!this.isDevelopment) {
      return message;
    }

    // ANSI color codes
    const colors: Record<string, string> = {
      DEBUG: '\x1b[36m', // Cyan
      INFO: '\x1b[32m',  // Green
      WARN: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m', // Red
      RESET: '\x1b[0m',  // Reset
    };

    const color = colors[level] || colors.RESET;
    return `${color}${message}${colors.RESET}`;
  }

  /**
   * Log a debug message (lowest priority)
   * Use for detailed debugging information during development
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const formatted = this.formatMessage('DEBUG', message, context);
    console.debug(this.colorize('DEBUG', formatted));
  }

  /**
   * Log an info message (normal priority)
   * Use for general informational messages about application flow
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const formatted = this.formatMessage('INFO', message, context);
    console.log(this.colorize('INFO', formatted));
  }

  /**
   * Log a warning message (elevated priority)
   * Use for potentially harmful situations or deprecated usage
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const formatted = this.formatMessage('WARN', message, context);
    console.warn(this.colorize('WARN', formatted));
  }

  /**
   * Log an error message (highest priority)
   * Use for error conditions that should be investigated
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    let errorContext = { ...context };

    if (error instanceof Error) {
      errorContext = {
        ...errorContext,
        error: error.message,
        stack: error.stack,
      };
    } else if (error) {
      errorContext = {
        ...errorContext,
        error: String(error),
      };
    }

    const formatted = this.formatMessage('ERROR', message, errorContext);
    console.error(this.colorize('ERROR', formatted));
  }

  /**
   * Create a child logger with a specific context
   * Useful for module-specific logging
   */
  child(module: string): ModuleLogger {
    return new ModuleLogger(this, module);
  }

  /**
   * Set the log level dynamically at runtime
   */
  setLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      this.level = this.parseLogLevel(level);
    } else {
      this.level = level;
    }
    this.info(`Log level changed to ${LogLevel[this.level]}`);
  }

  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
}

/**
 * Module-specific logger that automatically includes module context
 */
class ModuleLogger {
  constructor(
    private logger: Logger,
    private module: string
  ) {}

  private addModuleContext(context?: LogContext): LogContext {
    return {
      module: this.module,
      ...context,
    };
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(message, this.addModuleContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(message, this.addModuleContext(context));
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(message, this.addModuleContext(context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.logger.error(message, error, this.addModuleContext(context));
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for use in modules
export default logger;

