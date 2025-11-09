import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Filtering
  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Sentry server error (not sent in dev):', hint.originalException || hint.syntheticException);
      return null;
    }

    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
    }

    // Redact API keys and secrets
    if (event.message) {
      event.message = event.message
        .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]')
        .replace(/Bearer\s+[a-zA-Z0-9_-]+/g, 'Bearer [REDACTED]');
    }

    // Redact from extra data
    if (event.extra) {
      const sensitiveKeys = ['apiKey', 'api_key', 'token', 'secret', 'password'];
      Object.keys(event.extra).forEach(key => {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          event.extra![key] = '[REDACTED]';
        }
      });
    }

    return event;
  },

  // Ignore common server errors
  ignoreErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNRESET',
  ],
});
