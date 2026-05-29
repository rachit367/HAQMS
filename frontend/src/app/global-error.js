'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <p style={{ color: '#64748b' }}>{error?.message || 'An unexpected error occurred.'}</p>
        <button onClick={reset} style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '8px', background: '#0d9488', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
