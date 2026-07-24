export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: any;
}

class LoggerService {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private formatEntry(level: LogLevel, moduleName: string, message: string, details?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      module: moduleName,
      message,
      details,
    };
  }

  info(moduleName: string, message: string, details?: any) {
    if (this.isDevelopment) {
      console.log(`[INFO] [${moduleName}] ${message}`, details ?? '');
    }
  }

  warn(moduleName: string, message: string, details?: any) {
    console.warn(`[WARN] [${moduleName}] ${message}`, details ?? '');
  }

  error(moduleName: string, message: string, details?: any) {
    console.error(`[ERROR] [${moduleName}] ${message}`, details ?? '');
  }

  security(moduleName: string, message: string, details?: any) {
    console.warn(`[SECURITY ALERT] [${moduleName}] ${message}`, details ?? '');
  }
}

export const logger = new LoggerService();
