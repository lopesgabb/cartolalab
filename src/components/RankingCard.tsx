'use client';

import type { AtletaEnriquecido } from '@/types/cartola';
import { POS_COLORS } from '@/lib/constants';


export default function RankingCard({
  title,
  atletas,
  metric,
  metricLabel,
}: {
  title: string;
  atletas: AtletaEnriquecido[];
  metric: string;
  metricLabel: string;
}) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '2px solid var(--color-border)',
          fontWeight: 700,
          fontSize: '0.9rem',
        }}
      >
        {title}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--color-bg-secondary)' }}>
              <th className="table-header" style={{ textAlign: 'left', paddingLeft: '1rem', width: '30px' }}>#</th>
              <th className="table-header" style={{ textAlign: 'left' }}>Jogador</th>
              <th className="table-header" style={{ textAlign: 'center' }}>Pos</th>
              <th className="table-header" style={{ textAlign: 'right' }}>Preço</th>
              <th className="table-header active" style={{ textAlign: 'right', paddingRight: '1rem' }}>{metricLabel}</th>
            </tr>
          </thead>
          <tbody>
            {atletas.map((a, i) => {
              const getMetricVal = (): number => {
                switch (metric) {
                  case 'custoBeneficio': return a.custoBeneficio;
                  case 'media_num': return a.media_num;
                  case 'pontos_num': return a.pontos_num;
                  case 'variacao_num': return a.variacao_num;
                  case 'mediaComposta': return a.mediaComposta || 0;
                  case 'previsaoIA': return a.previsaoIA || 0;
                  default: return 0;
                }
              };
              const val = getMetricVal();
              const isPositive = val > 0;
              return (
                <tr
                  key={a.atleta_id}
                  style={{ transition: 'background 0.15s' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td className="table-cell" style={{ paddingLeft: '1rem', color: 'var(--color-text-dim)', fontWeight: 700 }}>
                    {i + 1}
                  </td>
                  <td className="table-cell">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {a.clube?.escudos?.['30x30'] && (
                        <img
                          src={a.clube.escudos['30x30']}
                          alt={a.clube.abreviacao}
                          width={20}
                          height={20}
                          style={{ borderRadius: '4px' }}
                        />
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.apelido}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{a.clube?.apelido}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell" style={{ textAlign: 'center' }}>
                    <span
                      className="badge"
                      style={{
                        color: POS_COLORS[a.posicao_id] || 'var(--color-text-secondary)',
                        borderColor: POS_COLORS[a.posicao_id] || 'var(--color-border)',
                        background: `${POS_COLORS[a.posicao_id] || 'var(--color-border)'}15`,
                        fontSize: '0.65rem',
                      }}
                    >
                      {a.posicao?.abreviacao?.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
                    C$ {a.preco_num.toFixed(2)}
                  </td>
                  <td
                    className="table-cell"
                    style={{
                      textAlign: 'right',
                      paddingRight: '1rem',
                      fontWeight: 700,
                      color: isPositive ? 'var(--color-positive)' : 'var(--color-negative)',
                    }}
                  >
                    {typeof val === 'number' ? val.toFixed(2) : val}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
