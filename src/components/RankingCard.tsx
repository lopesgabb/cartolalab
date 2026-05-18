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
    <div className="glass-panel p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--color-glass-border)] font-bold text-[0.9rem] bg-white/[0.02]">
        {title}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--color-bg-secondary)]">
              <th className="table-header text-left pl-4 w-[30px]">#</th>
              <th className="table-header text-left">Jogador</th>
              <th className="table-header text-center">Pos</th>
              <th className="table-header text-right">Preço</th>
              <th className="table-header active text-right pr-4">{metricLabel}</th>
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
                <tr key={a.atleta_id} className="interactive-row">
                  <td className="table-cell pl-4 text-[var(--color-text-dim)] font-bold">
                    {i + 1}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      {a.clube?.escudos?.['30x30'] && (
                        <img
                          src={a.clube.escudos['30x30']}
                          alt={a.clube.abreviacao}
                          width={20}
                          height={20}
                          className="rounded"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-[0.85rem]">{a.apelido}</div>
                        <div className="text-[0.7rem] text-[var(--color-text-dim)]">{a.clube?.apelido}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-center">
                    <span
                      className="badge text-[0.65rem]"
                      style={{
                        color: POS_COLORS[a.posicao_id] || 'var(--color-text-secondary)',
                        borderColor: POS_COLORS[a.posicao_id] || 'var(--color-border)',
                        background: `${POS_COLORS[a.posicao_id] || 'var(--color-border)'}15`,
                      }}
                    >
                      {a.posicao?.abreviacao?.toUpperCase()}
                    </span>
                  </td>
                  <td className="table-cell text-right text-[var(--color-text-secondary)]">
                    C$ {a.preco_num.toFixed(2)}
                  </td>
                  <td
                    className={`table-cell text-right pr-4 font-bold ${isPositive ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}
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
