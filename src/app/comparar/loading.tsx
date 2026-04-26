export default function CompararLoading() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Title skeleton */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ width: '220px', height: '28px', background: 'var(--color-bg-hover)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '360px', height: '14px', background: 'var(--color-bg-hover)', borderRadius: '4px', marginTop: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>

      {/* Search bar skeleton */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1, height: '44px', background: 'var(--color-bg-hover)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '120px', height: '44px', background: 'var(--color-bg-hover)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>

      {/* Player comparison cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: '1.25rem' }}>
            {/* Player header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-bg-hover)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <div>
                <div style={{ width: '130px', height: '16px', background: 'var(--color-bg-hover)', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '80px', height: '12px', background: 'var(--color-bg-hover)', borderRadius: '4px', marginTop: '0.375rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            </div>
            {/* Stats rows */}
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ width: '80px', height: '12px', background: 'var(--color-bg-hover)', borderRadius: '3px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: '50px', height: '12px', background: 'var(--color-bg-hover)', borderRadius: '3px', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
