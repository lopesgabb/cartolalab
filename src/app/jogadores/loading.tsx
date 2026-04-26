export default function JogadoresLoading() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Title skeleton */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ width: '240px', height: '28px', background: 'var(--color-bg-hover)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div style={{ width: '320px', height: '14px', background: 'var(--color-bg-hover)', borderRadius: '4px', marginTop: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>

      {/* Filter chips skeleton */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} style={{ width: `${60 + i * 10}px`, height: '34px', background: 'var(--color-bg-hover)', borderRadius: '999px', animation: 'pulse 1.5s ease-in-out infinite' }} />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 0.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: '0.5rem', borderBottom: '2px solid var(--color-border)' }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ height: '12px', background: 'var(--color-bg-hover)', borderRadius: '3px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} style={{ padding: '0.75rem 0.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', opacity: 1 - i * 0.05 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-bg-hover)', animation: 'pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
              <div style={{ width: `${80 + Math.random() * 60}px`, height: '14px', background: 'var(--color-bg-hover)', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} style={{ height: '14px', background: 'var(--color-bg-hover)', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
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
