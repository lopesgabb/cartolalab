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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 mb-12">
      {atletas.map((atleta) => {
        const delta = atleta.deltaMomento;
        return (
          <div key={atleta.atleta_id} className="glass-panel p-5 interactive-card cursor-default">
            <div className="flex items-center gap-2.5 mb-3.5">
              {atleta.clube?.escudos?.['30x30'] && (
                <img src={atleta.clube.escudos['30x30']} alt="" width={24} height={24} className="rounded" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[0.85rem] whitespace-nowrap overflow-hidden text-ellipsis">{atleta.apelido}</div>
                <div className="text-[0.7rem] text-[var(--color-text-dim)]">{atleta.clube?.nome_fantasia}</div>
              </div>
              <span 
                className={`rounded-full px-2 py-0.5 text-[0.7rem] font-extrabold border ${
                  delta > 0 
                    ? 'bg-[rgba(0,255,136,0.15)] text-[var(--color-positive)] border-[rgba(0,255,136,0.3)]' 
                    : 'bg-[rgba(255,77,106,0.15)] text-[var(--color-negative)] border-[rgba(255,77,106,0.3)]'
                }`}
              >
                {delta > 0 ? '+' : ''}{delta.toFixed(2)}
              </span>
            </div>
            <Sparkline data={toRunningAvg(atleta.lastRoundsHistory ?? [])} width={200} height={48} showDots={false} />
            <div className="flex justify-between mt-2.5 text-[0.7rem]">
              <span className="text-[var(--color-text-dim)]">
                Média: <strong className="text-[var(--color-text-primary)]">{atleta.mediaGeralPeriodo?.toFixed(2)}</strong>
              </span>
              <span className="text-[var(--color-positive)]">
                Momento: <strong>{atleta.indiceMomento?.toFixed(2)}</strong>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
