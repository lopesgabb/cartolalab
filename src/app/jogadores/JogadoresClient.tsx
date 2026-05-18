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
    <div className="container-max py-6">
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold gradient-text">
          Estatísticas de Jogadores
        </h1>
        <p className="text-[var(--color-text-dim)] text-sm mt-1">
          {filtered.length} jogadores encontrados
        </p>
      </div>

      {/* Filters */}
      <div className="glass-panel mb-6 flex flex-col gap-5 p-6">
        
        {/* Period Toggle */}
        <div className="flex gap-3 border-b border-[var(--color-glass-border)] pb-5 flex-wrap">
          <span className="text-sm color-[var(--color-text-dim)] self-center font-semibold mr-2">Período Analisado:</span>
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
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]" />
          <input
            className="input-field pl-9 bg-white/[0.02] border-[var(--color-glass-border)]"
            placeholder="Buscar jogador ou time..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-none border-none text-[var(--color-text-dim)] cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-3 items-center">
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

          <span className="w-[1px] h-6 bg-[var(--color-glass-border)] mx-1" />

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

          <span className="w-[1px] h-6 bg-[var(--color-glass-border)] mx-1" />

          {/* Club filter */}
          <select
            className="input-field w-auto min-w-[160px] py-1.5 px-3 text-[0.8rem] bg-white/[0.02] border-[var(--color-glass-border)]"
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
            className="input-field w-auto min-w-[120px] py-1.5 px-3 text-[0.8rem] bg-white/[0.02] border-[var(--color-glass-border)]"
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
      <div className="table-pro-container relative">
        <div className="overflow-x-auto touch-pan-x">
          <table className="w-full border-collapse min-w-[1600px] tabular-nums">
            <thead>
              <tr className="bg-white/[0.02] border-b border-[var(--color-glass-border)] sticky top-0 backdrop-blur-[10px] z-30">
                <th className="table-header text-left pl-4 w-10">#</th>
                <th className="table-header text-left min-w-[200px] sticky left-0 bg-[var(--color-bg-secondary)] z-31">Atleta</th>
                <th className="table-header text-center">Pos</th>
                <th
                  className={`table-header ${sortField === 'jogos_num' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('jogos_num')}
                >
                  <span className="inline-flex items-center gap-0.5">
                    J <SortIcon field="jogos_num" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'pontos_num' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('pontos_num')}
                >
                  <span className="inline-flex items-center gap-0.5">
                    Últ. Pts <SortIcon field="pontos_num" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'media_num' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('media_num')}
                >
                  <span className="inline-flex items-center gap-0.5" title="Média Oficial Cartola">
                    Média <SortIcon field="media_num" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaGeralPeriodo' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('mediaGeralPeriodo')}
                >
                  <span className="inline-flex items-center gap-0.5 text-[var(--color-text-primary)]" title="Média Geral no Período Selecionado">
                    MG(p) <SortIcon field="mediaGeralPeriodo" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaCasaPeriodo' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('mediaCasaPeriodo')}
                >
                  <span className="inline-flex items-center gap-0.5" title="Média em Casa no Período">
                    M. Casa <SortIcon field="mediaCasaPeriodo" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaForaPeriodo' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('mediaForaPeriodo')}
                >
                  <span className="inline-flex items-center gap-0.5" title="Média Fora no Período">
                    M. Fora <SortIcon field="mediaForaPeriodo" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaConquistada' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('mediaConquistada')}
                >
                  <span className="inline-flex items-center gap-0.5 text-[var(--color-positive)]" title="Média de pontos conquistados pelo TIME nesta posição no Período (Mando real da próx rodada)">
                    M. CONQ <SortIcon field="mediaConquistada" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>

                <th
                  className={`table-header ${sortField === 'mediaCedida' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('mediaCedida')}
                >
                  <span className="inline-flex items-center gap-0.5 text-[var(--color-negative)]" title="Média de pontos cedidos pelo ADVERSÁRIO para esta posição no Período">
                    M. CED <SortIcon field="mediaCedida" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'somaConqCed' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('somaConqCed')}
                >
                  <span className="inline-flex items-center gap-0.5" title="Soma (M.CONQ + M.CED)">
                    SOMA <SortIcon field="somaConqCed" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'mediaComposta' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('mediaComposta')}
                >
                  <span className="inline-flex items-center gap-0.5 text-[var(--color-text-primary)]" title="Fórmula: ((Média Mando * 0.6 + Média Confronto * 0.4) + Afinidade) * Fator de Risco">
                    M. COMP <SortIcon field="mediaComposta" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'previsaoIA' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('previsaoIA')}
                >
                  <span className="inline-flex items-center gap-0.5 text-[var(--color-accent)]" title="Previsão da IA cruzando scouts">
                    IA SCORE <SortIcon field="previsaoIA" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'somaRanks' ? 'active' : ''} text-right cursor-pointer`}
                  onClick={() => handleSort('somaRanks')}
                >
                  <span className="inline-flex items-center gap-0.5 text-[var(--color-info)]" title="Soma das posições (IA SCORE + M.COMP + MG(p) + M.MANDO), menor é melhor">
                    SOMA POS <SortIcon field="somaRanks" sortField={sortField} sortDir={sortDir} />
                  </span>
                </th>
                <th
                  className={`table-header ${sortField === 'indiceMomento' ? 'active' : ''} text-right pr-6 cursor-pointer`}
                  onClick={() => handleSort('indiceMomento')}
                >
                  <span className="inline-flex items-center gap-0.5" title="Momento: Avaliação do desempenho recente nas últimas 3 rodadas">
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
          <div className="p-4 text-center text-[var(--color-text-dim)] text-[0.85rem] border-t border-[var(--color-border)]">
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
        className={`interactive-row cursor-pointer outline-none border-b border-white/[0.03] ${isExpanded ? 'bg-[rgba(0,255,136,0.05)]' : ''}`}
      >
        <td className="table-cell pl-4 text-[var(--color-text-dim)] font-bold text-[0.8rem]">
          {index + 1}
        </td>
        <td className={`table-cell sticky left-0 z-10 ${isExpanded ? 'bg-[rgba(20, 35, 30, 1)]' : 'bg-[var(--color-bg-secondary)]'}`}>
          <div className="flex items-center gap-2">
            {a.clube?.escudos?.['30x30'] && (
              <img src={a.clube.escudos['30x30']} alt={a.clube.abreviacao} width={22} height={22} className="rounded" />
            )}
            <div>
              <div className="font-semibold text-[0.85rem]">{a.apelido}</div>
              <div className="text-[0.7rem] text-[var(--color-text-dim)]">{a.clube?.abreviacao}</div>
            </div>
          </div>
        </td>
        <td className="table-cell text-center">
          <span
            className="badge text-[0.65rem]"
            style={{
              color: POS_COLORS[a.posicao_id],
              borderColor: POS_COLORS[a.posicao_id],
              background: `${POS_COLORS[a.posicao_id]}15`,
            }}
          >
            {a.posicao?.abreviacao?.toUpperCase()}
          </span>
        </td>
        <td className="table-cell text-right text-[var(--color-text-secondary)]">
          {a.jogos_num}
        </td>
        <td className={`table-cell text-right font-semibold ${a.pontos_num > 0 ? 'text-[var(--color-positive)]' : a.pontos_num < 0 ? 'text-[var(--color-negative)]' : 'text-[var(--color-text-secondary)]'}`}>
          {a.pontos_num.toFixed(1)}
        </td>
        <td className={`table-cell text-right font-bold ${a.media_num > 5 ? 'text-[var(--color-positive)]' : a.media_num > 0 ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-negative)]'}`}>
          {a.media_num.toFixed(2)}
        </td>
        <td className="table-cell text-right font-bold text-[var(--color-text-primary)]">
          {a.mediaGeralPeriodo?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell text-right text-[var(--color-text-secondary)] text-[0.8rem]">
          {a.mediaCasaPeriodo?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell text-right text-[var(--color-text-secondary)] text-[0.8rem]">
          {a.mediaForaPeriodo?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell text-right text-[var(--color-positive)] font-semibold">
          {a.mediaConquistada?.toFixed(2) || '0.00'}
        </td>

        <td className="table-cell text-right text-[var(--color-negative)] font-semibold">
          {a.mediaCedida?.toFixed(2) || '0.00'}
        </td>

        <td className="table-cell text-right font-bold text-[var(--color-text-primary)]">
          {a.somaConqCed?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell text-right font-extrabold text-[var(--color-text-primary)]">
          {a.mediaComposta?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell text-right font-extrabold text-[var(--color-accent)] bg-white/[0.03]">
          {a.previsaoIA?.toFixed(2) || '0.00'}
        </td>
        <td className="table-cell text-right font-bold text-[var(--color-info)]">
          {a.somaRanks || 0}
        </td>
        <td className="table-cell text-right pr-6">
          <div className="flex items-center justify-end gap-3">
            {a.lastRoundsHistory && a.lastRoundsHistory.length > 0 && (
              <Sparkline
                data={toRunningAvg(a.lastRoundsHistory)}
                width={60}
                height={20}
              />
            )}
            <span className="font-semibold text-[var(--color-info)] min-w-[40px]">
              {a.indiceMomento?.toFixed(2) || '0.00'}
            </span>
          </div>
        </td>
      </tr>
      <AnimatePresence>
        {isExpanded && (
          <tr>
            <td colSpan={16} className="p-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
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
    <div className="p-6 bg-[var(--color-bg-secondary)] border-b-2 border-[var(--color-border)]">
      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6">
        
        {/* Left Side: Scout Matrix Table */}
        <div className="bg-[var(--color-bg-primary)] p-5 rounded-xl border border-[var(--color-border)] shadow-md overflow-x-auto">
          <div className="flex items-center justify-between mb-5">
            <span className="font-bold text-[0.85rem] text-[var(--color-text-dim)] tracking-wider uppercase">
              CRUZAMENTO DE SCOUTS (PREVISÃO VS ADVERSÁRIO)
            </span>
          </div>

          <table className="w-full border-collapse text-[0.8rem]">
            <thead>
              <tr className="bg-[var(--color-bg-hover)] border-b border-[var(--color-border)]">
                <th className="text-left p-3 font-semibold text-[var(--color-text-dim)]">Scout</th>
                <th className="text-right p-3 font-semibold text-[var(--color-text-dim)]">Jogador (Total)</th>
                <th className="text-right p-3 font-semibold text-[var(--color-text-dim)]">Adv. Cede (Total)</th>
                {proximoJogoMando && (
                  <>
                    <th className="text-right p-3 font-semibold text-[var(--color-text-dim)]">Jog. ({proximoJogoMando === 'casa' ? 'C' : 'F'})</th>
                    <th className="text-right p-3 font-semibold text-[var(--color-text-dim)]">Adv. Cede ({proximoJogoMando === 'casa' ? 'F' : 'C'})</th>
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
                  <tr key={key} className="hover:bg-[var(--color-bg-hover)] transition-colors duration-200 border-b border-[var(--color-border)]">
                    <td className={`p-3 font-semibold ${isPositive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                      {SCOUT_LABELS[sKey] || key}
                    </td>
                    <td className={`p-3 text-right ${pTotal ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-dim)]'}`}>
                      {pTotal ? pTotal.media.toFixed(2) : '-'}
                    </td>
                    <td className={`p-3 text-right ${aTotal ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-dim)]'} ${highlightP ? 'font-bold' : ''}`}>
                      {aTotal ? aTotal.media.toFixed(2) : '-'}
                      {highlightP && <span title="Adversário cede mais do que a média deste jogador" className="text-[var(--color-positive)] text-[10px] ml-1">▲</span>}
                    </td>
                    {proximoJogoMando && (
                      <>
                        <td className={`p-3 text-right bg-white/[0.015] ${pMando ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-dim)]'}`}>
                          {pMando ? pMando.media.toFixed(2) : '-'}
                        </td>
                        <td className={`p-3 text-right bg-white/[0.015] ${aMando ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-dim)]'}`}>
                          {aMando ? aMando.media.toFixed(2) : '-'}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {keysArray.length === 0 && (
                <tr>
                  <td colSpan={proximoJogoMando ? 5 : 3} className="p-6 text-center text-[var(--color-text-dim)]">
                    Faltam dados de histórico neste recorte.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Side: Evolução por Rodada (Sparkline) */}
        {atleta.lastRoundsHistory && atleta.lastRoundsHistory.length > 0 && (
          <div className="bg-[var(--color-bg-primary)] p-5 rounded-xl border border-[var(--color-border)] shadow-md">
            <div className="flex items-center justify-between mb-5">
              <span className="font-bold text-[0.85rem] text-[var(--color-text-dim)] tracking-wider uppercase">EVOLUÇÃO POR RODADA</span>
              {atleta.indiceMomento !== undefined && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[0.7rem] text-[var(--color-text-dim)] font-semibold">MOMENTO</span>
                  <span className={`font-extrabold text-[0.9rem] ${atleta.indiceMomento > (atleta.mediaGeralPeriodo ?? 0) ? 'text-[var(--color-positive)]' : 'text-[var(--color-negative)]'}`}>
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
            <div className="flex justify-between mt-3 text-[0.7rem] text-[var(--color-text-dim)]">
              <span>Rd. {1}</span>
              <span>Rd. {atleta.lastRoundsHistory.length}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-[var(--color-bg-hover)] rounded-lg p-2.5 text-center">
                <div className="text-[0.65rem] text-[var(--color-text-dim)] font-semibold uppercase">MELHOR</div>
                <div className="text-[0.9rem] font-extrabold text-[var(--color-positive)]">
                  {Math.max(...atleta.lastRoundsHistory).toFixed(1)}
                </div>
              </div>
              <div className="bg-[var(--color-bg-hover)] rounded-lg p-2.5 text-center">
                <div className="text-[0.65rem] text-[var(--color-text-dim)] font-semibold uppercase">PIOR</div>
                <div className="text-[0.9rem] font-extrabold text-[var(--color-negative)]">
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
