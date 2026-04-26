'use client';

export default function TimesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
      <div className="card" style={{ borderColor: 'var(--color-negative)', padding: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--color-negative)' }}>
          ⚠️ Erro ao carregar times
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          Não conseguimos buscar as estatísticas dos times. Tente novamente em alguns instantes.
        </p>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem', marginBottom: '1.5rem', fontFamily: 'monospace' }}>
          {error.message}
        </p>
        <button className="btn-primary" onClick={() => reset()}>
          Tentar Novamente
        </button>
      </div>
    </div>
  );
}
