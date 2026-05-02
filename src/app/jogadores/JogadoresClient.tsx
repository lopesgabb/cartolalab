'use client';

import { useState, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { POSICAO_NAMES, type AtletaEnriquecido, type Clube, type Scout, type PosicaoId } from '@/types/cartola';
import type { Timeframe } from '@/lib/indicators-engine';
import { filterAtletas, sortAtletas } from '@/lib/indicators';
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { POS_COLORS, SCOUT_LABELS } from '@/lib/constants';
import Sparkline from '@/components/Sparkline';

interface JogadoresClientProps {
  atletas: AtletaEnriquecido[];
  clubes: Record<string, Clube>;
  currentPeriod: Timeframe;
}

type SortField = 'media_num' | 'pontos_num' | 'indiceMomento' | 'custoBeneficio' | 'jogos_num' | 'mediaGeralPeriodo' | 'mediaCasaPeriodo' | 'mediaForaPeriodo' | 'mediaConquistada' | 'mediaCedida' | 'somaConqCed' | 'mccPersonalizado' | 'mediaComposta' | 'previsaoIA' | 'somaRanks';

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: 'asc' | 'desc' }) => {
  if (sortField !== field) return null;
  return sortDir === 'desc' ? <ChevronDown size={14} /> : <ChevronUp size={14} />;
};

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
    let result = filterAtletas(atletas, {
      posicaoId: posicaoFilter || undefined,
      clubeId: clubeFilter || undefined,
      statusId: statusFilter || undefined,
      jogosMin: minGames,
      search: search || undefined,
    });

    const sortByFieldDesc = (arr: AtletaEnriquecido[], field: keyof AtletaEnriquecido) => {
      return [...arr].sort((a, b) => ((b[field] as number) || 0) - ((a[field] as number) || 0));
    };

    const sortByPrevisao = sortByFieldDesc(result, 'previsaoIA');
    const sortByMComp = sortByFieldDesc(result, 'mediaComposta');
    const sortByMgp = sortByFieldDesc(result, 'mediaGeralPeriodo');

    const sortByMando = [...result].sort((a, b) => {
      const valA = a.proximoJogoMando === 'casa' ? (a.mediaCasaPeriodo || 0) : a.proximoJogoMando === 'fora' ? (a.mediaForaPeriodo || 0) : (a.mediaGeralPeriodo || 0);
      const valB = b.proximoJogoMando === 'casa' ? (b.mediaCasaPeriodo || 0) : b.proximoJogoMando === 'fora' ? (b.mediaForaPeriodo || 0) : (b.mediaGeralPeriodo || 0);
      return valB - valA;
    });

    const rankPrevisao = new Map(sortByPrevisao.map((a, i) => [a.atleta_id, i + 1]));
    const rankMComp = new Map(sortByMComp.map((a, i) => [a.atleta_id, i + 1]));
    const rankMgp = new Map(sortByMgp.map((a, i) => [a.atleta_id, i + 1]));
    const rankMando = new Map(sortByMando.map((a, i) => [a.atleta_id, i + 1]));

    result = result.map(a => {
      const pRank = rankPrevisao.get(a.atleta_id) || 0;
      const cRank = rankMComp.get(a.atleta_id) || 0;
      const gRank = rankMgp.get(a.atleta_id) || 0;
      const mandoRank = rankMando.get(a.atleta_id) || 0;
      return {
        ...a,
        somaRanks: pRank + cRank + gRank + mandoRank,
      };
    });

    return sortAtletas(result, sortField, sortDir);
  }, [atletas, search, posicaoFilter, clubeFilter, statusFilter, sortField, sortDir, minGames]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir(field === 'somaRanks' ? 'asc' : 'desc');
    }
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
      <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.5rem' }}>
        
        {/* Period Toggle */}
        <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--color-glass-border)', paddingBottom: '1.25rem', flexWrap: 'wrap' }}>
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
            style={{ paddingLeft: '2.25rem', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--color-glass-border)' }}
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Position filter */}
          {[1, 2, 3, 4, 5, 6].map((pos) => (
            <button
              key={pos}
              className={`filter-chip ${posicaoFilter === pos ? 'active' : ''}`}
              onClick={() => setPosicaoFilter(posicaoFilter === pos ? null : pos)}
              style={posicaoFilter === pos ? { borderColor: POS_COLORS[pos], color: POS_COLORS[pos], background: `${POS_COLORS[pos]}15` } : {}}
            >
              {POSICAO_NAMES[pos as PosicaoId]}
            </button>
          ))}

          <span style={{ width: '1px', height: '24px', background: 'var(--color-glass-border)', margin: '0 0.25rem' }} />

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

          <span style={{ width: '1px', height: '24px', background: 'var(--color-glass-border)', margin: '0 0.25rem' }} />

          {/* Club filter */}
          <select
            className="input-field"
            style={{ width: 'auto', minWidth: '160px', padding: '0.375rem 0.75rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--color-glass-border)' }}
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
            style={{ width: 'auto', minWidth: '120px', padding: '0.375rem 0.75rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', borderColor: 'var(--color-glass-border)' }}
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
      <div className="table-pro-container" style={{ position: 'relative' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1600px', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderBottom: '1px solid var(--color-glass-border)',
                position: 'sticky',
                top: 0,
                backdropFilter: 'blur(10px)',
                zIndex: 30
              }}>
                <th className="table-header" style={{ textAlign: 'left', paddingLeft: '1rem', width: '40px' }}>#</th>
                <th className="table-header" style={{ 
                  textAlign: 'left', 
                  minWidth: '200px',
                  position: 'sticky',
                  left: 0,
                  background: 'var(--color-bg-secondary)',
                  zIndex: 31
                }}>Atleta</th>
                <th className="table-header" style={{ textAlign: 'center' }}>Pos</th>
                <th
                  className={`table-header ${sortField === 'jogos_num' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('jogos_num')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    J <SortIcon field="jogos_num" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'pontos_num' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('pontos_num')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                    Últ. Pts <SortIcon field="pontos_num" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'media_num' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('media_num')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Média Oficial Cartola">
                    Média <SortIcon field="media_num" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaGeralPeriodo' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaGeralPeriodo')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-text-primary)' }} title="Média Geral no Período Selecionado">
                    MG(p) <SortIcon field="mediaGeralPeriodo" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaCasaPeriodo' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaCasaPeriodo')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Média em Casa no Período">
                    M. Casa <SortIcon field="mediaCasaPeriodo" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaForaPeriodo' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaForaPeriodo')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Média Fora no Período">
                    M. Fora <SortIcon field="mediaForaPeriodo" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaConquistada' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaConquistada')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-positive)' }} title="Média de pontos conquistados pelo TIME nesta posição no Período (Mando real da próx rodada)">
                    M. CONQ <SortIcon field="mediaConquistada" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>

                <th
                  className={`table-header ${sortField === 'mediaCedida' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaCedida')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-negative)' }} title="Média de pontos cedidos pelo ADVERSÁRIO para esta posição no Período">
                    M. CED <SortIcon field="mediaCedida" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'somaConqCed' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('somaConqCed')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Soma (M.CONQ + M.CED)">
                    SOMA <SortIcon field="somaConqCed" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaComposta' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('mediaComposta')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-text-primary)' }} title="Fórmula: ((Média Mando * 0.6 + Média Confronto * 0.4) + Afinidade) * Fator de Risco">
                    M. COMP <SortIcon field="mediaComposta" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'previsaoIA' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('previsaoIA')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-accent)' }} title="Previsão da IA cruzando scouts">
                    IA SCORE <SortIcon field="previsaoIA" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'somaRanks' ? 'active' : ''}`}
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                  onClick={() => handleSort('somaRanks')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--color-info)' }} title="Soma das posições (IA SCORE + M.COMP + MG(p) + M.MANDO), menor é melhor">
                    SOMA POS <SortIcon field="somaRanks" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'indiceMomento' ? 'active' : ''}`}
                  style={{ textAlign: 'right', paddingRight: '1.5rem', cursor: 'pointer' }}
                  onClick={() => handleSort('indiceMomento')}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }} title="Momento: Avaliação do desempenho recente nas últimas 3 rodadas">
                    Momento <SortIcon field="indiceMomento" sortField={sortField} sortDir={sortDir} />
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
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <>
      <tr
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        className="group hover:bg-white/[0.03] outline-none focus-visible:bg-white/[0.05]"
        style={{ 
          cursor: 'pointer', 
          transition: 'background 0.15s', 
          borderBottom: '1px solid rgba(255,255,255,0.03)',
          background: isExpanded ? 'rgba(0, 255, 136, 0.05)' : 'transparent'
        }}
      >
        <td className="table-cell" style={{ paddingLeft: '1rem', color: 'var(--color-text-dim)', fontWeight: 700, fontSize: '0.8rem' }}>
          {index + 1}
        </td>
        <td className="table-cell" style={{ 
          position: 'sticky', 
          left: 0, 
          background: isExpanded ? 'rgba(20, 35, 30, 1)' : 'var(--color-bg-secondary)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {a.clube?.escudos?.['30x30'] && (
              <img src={a.clube.escudos['30x30']} alt={a.clube.abreviacao} width={22} height={22} style={{ borderRadius: '4px' }} />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{a.apelido}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{a.clube?.abreviacao}</div>
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

        <td className="table-cell" style={{ textAlign: 'right', color: 'var(--color-negative)', fontWeight: 600 }}>
          {a.mediaCedida?.toFixed(2) || '0.00'}
        </td>

        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {a.somaConqCed?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-text-primary)' }}>
          {a.mediaComposta?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-accent)', background: 'rgba(255,255,255,0.03)' }}>
          {a.previsaoIA?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-info)' }}>
          {a.somaRanks || 0}
        </td>
        <td className="table-cell" style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
            {a.lastRoundsHistory && a.lastRoundsHistory.length > 0 && (
              <Sparkline
                data={toRunningAvg(a.lastRoundsHistory)}
                width={60}
                height={20}
              />
            )}
            <span style={{ fontWeight: 600, color: 'var(--color-info)', minWidth: '40px' }}>
              {a.indiceMomento?.toFixed(2) || '0.00'}
            </span>
          </div>
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={16} style={{ padding: 0 }}>
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

/** Converts raw round scores into cumulative averages per round */
function toRunningAvg(scores: number[]): number[] {
  let sum = 0;
  return scores.map((v, i) => { sum += v; return sum / (i + 1); });
}

function ScoutDetail({ atleta }: { atleta: AtletaEnriquecido }) {
  const { scoutsPlayer, scoutsAdversario, proximoJogoMando } = atleta;

  const NEGATIVE_SCOUTS = ['FC', 'GS', 'CA', 'CV', 'PC', 'PP', 'I'];
  const isScoutPositive = (key: string) => !NEGATIVE_SCOUTS.includes(key);

  const allScoutKeys = new Set<string>();
  if (scoutsPlayer?.total) Object.keys(scoutsPlayer.total).forEach(k => allScoutKeys.add(k));
  if (scoutsAdversario?.total) Object.keys(scoutsAdversario.total).forEach(k => allScoutKeys.add(k));

  const keysArray = Array.from(allScoutKeys).sort((a, b) => {
    const aPts = scoutsPlayer?.total[a as keyof Scout]?.media || 0;
    const bPts = scoutsPlayer?.total[b as keyof Scout]?.media || 0;
    return bPts - aPts;
  });

  return (
    <div style={{ padding: '1.5rem', background: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '1.5rem' }}>
        
        {/* Left Side: Scout Matrix Table */}
        <div style={{ background: 'var(--color-bg-primary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>
              CRUZAMENTO DE SCOUTS (PREVISÃO VS ADVERSÁRIO)
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-hover)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)' }}>Scout</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)' }}>Jogador (Total)</th>
                <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)' }}>Adv. Cede (Total)</th>
                {proximoJogoMando && (
                  <>
                    <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)' }}>Jog. ({proximoJogoMando === 'casa' ? 'C' : 'F'})</th>
                    <th style={{ textAlign: 'right', padding: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)' }}>Adv. Cede ({proximoJogoMando === 'casa' ? 'F' : 'C'})</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {keysArray.map(key => {
                const sKey = key as keyof Scout;
                const pTotal = scoutsPlayer?.total[sKey];
                const pMando = proximoJogoMando ? scoutsPlayer?.[proximoJogoMando]?.[sKey] : undefined;
                const aTotal = scoutsAdversario?.total[sKey];
                const oppMandoEstado = proximoJogoMando === 'casa' ? 'fora' : proximoJogoMando === 'fora' ? 'casa' : undefined;
                const aMando = oppMandoEstado ? scoutsAdversario?.[oppMandoEstado]?.[sKey] : undefined;
                
                const isPositive = isScoutPositive(key);
                const highlightP = isPositive && aTotal && pTotal && (aTotal.media > pTotal.media);

                return (
                  <tr key={key} className="hover:bg-bg-hover transition-colors duration-200" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 600, color: isPositive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                      {SCOUT_LABELS[sKey] || key}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: pTotal ? 'var(--color-text-primary)' : 'var(--color-text-dim)' }}>
                      {pTotal ? pTotal.media.toFixed(2) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', color: aTotal ? 'var(--color-text-primary)' : 'var(--color-text-dim)', fontWeight: highlightP ? 700 : 400 }}>
                      {aTotal ? aTotal.media.toFixed(2) : '-'}
                      {highlightP && <span title="Adversário cede mais do que a média deste jogador" style={{ color: 'var(--color-positive)', fontSize: '10px', marginLeft: '4px' }}>▲</span>}
                    </td>
                    {proximoJogoMando && (
                      <>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: pMando ? 'var(--color-text-primary)' : 'var(--color-text-dim)', background: 'rgba(255,255,255,0.015)' }}>
                          {pMando ? pMando.media.toFixed(2) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', color: aMando ? 'var(--color-text-primary)' : 'var(--color-text-dim)', background: 'rgba(255,255,255,0.015)' }}>
                          {aMando ? aMando.media.toFixed(2) : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {keysArray.length === 0 && (
                <tr>
                  <td colSpan={proximoJogoMando ? 5 : 3} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                    Faltam dados de histórico neste recorte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Side: Evolução por Rodada (Sparkline) */}
        {atleta.lastRoundsHistory && atleta.lastRoundsHistory.length > 0 && (
          <div style={{ background: 'var(--color-bg-primary)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>EVOLUÇÃO POR RODADA</span>
              {atleta.indiceMomento !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>MOMENTO</span>
                  <span style={{
                    fontWeight: 800, fontSize: '0.9rem',
                    color: atleta.indiceMomento > (atleta.mediaGeralPeriodo ?? 0) ? 'var(--color-positive)' : 'var(--color-negative)',
                  }}>
                    {atleta.indiceMomento.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <Sparkline
              data={toRunningAvg(atleta.lastRoundsHistory)}
              width={240}
              height={80}
              showDots
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>
              <span>Rd. {1}</span>
              <span>Rd. {atleta.lastRoundsHistory.length}</span>
            </div>
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: 'var(--color-bg-hover)', borderRadius: '8px', padding: '0.625rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>MELHOR</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-positive)' }}>
                  {Math.max(...atleta.lastRoundsHistory).toFixed(1)}
                </div>
              </div>
              <div style={{ background: 'var(--color-bg-hover)', borderRadius: '8px', padding: '0.625rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>PIOR</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-negative)' }}>
                  {Math.min(...atleta.lastRoundsHistory).toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
