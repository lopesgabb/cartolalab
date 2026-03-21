'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { AtletaEnriquecido, Clube, Scout } from '@/types/cartola';
import type { Timeframe } from '@/lib/indicators-engine';
import { STATUS_COLORS, POSICAO_NAMES, type PosicaoId } from '@/types/cartola';
import { filterAtletas, sortAtletas, calcularScoutPoints } from '@/lib/indicators';
import { ChevronDown, ChevronUp, Search, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface JogadoresClientProps {
  atletas: AtletaEnriquecido[];
  clubes: Record<string, Clube>;
  currentPeriod: Timeframe;
}

const POS_COLORS: Record<number, string> = {
  1: 'var(--color-goleiro)',
  2: 'var(--color-lateral)',
  3: 'var(--color-zagueiro)',
  4: 'var(--color-meia)',
  5: 'var(--color-atacante)',
  6: 'var(--color-tecnico)',
};

type SortField = 'media_num' | 'pontos_num' | 'preco_num' | 'variacao_num' | 'custoBeneficio' | 'jogos_num' | 'mediaGeralPeriodo' | 'mediaCasaPeriodo' | 'mediaForaPeriodo' | 'mediaConquistada' | 'desvioPadraoConquistada' | 'mediaCedida' | 'desvioPadraoCedida' | 'somaConqCed' | 'mccPersonalizado' | 'mediaComposta';

export default function JogadoresClient({ atletas, clubes, currentPeriod }: JogadoresClientProps) {
  const [search, setSearch] = useState('');
  const [posicaoFilter, setPosicaoFilter] = useState<number | null>(null);
  const [clubeFilter, setClubeFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('media_num');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [minGames, setMinGames] = useState(1);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const handlePeriodChange = (newPeriod: Timeframe) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('period', newPeriod);
    router.push(`${pathname}?${params.toString()}`);
  };

  const filtered = useMemo(() => {
    const result = filterAtletas(atletas, {
      posicaoId: posicaoFilter || undefined,
      clubeId: clubeFilter || undefined,
      statusId: statusFilter || undefined,
      jogosMin: minGames,
      search: search || undefined,
    });
    return sortAtletas(result, sortField, sortDir);
  }, [atletas, search, posicaoFilter, clubeFilter, statusFilter, sortField, sortDir, minGames]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
  };

  const clubeList = useMemo(() => {
    return Object.values(clubes).sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia));
  }, [clubes]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="gradient-text">
          Estatísticas de Jogadores
        </h1>
        <p style={{ color: 'var(--color-text-dim)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          {filtered.length} jogadores encontrados
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Period Toggle */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', alignSelf: 'center', fontWeight: 600, marginRight: '0.5rem' }}>Período Analisado:</span>
          {(['3', '5', 'all'] as Timeframe[]).map(p => (
             <button
                key={p}
                className={`filter-chip ${currentPeriod === p ? 'active' : ''}`}
                onClick={() => handlePeriodChange(p)}
             >
                {p === 'all' ? 'Todo o Campeonato' : `Últimos ${p} Jogos`}
             </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-dim)' }} />
          <input
            className="input-field"
            placeholder="Buscar jogador ou time..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {/* Position filter */}
          {[1, 2, 3, 4, 5, 6].map((pos) => (
            <button
              key={pos}
              className={`filter-chip ${posicaoFilter === pos ? 'active' : ''}`}
              onClick={() => setPosicaoFilter(posicaoFilter === pos ? null : pos)}
              style={posicaoFilter === pos ? { borderColor: POS_COLORS[pos], color: POS_COLORS[pos] } : {}}
            >
              {POSICAO_NAMES[pos as PosicaoId]}
            </button>
          ))}

          <span style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem' }} />

          {/* Status filter */}
          <button
            className={`filter-chip ${statusFilter === 7 ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 7 ? null : 7)}
          >
            ✅ Provável
          </button>
          <button
            className={`filter-chip ${statusFilter === 2 ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 2 ? null : 2)}
          >
            ❓ Dúvida
          </button>

          <span style={{ width: '1px', background: 'var(--color-border)', margin: '0 0.25rem' }} />

          {/* Club filter */}
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: '160px', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
            value={clubeFilter || ''}
            onChange={(e) => setClubeFilter(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todos os Clubes</option>
            {clubeList.map((c) => (
              <option key={c.id} value={c.id}>{c.nome_fantasia}</option>
            ))}
          </select>

          {/* Min games */}
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: '120px', padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
            value={minGames}
            onChange={(e) => setMinGames(Number(e.target.value))}
          >
            <option value={0}>Min 0 jogos</option>
            <option value={1}>Min 1 jogo</option>
            <option value={2}>Min 2 jogos</option>
            <option value={3}>Min 3 jogos</option>
            <option value={5}>Min 5 jogos</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1600px' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)' }}>
                <th className="table-header" style={{ textAlign: 'left', paddingLeft: '1rem', width: '40px' }}>#</th>
                <th className="table-header" style={{ textAlign: 'left', minWidth: '180px' }}>Jogador</th>
                <th className="table-header" style={{ textAlign: 'center' }}>Pos</th>
                <th className="table-header" style={{ textAlign: 'center' }}>Status</th>
                <th
                  className={`table-header ${sortField === 'jogos_num' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('jogos_num')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    J <SortIcon field="jogos_num" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'pontos_num' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('pontos_num')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    Últ. Pts <SortIcon field="pontos_num" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'media_num' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('media_num')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Média Oficial Cartola">
                    Média <SortIcon field="media_num" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaGeralPeriodo' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaGeralPeriodo')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-text-primary)' }} title="Média Geral no Período Selecionado">
                    MG(p) <SortIcon field="mediaGeralPeriodo" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaCasaPeriodo' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaCasaPeriodo')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Média em Casa no Período">
                    M.Casa <SortIcon field="mediaCasaPeriodo" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaForaPeriodo' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaForaPeriodo')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Média Fora no Período">
                    M.Fora <SortIcon field="mediaForaPeriodo" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaConquistada' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaConquistada')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-positive)' }} title="Média de pontos conquistados pelo TIME nesta posição no Período (Mando real da próx rodada)">
                    M.CONQ <SortIcon field="mediaConquistada" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'desvioPadraoConquistada' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('desvioPadraoConquistada')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-text-secondary)' }} title="Desvio Padrão da M.CONQ, indicando variabilidade">
                    DP.C <SortIcon field="desvioPadraoConquistada" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaCedida' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaCedida')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-negative)' }} title="Média de pontos cedidos pelo ADVERSÁRIO para esta posição no Período">
                    M.CED <SortIcon field="mediaCedida" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'desvioPadraoCedida' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('desvioPadraoCedida')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-text-secondary)' }} title="Desvio Padrão da M.CED, indicando previsibilidade">
                    DP.E <SortIcon field="desvioPadraoCedida" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'somaConqCed' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('somaConqCed')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Soma (M.CONQ + M.CED)">
                    SOMA <SortIcon field="somaConqCed" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mccPersonalizado' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mccPersonalizado')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-goleiro)' }} title="Média entre a Média do Jogador (Casa/Fora) e M.CED">
                    MCC <SortIcon field="mccPersonalizado" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaComposta' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaComposta')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-text-primary)' }} title="Média Composta (M.CONQ + M.CED + MC/MF) / 3">
                    M.COMP <SortIcon field="mediaComposta" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'preco_num' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('preco_num')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    Preço <SortIcon field="preco_num" />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'variacao_num' ? 'active' : ''}`}
                  style={{ textAlign: 'right', paddingRight: '1rem', cursor: 'pointer' }}
                  onClick={() => handleSort('variacao_num')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    Var <SortIcon field="variacao_num" />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map((a, i) => (
                <PlayerRow key={a.atleta_id} atleta={a} index={i} isExpanded={expandedId === a.atleta_id} onToggle={() => setExpandedId(expandedId === a.atleta_id ? null : a.atleta_id)} />
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-dim)', fontSize: '0.85rem', borderTop: '1px solid var(--color-border)' }}>
            Mostrando 100 de {filtered.length} jogadores. Use os filtros para refinar.
          </div>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ atleta: a, index, isExpanded, onToggle }: { atleta: AtletaEnriquecido; index: number; isExpanded: boolean; onToggle: () => void }) {
  const variacao = a.variacao_num;
  const varColor = variacao > 0 ? 'var(--color-positive)' : variacao < 0 ? 'var(--color-negative)' : 'var(--color-text-dim)';
  const VarIcon = variacao > 0 ? TrendingUp : variacao < 0 ? TrendingDown : Minus;
  const statusColor = STATUS_COLORS[a.status_id] || 'var(--color-text-dim)';

  return (
    <>
      <tr
        onClick={onToggle}
        style={{ cursor: 'pointer', transition: 'background 0.15s', background: isExpanded ? 'var(--color-bg-hover)' : 'transparent' }}
        onMouseOver={(e) => { if (!isExpanded) e.currentTarget.style.background = 'var(--color-bg-hover)'; }}
        onMouseOut={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
      >
        <td className="table-cell" style={{ paddingLeft: '1rem', color: 'var(--color-text-dim)', fontWeight: 700, fontSize: '0.8rem' }}>
          {index + 1}
        </td>
        <td className="table-cell">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {a.clube?.escudos?.['30x30'] && (
              <img src={a.clube.escudos['30x30']} alt={a.clube.abreviacao} width={22} height={22} style={{ borderRadius: '4px' }} />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.apelido}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{a.clube?.nome_fantasia}</div>
            </div>
          </div>
        </td>
        <td className="table-cell" style={{ textAlign: 'center' }}>
          <span
            className="badge"
            style={{
              color: POS_COLORS[a.posicao_id],
              borderColor: POS_COLORS[a.posicao_id],
              background: `${POS_COLORS[a.posicao_id]}15`,
              fontSize: '0.65rem',
            }}
          >
            {a.posicao?.abreviacao?.toUpperCase()}
          </span>
        </td>
        <td className="table-cell" style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: statusColor }}>
            {a.statusJogador?.nome || '—'}
          </span>
        </td>
        <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-text-secondary)' }}>
          {a.jogos_num}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 600, color: a.pontos_num > 0 ? 'var(--color-positive)' : a.pontos_num < 0 ? 'var(--color-negative)' : 'var(--color-text-secondary)' }}>
          {a.pontos_num.toFixed(1)}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 700, color: a.media_num > 5 ? 'var(--color-positive)' : a.media_num > 0 ? 'var(--color-text-primary)' : 'var(--color-negative)' }}>
          {a.media_num.toFixed(2)}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {a.mediaGeralPeriodo?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
          {a.mediaCasaPeriodo?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
          {a.mediaForaPeriodo?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-positive)', fontWeight: 600 }}>
          {a.mediaConquistada?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
          ±{a.desvioPadraoConquistada?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-negative)', fontWeight: 600 }}>
          {a.mediaCedida?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>
          ±{a.desvioPadraoCedida?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {a.somaConqCed?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-goleiro)', background: 'rgba(0,0,0,0.1)' }}>
          {a.mccPersonalizado?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)', background: 'rgba(255,255,255,0.03)' }}>
          {a.mediaComposta?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', paddingRight: '1rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: varColor, fontWeight: 600, fontSize: '0.8rem' }}>
            <VarIcon size={12} />
            {variacao > 0 ? '+' : ''}{variacao.toFixed(2)}
          </span>
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={19} style={{ padding: 0 }}>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <ScoutDetail atleta={a} />
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

function ScoutDetail({ atleta }: { atleta: AtletaEnriquecido }) {
  const { scout, jogos_num: jogos, scoutsConquistados, scoutsCedidos } = atleta;
  const { total, breakdown } = calcularScoutPoints(scout);

  const SCOUT_LABELS: Record<string, string> = {
    G: 'Gol', A: 'Assist.', SG: 'S. Gol', DS: 'Desarme', FC: 'F. Comet.', FS: 'F. Sofr.',
    FF: 'Fin. Fora', FD: 'Fin. Def.', FT: 'Fin. Trave', DE: 'Defesa', GS: 'Gol Sofr.',
    CA: 'C. Amarelo', CV: 'C. Vermelho', PC: 'P. Comet.', PP: 'P. Perdido', PS: 'P. Sofr.',
    I: 'Imped.', V: 'Vitória', DP: 'Def. Pênalti',
  };

  const renderScoutTag = (key: string, value: string | number, isPositive: boolean, suffix: string = '') => {
    return (
      <div
        key={key}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'space-between',
          background: isPositive ? 'rgba(0, 255, 136, 0.08)' : 'rgba(255, 77, 106, 0.08)',
          border: `1.5px solid ${isPositive ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 77, 106, 0.2)'}`,
          padding: '0.375rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', flex: '1 1 45%',
        }}
      >
        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{SCOUT_LABELS[key] || key}</span>
        <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>
          {value}{suffix}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', padding: '1.5rem', background: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-border)' }}>
      {/* Coluna 1: Scouts Pessoais do Jogador */}
      <div style={{ background: 'var(--color-bg-primary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>SEUS SCOUTS (MÉDIAS/JOGO)</span>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: total >= 0 ? 'var(--color-positive)' : 'var(--color-negative)' }}>
            Geral: {total.toFixed(1)} pts
          </span>
        </div>
        {breakdown.length === 0 ? (
          <div style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>Sem scouts registrados.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {breakdown.filter(b => b.points > 0).map(b => renderScoutTag(b.key, jogos > 0 ? (b.count / jogos).toFixed(2) : '0', true, 'x'))}
            {breakdown.filter(b => b.points < 0).map(b => renderScoutTag(b.key, jogos > 0 ? (b.count / jogos).toFixed(2) : '0', false, 'x'))}
          </div>
        )}
      </div>

      {/* Coluna 2: Índices Cedidos */}
      <div style={{ background: 'var(--color-bg-primary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>M. CEDIDA (PRÓX. ADV.)</span>
          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-negative)' }}>
            ±{atleta.desvioPadraoCedida?.toFixed(2) || '0.00'} pts
          </span>
        </div>
        {(!scoutsCedidos || Object.keys(scoutsCedidos).length === 0) ? (
          <div style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem' }}>Sem dados cedidos neste cenário.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
             {Object.entries(scoutsCedidos).sort((a, b) => a[1].media - b[1].media).map(([key, stat]) => 
              renderScoutTag(key, stat.media.toFixed(2), false, '')
            )}
          </div>
        )}
      </div>
    </div>
  );
}
