export default function Loading() {
  return (
    <div
      style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '1.5rem',
      }}
    >
      {/* Skeleton banner */}
      <div
        className="card"
        style={{
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <div
              style={{
                width: '80px',
                height: '12px',
                background: 'var(--color-bg-hover)',
                borderRadius: '4px',
                marginBottom: '0.5rem',
              }}
            />
            <div
              style={{
                width: '120px',
                height: '24px',
                background: 'var(--color-bg-hover)',
                borderRadius: '6px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        ))}
      </div>

      {/* Skeleton cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="card"
            style={{ height: '320px', padding: 0, overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '2px solid var(--color-border)',
              }}
            >
              <div
                style={{
                  width: '180px',
                  height: '16px',
                  background: 'var(--color-bg-hover)',
                  borderRadius: '4px',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
            {Array.from({ length: 5 }).map((_, j) => (
              <div
                key={j}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    background: 'var(--color-bg-hover)',
                    borderRadius: '4px',
                  }}
                />
                <div
                  style={{
                    width: '120px',
                    height: '14px',
                    background: 'var(--color-bg-hover)',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
                <div
                  style={{
                    marginLeft: 'auto',
                    width: '50px',
                    height: '14px',
                    background: 'var(--color-bg-hover)',
                    borderRadius: '4px',
                  }}
                />
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
