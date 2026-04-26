'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '4rem auto',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <div
        className="card"
        style={{
          borderColor: 'var(--color-negative)',
          padding: '2.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            marginBottom: '1rem',
            color: 'var(--color-negative)',
          }}
        >
          ⚠️ Algo deu errado
        </h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            fontSize: '0.9rem',
            marginBottom: '0.5rem',
          }}
        >
          Não foi possível carregar esta página. A API do Cartola pode estar fora do ar
          ou ocorreu um erro interno.
        </p>
        <p
          style={{
            color: 'var(--color-text-dim)',
            fontSize: '0.8rem',
            marginBottom: '1.5rem',
            fontFamily: 'monospace',
          }}
        >
          {error.message}
        </p>
        <button className="btn-primary" onClick={() => reset()}>
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
