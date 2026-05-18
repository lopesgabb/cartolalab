'use client';

import type { Clube } from '@/types/cartola';
import { POSICAO_NAMES, type PosicaoId } from '@/types/cartola';
import { POS_COLORS } from '@/lib/constants';

export interface TeamStats {
  clube: Clube;
  totalPontos: number;
  totalJogadores: number;
  porPosicao: Record<number, { media: number; total: number; count: number }>;
  mediaGeral: number;
}

export default function TimesClient({ teamStats }: { teamStats: TeamStats[] }) {
  return (
    <div className="container-max py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold gradient-text">
          Estatísticas de Times
        </h1>
        <p className="text-[var(--color-text-dim)] text-sm mt-1">
          Média de pontuação por posição — {teamStats.length} clubes
        </p>
      </div>

      <div className="table-pro-container">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-glass-border)]">
                <th className="table-header text-left pl-4 w-10">#</th>
                <th className="table-header text-left min-w-[180px]">Time</th>
                <th className="table-header active text-right">Média Geral</th>
                <th className="table-header text-right">Jogadores</th>
                {[1, 2, 3, 4, 5, 6].map((posId) => (
                  <th key={posId} className="table-header text-right" style={{ color: POS_COLORS[posId] }}>
                    {POSICAO_NAMES[posId as PosicaoId]?.split(' ')[0]?.substring(0, 3).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamStats.map((ts, i) => (
                <tr key={ts.clube.id} className="interactive-row border-b border-white/[0.03]">
                  <td className="table-cell pl-4 text-[var(--color-text-dim)] font-bold text-xs">
                    {i + 1}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {ts.clube.escudos?.['30x30'] && (
                        <img src={ts.clube.escudos['30x30']} alt={ts.clube.abreviacao} width={24} height={24} className="rounded" />
                      )}
                      <div>
                        <div className="font-semibold text-[0.85rem]">{ts.clube.nome_fantasia}</div>
                        <div className="text-[0.7rem] text-[var(--color-text-dim)]">{ts.clube.abreviacao}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`table-cell text-right font-bold ${ts.mediaGeral > 3 ? 'text-[var(--color-positive)]' : ts.mediaGeral > 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-negative)]'}`}>
                    {ts.mediaGeral.toFixed(2)}
                  </td>
                  <td className="table-cell text-right text-[var(--color-text-dim)]">
                    {ts.totalJogadores}
                  </td>
                  {[1, 2, 3, 4, 5, 6].map((posId) => {
                    const pos = ts.porPosicao[posId];
                    return (
                      <td key={posId} className="table-cell text-right">
                        {pos ? (
                          <div>
                            <div className={`font-semibold text-[0.85rem] ${pos.media > 4 ? 'text-[var(--color-positive)]' : 'text-[var(--color-text-secondary)]'}`}>
                              {pos.media.toFixed(2)}
                            </div>
                            <div className="text-[0.65rem] text-[var(--color-text-dim)]">
                              {pos.count}j
                            </div>
                          </div>
                        ) : (
                          <span className="text-[var(--color-text-dim)] text-[0.8rem]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
