'use client';

import type { Clube } from '@/types/cartola';
import { POSICAO_NAMES, type PosicaoId } from '@/types/cartola';

export interface TeamStats {
  clube: Clube;
  totalPontos: number;
  totalJogadores: number;
  porPosicao: Record<number, { media: number; total: number; count: number }>;
  mediaGeral: number;
}

const POS_COLORS: Record<number, string> = {
  1: 'var(--color-goleiro)',
  2: 'var(--color-lateral)',
  3: 'var(--color-zagueiro)',
  4: 'var(--color-meia)',
  5: 'var(--color-atacante)',
  6: 'var(--color-tecnico)',
};

export default function TimesClient({ teamStats }: { teamStats: TeamStats[] }) {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="gradient-text">
          Estatísticas de Times
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Média de pontuação por posição — {teamStats.length} clubes
        </p>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)' }}>
                <th className="table-header" style={{ textAlign: 'left', paddingLeft: '1rem', width: '40px' }}>#</th>
                <th className="table-header" style={{ textAlign: 'left', minWidth: '180px' }}>Time</th>
                <th className="table-header active" style={{ textAlign: 'right' }}>Média Geral</th>
                <th className="table-header" style={{ textAlign: 'right' }}>Jogadores</th>
                {[1, 2, 3, 4, 5, 6].map((posId) => (
                  <th key={posId} className="table-header" style={{ textAlign: 'right', color: POS_COLORS[posId] }}>
                    {POSICAO_NAMES[posId as PosicaoId]?.split(' ')[0]?.substring(0, 3).toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamStats.map((ts, i) => (
                <tr
                  key={ts.clube.id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="table-cell" style={{ paddingLeft: '1rem', color: 'var(--color-text-dim)', fontWeight: 700, fontSize: '0.8rem' }}>
                    {i + 1}
                  </td>
                  <td className="table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {ts.clube.escudos?.['30x30'] && (
                        <img src={ts.clube.escudos['30x30']} alt={ts.clube.abreviacao} width={24} height={24} style={{ borderRadius: '4px' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{ts.clube.nome_fantasia}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{ts.clube.abreviacao}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell" style={{ textAlign: 'right', fontWeight: 700, color: ts.mediaGeral > 3 ? 'var(--color-positive)' : ts.mediaGeral > 0 ? 'var(--color-text-primary)' : 'var(--color-negative)' }}>
                    {ts.mediaGeral.toFixed(2)}
                  </td>
                  <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-text-dim)' }}>
                    {ts.totalJogadores}
                  </td>
                  {[1, 2, 3, 4, 5, 6].map((posId) => {
                    const pos = ts.porPosicao[posId];
                    return (
                      <td key={posId} className="table-cell" style={{ textAlign: 'right' }}>
                        {pos ? (
                          <div>
                            <div style={{ fontWeight: 600, color: pos.media > 4 ? 'var(--color-positive)' : 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                              {pos.media.toFixed(2)}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)' }}>
                              {pos.count}j
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>—</span>
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
