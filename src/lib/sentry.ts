let sentryInitialized = false;

export function initRendererSentry(): void {
  const dsn = (window as any).__SENTRY_DSN__ || '';
  if (!dsn) return;

  try {
    const Sentry = require('@sentry/electron/renderer');
    Sentry.init({
      dsn,
      environment:
        (window as any).electronAPI?.getSystemHealth
          ? 'production'
          : 'development',
      tracesSampleRate: 0.2,
    });
    sentryInitialized = true;
  } catch {
    // Sentry not available
  }
}

export function captureClientError(error: Error, context?: Record<string, any>): void {
  if (!sentryInitialized) return;
  try {
    const Sentry = require('@sentry/electron/renderer');
    Sentry.captureException(error, { extra: context });
  } catch {}
}
