import { app } from 'electron';
import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
  stack?: string;
}

const MAX_LOG_SIZE = 5 * 1024 * 1024;
const MAX_LOG_FILES = 5;

class Logger {
  private logDir: string;
  private currentLogPath: string;
  private stream: fs.WriteStream | null = null;
  private buffer: string[] = [];
  private bufferSize = 0;
  private readonly FLUSH_THRESHOLD = 1024 * 10;

  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    this.currentLogPath = path.join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    this.rotateLogs();
  }

  private rotateLogs(): void {
    const files = fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('app-'))
      .map(f => ({ name: f, time: fs.statSync(path.join(this.logDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (files.length > MAX_LOG_FILES) {
      files.slice(MAX_LOG_FILES).forEach(f => {
        fs.unlinkSync(path.join(this.logDir, f.name));
      });
    }

    if (fs.existsSync(this.currentLogPath) && fs.statSync(this.currentLogPath).size > MAX_LOG_SIZE) {
      const newName = this.currentLogPath.replace('.log', `-${Date.now()}.log`);
      fs.renameSync(this.currentLogPath, newName);
    }
  }

  private formatEntry(entry: LogEntry): string {
    return JSON.stringify(entry) + '\n';
  }

  private write(entry: LogEntry): void {
    const line = this.formatEntry(entry);
    this.buffer.push(line);
    this.bufferSize += line.length;

    if (this.bufferSize >= this.FLUSH_THRESHOLD) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;
    try {
      fs.appendFileSync(this.currentLogPath, this.buffer.join(''));
      this.buffer = [];
      this.bufferSize = 0;
    } catch (e) {
      console.error('Logger flush failed:', e);
    }
  }

  private log(level: LogLevel, module: string, message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data: data ? (data instanceof Error ? { message: data.message, stack: data.stack } : data) : undefined,
      stack: level === 'error' || level === 'critical' ? new Error().stack : undefined,
    };

    this.write(entry);

    if (level === 'error' || level === 'critical') {
      console.error(`[${level.toUpperCase()}] [${module}] ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`[${level.toUpperCase()}] [${module}] ${message}`, data || '');
    } else {
      console.log(`[${level.toUpperCase()}] [${module}] ${message}`, data || '');
    }
  }

  debug(module: string, message: string, data?: any) { this.log('debug', module, message, data); }
  info(module: string, message: string, data?: any) { this.log('info', module, message, data); }
  warn(module: string, message: string, data?: any) { this.log('warn', module, message, data); }
  error(module: string, message: string, data?: any) { this.log('error', module, message, data); }
  critical(module: string, message: string, data?: any) { this.log('critical', module, message, data); }

  getLogs(level?: LogLevel, limit = 100): LogEntry[] {
    try {
      if (!fs.existsSync(this.currentLogPath)) return [];
      const content = fs.readFileSync(this.currentLogPath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);
      const entries = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      const filtered = level ? entries.filter((e: LogEntry) => e.level === level) : entries;
      return filtered.slice(-limit);
    } catch {
      return [];
    }
  }

  getLogFiles(): string[] {
    return fs.readdirSync(this.logDir).filter(f => f.startsWith('app-'));
  }

  getLogDirectory(): string {
    return this.logDir;
  }

  destroy(): void {
    this.flush();
  }
}

let logger: Logger | null = null;

export function initLogger(): Logger {
  if (!logger) {
    logger = new Logger();
  }
  return logger;
}

export function getLogger(): Logger {
  if (!logger) {
    return initLogger();
  }
  return logger;
}
