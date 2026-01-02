import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replay (optional - records user sessions for debugging)
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Filtering
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry error (not sent in dev):', hint.originalException || hint.syntheticException);
      return null;
    }

    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
    }

    // Redact API keys from error messages
    if (event.message) {
      event.message = event.message.replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]');
    }

    return event;
  },

  // Ignore common browser errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
    'Load failed',
    'Failed to fetch',
  ],
});
