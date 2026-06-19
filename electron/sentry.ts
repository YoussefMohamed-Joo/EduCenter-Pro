import { app } from 'electron';

let sentryInitialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN || '';
  if (!dsn) {
    console.log('[Sentry] No DSN configured — error tracking disabled');
    return;
  }

  try {
    const Sentry = require('@sentry/electron/main');
    Sentry.init({
      dsn,
      environment: app.isPackaged ? 'production' : 'development',
      release: `educenter-pro@${app.getVersion()}`,
      tracesSampleRate: 0.2,
    });
    sentryInitialized = true;
    console.log('[Sentry] Initialized successfully');
  } catch (err) {
    console.warn('[Sentry] Failed to initialize:', err);
  }
}

export function captureError(error: Error, context?: Record<string, any>): void {
  if (!sentryInitialized) return;
  try {
    const Sentry = require('@sentry/electron/main');
    Sentry.captureException(error, { extra: context });
  } catch {}
}

export function captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void {
  if (!sentryInitialized) return;
  try {
    const Sentry = require('@sentry/electron/main');
    Sentry.captureMessage(message, level);
  } catch {}
}
