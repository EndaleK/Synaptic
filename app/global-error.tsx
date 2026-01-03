'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry using dynamic import to avoid SSR issues
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error)
    }).catch(() => {
      // Sentry not available, log to console
      console.error('Global error:', error)
    })
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong!</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            We&apos;ve been notified and are working on a fix.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              backgroundColor: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
