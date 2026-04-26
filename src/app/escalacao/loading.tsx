export default function EscalacaoLoading() {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ width: '280px', height: '28px', background: 'var(--color-bg-hover)', borderRadius: '6px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ width: '360px', height: '14px', background: 'var(--color-bg-hover)', borderRadius: '4px', marginTop: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <div style={{ width: '140px', height: '36px', background: 'var(--color-bg-hover)', borderRadius: '8px', animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>

      {/* Stats bar */}
      <div className="card" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', padding: '1.25rem 1.5rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div style={{ width: '80px', height: '10px', background: 'var(--color-bg-hover)', borderRadius: '3px', marginBottom: '0.5rem', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ width: '60px', height: '22px', background: 'var(--color-bg-hover)', borderRadius: '4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        ))}
      </div>

      {/* Formation slots skeleton */}
      {[1, 4, 3, 3].map((cols, rowIdx) => (
        <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.75rem', justifyItems: 'center', marginBottom: '1rem' }}>
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} style={{ width: '100%', height: '88px', background: 'var(--color-bg-hover)', borderRadius: '12px', border: '2px solid var(--color-border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ))}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
      `}</style>
    </div>
  );
}
