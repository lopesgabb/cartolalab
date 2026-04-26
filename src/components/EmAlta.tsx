'use client';

import type { AtletaEnriquecido } from '@/types/cartola';
import Sparkline from '@/components/Sparkline';

/** Converts raw round scores into cumulative averages per round */
function toRunningAvg(scores: number[]): number[] {
  let sum = 0;
  return scores.map((v, i) => { sum += v; return sum / (i + 1); });
}

interface EmAltaProps {
  atletas: (AtletaEnriquecido & { deltaMomento: number })[];
}

export default function EmAlta({ atletas }: EmAltaProps) {
  if (!atletas.length) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
      {atletas.map((atleta) => {
        const delta = atleta.deltaMomento;
        return (
          <div
            key={atleta.atleta_id}
            className="card"
            style={{ padding: '1rem', transition: 'transform 0.15s', cursor: 'default' }}
            onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.875rem' }}>
              {atleta.clube?.escudos?.['30x30'] && (
                <img src={atleta.clube.escudos['30x30']} alt="" width={24} height={24} style={{ borderRadius: '4px' }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{atleta.apelido}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{atleta.clube?.nome_fantasia}</div>
              </div>
              <span style={{
                background: delta > 0 ? 'rgba(0,255,136,0.15)' : 'rgba(255,77,106,0.15)',
                color: delta > 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                border: `1px solid ${delta > 0 ? 'rgba(0,255,136,0.3)' : 'rgba(255,77,106,0.3)'}`,
                borderRadius: '999px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 800,
              }}>
                {delta > 0 ? '+' : ''}{delta.toFixed(2)}
              </span>
            </div>
            <Sparkline data={toRunningAvg(atleta.lastRoundsHistory ?? [])} width={200} height={48} showDots={false} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.625rem', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--color-text-dim)' }}>
                Média: <strong style={{ color: 'var(--color-text-primary)' }}>{atleta.mediaGeralPeriodo?.toFixed(2)}</strong>
              </span>
              <span style={{ color: 'var(--color-positive)' }}>
                Momento: <strong>{atleta.indiceMomento?.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
