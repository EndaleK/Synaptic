'use client'

import { useEffect, useState } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Log to console first
    console.error('Global error:', error)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)

    // Log the error to Sentry using dynamic import to avoid SSR issues
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.captureException(error)
    }).catch(() => {
      // Sentry not available, already logged to console
    })
  }, [error])

  const handleRefresh = () => {
    window.location.reload()
  }

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
          fontFamily: 'system-ui, sans-serif',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{
            maxWidth: '400px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#fee2e2',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <svg width="32" height="32" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
              Something went wrong
            </h2>

            <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '14px' }}>
              An unexpected error occurred. Try refreshing the page or click below to retry.
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button
                onClick={() => reset()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Try again
              </button>
              <button
                onClick={handleRefresh}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Refresh
              </button>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {showDetails ? 'Hide' : 'Show'} details
            </button>

            {showDetails && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '8px',
                textAlign: 'left',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#6b7280',
                wordBreak: 'break-all',
                maxHeight: '100px',
                overflow: 'auto'
              }}>
                <strong>Error:</strong> {error.name || 'Unknown'}<br />
                <strong>Message:</strong> {error.message || 'No message'}<br />
                {error.digest && <><strong>Digest:</strong> {error.digest}</>}
              </div>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
