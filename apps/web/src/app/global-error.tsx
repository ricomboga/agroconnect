'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex', minHeight: '100vh', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB',
          padding: '0 16px', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            width: '100%', maxWidth: 384, borderRadius: 12, border: '1px solid #E5E7EB',
            backgroundColor: '#fff', padding: 32, textAlign: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}>
            <h1 style={{ fontSize: 28, fontWeight: 600, color: '#111827' }}>Something went wrong</h1>
            <p style={{ marginTop: 8, fontSize: 22, color: '#6B7280' }}>
              {error.message || 'An unexpected error occurred.'}
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 24, width: '100%', borderRadius: 8, backgroundColor: '#16A34A',
                color: '#fff', fontWeight: 600, fontSize: 22, padding: '10px 16px',
                border: 'none', cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
