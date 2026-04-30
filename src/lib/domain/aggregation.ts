import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { Partida, AtletaPontuado, Scout } from '@/types/cartola';
import { ROUND_DECAY } from '../constants';

export type Timeframe = '3' | '5' | 'all';

export interface ScoutStats {
  pontos: number;
  sumSq: number;
}

export interface AggregatedStats {
  jogos: number;
  pontos: number;
  sumSq: number;
  jogosReais?: number;
  pontosReais?: number;
  scouts: Partial<Record<keyof Scout, ScoutStats>>;
}

export interface TeamStats {
  conquistadosCasa: Record<number, AggregatedStats>; // posição -> stats
  conquistadosFora: Record<number, AggregatedStats>;
  cedidosCasa: Record<number, AggregatedStats>;
  cedidosFora: Record<number, AggregatedStats>;
}

export interface HistoricalAggregates {
  playerStats: Record<number, {
    total: AggregatedStats;
    casa: AggregatedStats;
    fora: AggregatedStats;
    pontosUltimaRodada?: number;
    roundHistory: number[]; // raw score per round, ascending order
  }>;
  teamStats: Record<number, TeamStats>;
  globalLeagueAverages: Record<number, AggregatedStats>;
}

/**
 * Loads and processes historical raw data from Firestore to calculate aggregates.
 * Extracted from indicators-engine.ts for CQRS (Command Query Responsibility Segregation).
 */
export async function calculateHistoricalAggregates(timeframe: Timeframe): Promise<HistoricalAggregates> {
  // 1. Fetch all available rounds
  const rodadasSnapshot = await getDocs(collection(db, 'rodadas'));
  const availableRounds = rodadasSnapshot.docs
    .map(doc => parseInt(doc.id, 10))
    .filter(id => !isNaN(id))
    .sort((a, b) => a - b);

  if (availableRounds.length === 0) {
    return { playerStats: {}, teamStats: {}, globalLeagueAverages: {} };
  }

  // 2. Filter by timeframe
  let targetRounds = availableRounds;
  if (timeframe !== 'all') {
    const limit = parseInt(timeframe, 10);
    targetRounds = availableRounds.slice(-limit);
  }

  // Aggregation structures
  const playerStats: HistoricalAggregates['playerStats'] = {};
  const teamStats: Record<number, TeamStats> = {};

  // Helper to init team stats
  const getTeamStats = (clubeId: number) => {
    if (!teamStats[clubeId]) {
      teamStats[clubeId] = {
        conquistadosCasa: {}, conquistadosFora: {},
        cedidosCasa: {}, cedidosFora: {}
      };
    }
    return teamStats[clubeId];
  };

  // 3. Pre-fetch ALL round data in parallel
  const totalRounds = targetRounds.length;
  const lastRound = targetRounds[totalRounds - 1];

  const roundSnapshots = await Promise.all(
    targetRounds.map(async (round) => {
      const [partidasSnap, atletasSnap] = await Promise.all([
        getDocs(collection(db, 'rodadas', String(round), 'partidas')),
        getDocs(collection(db, 'rodadas', String(round), 'atletas')),
      ]);
      return { round, partidasSnap, atletasSnap };
    })
  );

  for (let roundIdx = 0; roundIdx < totalRounds; roundIdx++) {
    const { round, partidasSnap, atletasSnap } = roundSnapshots[roundIdx];
    const decayWeight = Math.pow(ROUND_DECAY, totalRounds - 1 - roundIdx);

    const roundMatches: Record<number, { isHome: boolean; opponentId: number }> = {};
    const validMatches: Partida[] = [];

    partidasSnap.forEach(doc => {
      const match = doc.data() as Partida;
      if (match.valida) {
        roundMatches[match.clube_casa_id] = { isHome: true, opponentId: match.clube_visitante_id };
        roundMatches[match.clube_visitante_id] = { isHome: false, opponentId: match.clube_casa_id };
        validMatches.push(match);
      }
    });

    type TeamPosStats = Record<number, { pontos: number; count: number; sumSq: number; scouts: Partial<Record<keyof Scout, ScoutStats>> }>;
    const matchPoints: Record<number, { homeConquered: TeamPosStats, awayConquered: TeamPosStats }> = {};

    validMatches.forEach(m => {
      matchPoints[m.partida_id] = { homeConquered: {}, awayConquered: {} };
    });

    atletasSnap.forEach(doc => {
      const atleta = doc.data() as AtletaPontuado;
      const atletaId = parseInt(doc.id, 10);

      if (atleta.entrou_em_campo && atleta.pontuacao !== undefined && !isNaN(atletaId)) {

        if (!playerStats[atletaId]) {
          playerStats[atletaId] = {
            total: { jogos: 0, pontos: 0, sumSq: 0, jogosReais: 0, pontosReais: 0, scouts: {} },
            casa: { jogos: 0, pontos: 0, sumSq: 0, jogosReais: 0, pontosReais: 0, scouts: {} },
            fora: { jogos: 0, pontos: 0, sumSq: 0, jogosReais: 0, pontosReais: 0, scouts: {} },
            roundHistory: [],
          };
        }

        playerStats[atletaId].roundHistory.push(atleta.pontuacao);

        if (round === lastRound) {
          playerStats[atletaId].pontosUltimaRodada = atleta.pontuacao;
        }

        const pStat = playerStats[atletaId];
        const matchContext = roundMatches[atleta.clube_id];

        const weightedPts = atleta.pontuacao * decayWeight;
        pStat.total.jogos += decayWeight;
        pStat.total.pontos += weightedPts;
        pStat.total.sumSq += (weightedPts ** 2);

        pStat.total.jogosReais = (pStat.total.jogosReais || 0) + 1;
        pStat.total.pontosReais = (pStat.total.pontosReais || 0) + atleta.pontuacao;

        if (matchContext) {
          if (matchContext.isHome) {
            pStat.casa.jogos += decayWeight;
            pStat.casa.pontos += weightedPts;
            pStat.casa.sumSq += (weightedPts ** 2);
            pStat.casa.jogosReais = (pStat.casa.jogosReais || 0) + 1;
            pStat.casa.pontosReais = (pStat.casa.pontosReais || 0) + atleta.pontuacao;
          } else {
            pStat.fora.jogos += decayWeight;
            pStat.fora.pontos += weightedPts;
            pStat.fora.sumSq += (weightedPts ** 2);
            pStat.fora.jogosReais = (pStat.fora.jogosReais || 0) + 1;
            pStat.fora.pontosReais = (pStat.fora.pontosReais || 0) + atleta.pontuacao;
          }

          const match = validMatches.find(m => m.clube_casa_id === atleta.clube_id || m.clube_visitante_id === atleta.clube_id);
          if (match && atleta.pontuacao !== 0) {
            const mPts = matchPoints[match.partida_id];
            const targetPos = matchContext.isHome ? mPts.homeConquered : mPts.awayConquered;

            if (!targetPos[atleta.posicao_id]) targetPos[atleta.posicao_id] = { pontos: 0, count: 0, sumSq: 0, scouts: {} };
            targetPos[atleta.posicao_id].pontos += atleta.pontuacao;
            targetPos[atleta.posicao_id].sumSq += (atleta.pontuacao ** 2);
            targetPos[atleta.posicao_id].count += 1;

            if (atleta.scout) {
              for (const [key, value] of Object.entries(atleta.scout)) {
                const s = key as keyof Scout;
                const scoutVal = value as number;

                if (!pStat.total.scouts[s]) pStat.total.scouts[s] = { pontos: 0, sumSq: 0 };
                pStat.total.scouts[s]!.pontos += scoutVal;
                pStat.total.scouts[s]!.sumSq += (scoutVal ** 2);

                if (matchContext.isHome) {
                  if (!pStat.casa.scouts[s]) pStat.casa.scouts[s] = { pontos: 0, sumSq: 0 };
                  pStat.casa.scouts[s]!.pontos += scoutVal;
                  pStat.casa.scouts[s]!.sumSq += (scoutVal ** 2);
                } else {
                  if (!pStat.fora.scouts[s]) pStat.fora.scouts[s] = { pontos: 0, sumSq: 0 };
                  pStat.fora.scouts[s]!.pontos += scoutVal;
                  pStat.fora.scouts[s]!.sumSq += (scoutVal ** 2);
                }

                if (!targetPos[atleta.posicao_id].scouts[s]) {
                  targetPos[atleta.posicao_id].scouts[s] = { pontos: 0, sumSq: 0 };
                }
                targetPos[atleta.posicao_id].scouts[s]!.pontos += scoutVal;
                targetPos[atleta.posicao_id].scouts[s]!.sumSq += (scoutVal ** 2);
              }
            }
          }
        }
      }
    });

    for (const match of validMatches) {
      const mPts = matchPoints[match.partida_id];
      const homeTeamInfo = getTeamStats(match.clube_casa_id);
      const awayTeamInfo = getTeamStats(match.clube_visitante_id);

      const mergeScouts = (target: AggregatedStats, sourceScouts: Partial<Record<keyof Scout, ScoutStats>>) => {
        for (const [key, val] of Object.entries(sourceScouts)) {
          const s = key as keyof Scout;
          if (!target.scouts[s]) target.scouts[s] = { pontos: 0, sumSq: 0 };
          target.scouts[s]!.pontos += val!.pontos;
          target.scouts[s]!.sumSq += val!.sumSq;
        }
      };

      for (const [posStr, stats] of Object.entries(mPts.homeConquered)) {
        const pos = parseInt(posStr, 10);
        if (!homeTeamInfo.conquistadosCasa[pos]) homeTeamInfo.conquistadosCasa[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        homeTeamInfo.conquistadosCasa[pos].jogos += stats.count;
        homeTeamInfo.conquistadosCasa[pos].pontos += stats.pontos;
        homeTeamInfo.conquistadosCasa[pos].sumSq += stats.sumSq;
        mergeScouts(homeTeamInfo.conquistadosCasa[pos], stats.scouts);

        if (!awayTeamInfo.cedidosFora[pos]) awayTeamInfo.cedidosFora[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        awayTeamInfo.cedidosFora[pos].jogos += stats.count;
        awayTeamInfo.cedidosFora[pos].pontos += stats.pontos;
        awayTeamInfo.cedidosFora[pos].sumSq += stats.sumSq;
        mergeScouts(awayTeamInfo.cedidosFora[pos], stats.scouts);
      }

      for (const [posStr, stats] of Object.entries(mPts.awayConquered)) {
        const pos = parseInt(posStr, 10);
        if (!awayTeamInfo.conquistadosFora[pos]) awayTeamInfo.conquistadosFora[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        awayTeamInfo.conquistadosFora[pos].jogos += stats.count;
        awayTeamInfo.conquistadosFora[pos].pontos += stats.pontos;
        awayTeamInfo.conquistadosFora[pos].sumSq += stats.sumSq;
        mergeScouts(awayTeamInfo.conquistadosFora[pos], stats.scouts);

        if (!homeTeamInfo.cedidosCasa[pos]) homeTeamInfo.cedidosCasa[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        homeTeamInfo.cedidosCasa[pos].jogos += stats.count;
        homeTeamInfo.cedidosCasa[pos].pontos += stats.pontos;
        homeTeamInfo.cedidosCasa[pos].sumSq += stats.sumSq;
        mergeScouts(homeTeamInfo.cedidosCasa[pos], stats.scouts);
      }
    }
  }

  const globalLeagueAverages: Record<number, AggregatedStats> = {};
  for (const teamId in teamStats) {
    const stats = teamStats[teamId];
    [stats.cedidosCasa, stats.cedidosFora].forEach(cat => {
      for (const posStr in cat) {
        const pos = parseInt(posStr, 10);
        const st = cat[pos];
        if (!globalLeagueAverages[pos]) {
          globalLeagueAverages[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        }
        globalLeagueAverages[pos].jogos += st.jogos;
        globalLeagueAverages[pos].pontos += st.pontos;
        globalLeagueAverages[pos].sumSq += st.sumSq;
      }
    });
  }

  return { playerStats, teamStats, globalLeagueAverages };
}
