import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { AtletaEnriquecido, Partida, AtletaPontuado, Scout, ScoutContextStats, ScoutStatsObj } from '@/types/cartola';
import { SCOUT_POINTS, ROUND_DECAY } from './constants';

export type Timeframe = '3' | '5' | 'all';

// In-memory cache for historical data to prevent hitting Firestore on every page load
const historicalCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Call this after a successful sync to force fresh data on next request. */
export function clearCache(): void {
  historicalCache.clear();
}

interface ScoutStats {
  pontos: number;
  sumSq: number;
}

interface AggregatedStats {
  jogos: number;
  pontos: number;
  sumSq: number;
  jogosReais?: number;
  pontosReais?: number;
  scouts: Partial<Record<keyof Scout, ScoutStats>>;
}

interface TeamStats {
  conquistadosCasa: Record<number, AggregatedStats>; // posição -> stats
  conquistadosFora: Record<number, AggregatedStats>;
  cedidosCasa: Record<number, AggregatedStats>;
  cedidosFora: Record<number, AggregatedStats>;
}

export async function computeAdvancedIndicators(
  atletasAtuais: AtletaEnriquecido[],
  proximasPartidas: Partida[],
  timeframe: Timeframe
): Promise<AtletaEnriquecido[]> {
  
  // 1. Fetch historical data from Firestore
  const cacheKey = `history_v2_${timeframe}`;
  let historyData = historicalCache.get(cacheKey);

  if (!historyData || Date.now() - historyData.timestamp > CACHE_TTL) {
    historyData = await loadHistoricalDataFromFirestore(timeframe);
    historicalCache.set(cacheKey, { data: historyData, timestamp: Date.now() });
  } else {
    historyData = historyData.data;
  }

  const { playerStats, teamStats, globalLeagueAverages } = historyData;

  // 2. Map current upcoming matches to know Home/Away status and Opponent for each team
  // Record<clube_id, { isHome: boolean, opponentId: number }>
  const upcomingMatchesMenu: Record<number, { isHome: boolean; opponentId: number }> = {};
  
  for (const match of proximasPartidas) {
    if (match.valida) {
      upcomingMatchesMenu[match.clube_casa_id] = { isHome: true, opponentId: match.clube_visitante_id };
      upcomingMatchesMenu[match.clube_visitante_id] = { isHome: false, opponentId: match.clube_casa_id };
    }
  }

  // 3. Compute and attach indicators
  return atletasAtuais.map((atleta) => {
    // Clone to avoid mutating the original fetched data
    const enriched = { ...atleta } as AtletaEnriquecido;
    const pStats = playerStats[atleta.atleta_id];

    // Injetar a pontuação da última rodada caso a API do Cartola tenha zerado (mercado aberto)
    if (pStats && pStats.pontosUltimaRodada !== undefined) {
      enriched.pontos_num = pStats.pontosUltimaRodada;
    }

    // Player historical averages and regularity
    if (pStats) {
      const gJogos = pStats.total.jogosReais || 0;
      enriched.mediaGeralPeriodo = gJogos > 0 ? (pStats.total.pontosReais || 0) / gJogos : 0;
      
      const cJogos = pStats.casa.jogosReais || 0;
      enriched.mediaCasaPeriodo = cJogos > 0 ? (pStats.casa.pontosReais || 0) / cJogos : 0;
      
      const fJogos = pStats.fora.jogosReais || 0;
      enriched.mediaForaPeriodo = fJogos > 0 ? (pStats.fora.pontosReais || 0) / fJogos : 0;
      
      // Regularidade individual (Desvio Padrão) uses weighted moving variance
      const variance = (pStats.total.sumSq / pStats.total.jogos) - ((pStats.total.pontos / pStats.total.jogos) ** 2);
      enriched.regularidade = variance > 0 ? Math.sqrt(variance) : 0;
    } else {
      enriched.mediaGeralPeriodo = 0;
      enriched.mediaCasaPeriodo = 0;
      enriched.mediaForaPeriodo = 0;
      enriched.regularidade = 0;
    }

    // Team and Opponent Averages (M.CONQ and M.CED)
    const matchContext = upcomingMatchesMenu[atleta.clube_id];
    
    if (matchContext) {
      const isHome = matchContext.isHome;
      const tStats = teamStats[atleta.clube_id];
      const oppStats = teamStats[matchContext.opponentId];
      const pos = atleta.posicao_id;

      // M.CONQ: Conquered by this TEAM in this POSITION with this HOME/AWAY status
      let mConq = 0;
      let dpConq = 0;
      const scoutsConq: Partial<Record<keyof Scout, { media: number; desvioPadrao: number }>> = {};
      
      if (tStats) {
        const conqStats = isHome ? tStats.conquistadosCasa[pos] : tStats.conquistadosFora[pos];
        if (conqStats && conqStats.jogos > 0) {
          mConq = conqStats.pontos / conqStats.jogos;
          const variance = (conqStats.sumSq / conqStats.jogos) - (mConq * mConq);
          dpConq = variance > 0 ? Math.sqrt(variance) : 0;
          
          if (conqStats.scouts) {
            for (const [key, val] of Object.entries(conqStats.scouts)) {
              if (val) {
                const s = key as keyof Scout;
                const valStats = val as { pontos: number; sumSq: number };
                const media = valStats.pontos / conqStats.jogos;
                const scVariance = (valStats.sumSq / conqStats.jogos) - (media * media); 
                const dp = scVariance > 0 ? Math.sqrt(scVariance) : 0;
                scoutsConq[s] = { media, desvioPadrao: dp };
              }
            }
          }
        }
      }
      enriched.mediaConquistada = mConq;
      enriched.desvioPadraoConquistada = dpConq;
      enriched.scoutsConquistados = scoutsConq;

      // M.CED: Conceded by the OPPONENT to this POSITION with their HOME/AWAY status
      let mCed = 0;
      let dpCed = 0;
      const scoutsCed: Partial<Record<keyof Scout, { media: number; desvioPadrao: number }>> = {};

      if (oppStats) {
        // opponent's isHome is the opposite of ours
        const oppIsHome = !isHome; 
        const cedStats = oppIsHome ? oppStats.cedidosCasa[pos] : oppStats.cedidosFora[pos];
        if (cedStats && cedStats.jogos > 0) {
          mCed = cedStats.pontos / cedStats.jogos;
          const variance = (cedStats.sumSq / cedStats.jogos) - (mCed * mCed);
          dpCed = variance > 0 ? Math.sqrt(variance) : 0;

          if (cedStats.scouts) {
            for (const [key, val] of Object.entries(cedStats.scouts)) {
              if (val) {
                const s = key as keyof Scout;
                const valStats = val as { pontos: number; sumSq: number };
                const media = valStats.pontos / cedStats.jogos;
                const scVariance = (valStats.sumSq / cedStats.jogos) - (media * media);
                const dp = scVariance > 0 ? Math.sqrt(scVariance) : 0;
                scoutsCed[s] = { media, desvioPadrao: dp };
              }
            }
          }
        }
      }
      enriched.mediaCedida = mCed;
      enriched.desvioPadraoCedida = dpCed;
      enriched.scoutsCedidos = scoutsCed;

      // SOMA
      enriched.somaConqCed = mConq + mCed;
      enriched.proximoJogoMando = isHome ? 'casa' : 'fora';

      // Extract Player Scouts across contexts
      const scoutsPlayer: ScoutContextStats = { total: {}, casa: {}, fora: {} };
      if (pStats) {
        const buildScoutCtx = (aggStat: AggregatedStats): Partial<Record<keyof Scout, ScoutStatsObj>> => {
          const res: Partial<Record<keyof Scout, ScoutStatsObj>> = {};
          const count = aggStat.jogosReais || aggStat.jogos;
          if (count > 0 && aggStat.scouts) {
            for (const [key, val] of Object.entries(aggStat.scouts)) {
              if (val) {
                const s = key as keyof Scout;
                const media = val.pontos / count;
                const scVariance = (val.sumSq / count) - (media * media);
                const dp = scVariance > 0 ? Math.sqrt(scVariance) : 0;
                res[s] = { media, desvioPadrao: dp };
              }
            }
          }
          return res;
        };
        scoutsPlayer.total = buildScoutCtx(pStats.total);
        scoutsPlayer.casa = buildScoutCtx(pStats.casa);
        scoutsPlayer.fora = buildScoutCtx(pStats.fora);
      }
      enriched.scoutsPlayer = scoutsPlayer;

      // Extract Opponent Concededs across contexts
      const scoutsAdversario: ScoutContextStats = { total: {}, casa: {}, fora: {} };
      if (oppStats) {
        const buildScoutCtx = (aggStat: AggregatedStats): Partial<Record<keyof Scout, ScoutStatsObj>> => {
          const res: Partial<Record<keyof Scout, ScoutStatsObj>> = {};
          const count = aggStat.jogosReais || aggStat.jogos;
          if (count > 0 && aggStat.scouts) {
            for (const [key, val] of Object.entries(aggStat.scouts)) {
              if (val) {
                const s = key as keyof Scout;
                const media = val.pontos / count;
                const scVariance = (val.sumSq / count) - (media * media);
                const dp = scVariance > 0 ? Math.sqrt(scVariance) : 0;
                res[s] = { media, desvioPadrao: dp };
              }
            }
          }
          return res;
        };

        const cCasa = oppStats.cedidosCasa[pos] || { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        const cFora = oppStats.cedidosFora[pos] || { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };

        scoutsAdversario.casa = buildScoutCtx(cCasa);
        scoutsAdversario.fora = buildScoutCtx(cFora);
        
        const totalOppAgg: AggregatedStats = {
           jogos: cCasa.jogos + cFora.jogos,
           pontos: cCasa.pontos + cFora.pontos,
           sumSq: cCasa.sumSq + cFora.sumSq,
           scouts: {}
        };
        // Merge scouts for total
        for (const [key, val] of Object.entries(cCasa.scouts)) {
           if (val) {
             const s = key as keyof Scout;
             const v = val as { pontos: number; sumSq: number };
             totalOppAgg.scouts[s] = { pontos: v.pontos, sumSq: v.sumSq };
           }
        }
        for (const [key, val] of Object.entries(cFora.scouts)) {
           if (val) {
             const s = key as keyof Scout;
             const v = val as { pontos: number; sumSq: number };
             if (!totalOppAgg.scouts[s]) totalOppAgg.scouts[s] = { pontos: 0, sumSq: 0 };
             totalOppAgg.scouts[s]!.pontos += v.pontos;
             totalOppAgg.scouts[s]!.sumSq += v.sumSq;
           }
        }
        scoutsAdversario.total = buildScoutCtx(totalOppAgg);
      }
      enriched.scoutsAdversario = scoutsAdversario;

      // Compute Índice de Momento: simple average of last 3 rounds
      if (pStats && pStats.roundHistory.length > 0) {
        const hist = pStats.roundHistory;
        enriched.lastRoundsHistory = hist;

        const last3 = hist.slice(-3);
        const sum = last3.reduce((acc: number, val: number) => acc + val, 0);
        enriched.indiceMomento = last3.length > 0 ? sum / last3.length : 0;
      } else {
        enriched.lastRoundsHistory = [];
        enriched.indiceMomento = 0;
      }

      // 70% Mando / 30% Total do cruzamento P(jogador) e P(adversario_cede)
      let aiScore = 0;
      const allScouts = new Set([...Object.keys(scoutsPlayer.total || {}), ...Object.keys(scoutsAdversario.total || {})]);
      for (const k of allScouts) {
        const s = k as keyof Scout;
        const ptsValue = SCOUT_POINTS[s] || 0;
        
        const pTotal = scoutsPlayer.total?.[s]?.media || 0;
        const aTotal = scoutsAdversario.total?.[s]?.media || 0;
        const avgTotal = (pTotal + aTotal) / 2;

        const homeState = enriched.proximoJogoMando;
        const oppState = homeState === 'casa' ? 'fora' : 'casa';
        
        const pMando = homeState ? (scoutsPlayer[homeState]?.[s]?.media || 0) : pTotal;
        const aMando = oppState ? (scoutsAdversario[oppState]?.[s]?.media || 0) : aTotal;
        const avgMando = (pMando + aMando) / 2;

        const proj = (avgMando * 0.7) + (avgTotal * 0.3);
        const scoutPts = proj * ptsValue;
        aiScore += scoutPts;
      }
      
      // Plugar Dificuldade (FDR)
      let fdrMultiplier = 1.0;
      if (globalLeagueAverages && globalLeagueAverages[enriched.posicao_id]) {
        const glStats = globalLeagueAverages[enriched.posicao_id];
        // Média global de pontos cedidos para esta posição
        const globalConcededAvg = glStats.jogos > 0 ? glStats.pontos / glStats.jogos : 0;
        
        if (globalConcededAvg > 0 && enriched.mediaCedida !== undefined) {
          fdrMultiplier = enriched.mediaCedida / globalConcededAvg;
        }
      }
      // Limite do FDR: entre 0.7 e 1.3 (± 30%)
      fdrMultiplier = Math.max(0.7, Math.min(1.3, fdrMultiplier));
      
      // Plugar Momentum
      let momentumMultiplier = 1.0;
      if (enriched.mediaGeralPeriodo && enriched.mediaGeralPeriodo > 0 && enriched.indiceMomento !== undefined) {
        momentumMultiplier = enriched.indiceMomento / enriched.mediaGeralPeriodo;
      }
      // Limite do Momentum: entre 0.7 e 1.3 (± 30%)
      momentumMultiplier = Math.max(0.7, Math.min(1.3, momentumMultiplier));

      enriched.previsaoIA = aiScore * fdrMultiplier * momentumMultiplier;
      // --- IMPLEMENTAÇÃO DOS 4 PILARES DO SCORE ---
      
      const playerMediaNoMando = isHome ? enriched.mediaCasaPeriodo : enriched.mediaForaPeriodo;
      const mediaConfronto = (mConq + mCed) / 2;

      // PILAR 1: Projeção Base (60% Jogador / 40% Contexto)
      const projBase = (playerMediaNoMando * 0.6) + (mediaConfronto * 0.4);

      // PILAR 2 & 4: Encaixe de Scouts & Peso dos Scouts (Afinidade Tática)
      // SCOUT_POINTS is imported from constants.ts

      let afinidadeTatica = 0;
      if (pStats && (pStats.total.jogosReais || pStats.total.jogos) > 0 && enriched.scoutsCedidos) {
        const pTotalJogos = pStats.total.jogosReais || pStats.total.jogos;
        for (const [s, data] of Object.entries(enriched.scoutsCedidos)) {
          const pScoutMedia = (pStats.total.scouts[s as keyof Scout]?.pontos || 0) / pTotalJogos;
          const oppCedMedia = data.media;
          const sPoint = SCOUT_POINTS[s] || 0;
          
          // Afinidade = (Média de volume do jogador) * (Vulnerabilidade do adversário) * (Pontos do Scout)
          // Usamos sqrt para não explodir o valor, apenas dar um bônus de alinhamento
          afinidadeTatica += Math.sqrt(Math.abs(pScoutMedia * oppCedMedia)) * sPoint;
        }
      }

      // PILAR 3: Fator de Regularidade (Risco)
      // CV = Coeficiente de Variação (DP / Média)
      const cv = enriched.mediaGeralPeriodo > 0 ? (enriched.regularidade || 0) / enriched.mediaGeralPeriodo : 1;
      const fatorRisco = Math.max(0.5, 1 - (cv * 0.15)); // Pune no máximo 50%

      // CÁLCULO FINAL DO SCORE
      // Score = (ProjBase + Afinidade) * FatorRisco
      // Limitamos a afinidade para não distorcer demais a projeção base (máx 30% de bônus/ônus)
      const afinidadeLimitada = Math.max(-2, Math.min(2, afinidadeTatica));
      
      enriched.mediaComposta = (projBase + afinidadeLimitada) * fatorRisco;
      enriched.mccPersonalizado = projBase; // Mantemos o antigo MCC como a Projeção Base para referência

    } else {
      enriched.mediaConquistada = 0;
      enriched.desvioPadraoConquistada = 0;
      enriched.mediaCedida = 0;
      enriched.desvioPadraoCedida = 0;
      enriched.somaConqCed = 0;
      enriched.mccPersonalizado = 0;
      enriched.mediaComposta = 0;
      enriched.scoutsConquistados = {};
      enriched.scoutsCedidos = {};
    }

    return enriched;
  });
}

/**
 * Loads and processes historical raw data from Firestore.
 */
async function loadHistoricalDataFromFirestore(timeframe: Timeframe) {
  // 1. Fetch all available rounds
  const rodadasSnapshot = await getDocs(collection(db, 'rodadas'));
  const availableRounds = rodadasSnapshot.docs
    .map(doc => parseInt(doc.id, 10))
    .filter(id => !isNaN(id))
    .sort((a, b) => a - b);

  if (availableRounds.length === 0) {
    return { playerStats: {}, teamStats: {} };
  }

  // 2. Filter by timeframe
  let targetRounds = availableRounds;
  if (timeframe !== 'all') {
    const limit = parseInt(timeframe, 10);
    targetRounds = availableRounds.slice(-limit);
  }

  // Aggregation structures
  const playerStats: Record<number, { 
    total: AggregatedStats; 
    casa: AggregatedStats; 
    fora: AggregatedStats;
    pontosUltimaRodada?: number;
    roundHistory: number[]; // raw score per round, ascending order
  }> = {};

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

  const addStat = (record: Record<number, AggregatedStats>, pos: number, pts: number) => {
    if (!record[pos]) record[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
    record[pos].pontos += pts;
    // We increment 'jogos' per position per match later, or we can just use total points / matches.
    // Actually, multiple players of the same position can play. A team conquering points in a position:
    // It's usually "Total points by all attackers / number of matches". 
    // Wait, if a team plays 3 attackers, they score 15 combined. 
    // The "Conquered points by attackers" for that MATCH is 15.
    // If they play 2 matches, the average is 15 / 2 = 7.5.
    // So we should group by MATCH first, sum points per position, then add to TeamStats.
  };

  // 3. Process each round — most recent round gets weight 1.0, older rounds get 0.9^n
  const totalRounds = targetRounds.length;
  for (let roundIdx = 0; roundIdx < totalRounds; roundIdx++) {
    const round = targetRounds[roundIdx];
    // Weight: 1.0 for most recent, ROUND_DECAY^1 for second-to-last, etc.
    const decayWeight = Math.pow(ROUND_DECAY, totalRounds - 1 - roundIdx);
    const partidasSnap = await getDocs(collection(db, 'rodadas', String(round), 'partidas'));
    const atletasSnap = await getDocs(collection(db, 'rodadas', String(round), 'atletas'));

    // Map match context for this round:
    // Who played home, who played away
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

    // Temporarily hold points per match to calculate team averages correctly
    // matchId -> homeTeamPointsByPos, awayTeamPointsByPos
    type TeamPosStats = Record<number, { pontos: number; count: number; sumSq: number; scouts: Partial<Record<keyof Scout, ScoutStats>> }>;
    const matchPoints: Record<number, { homeConquered: TeamPosStats, awayConquered: TeamPosStats }> = {};

    validMatches.forEach(m => {
      matchPoints[m.partida_id] = { homeConquered: {}, awayConquered: {} };
    });

    // Process athletes
    atletasSnap.forEach(doc => {
      const atleta = doc.data() as AtletaPontuado;
      const atletaId = parseInt(doc.id, 10);
      
      if (atleta.entrou_em_campo && atleta.pontuacao !== undefined && !isNaN(atletaId)) {
        
        // --- 3a. Update Player Stats ---
        if (!playerStats[atletaId]) {
          playerStats[atletaId] = { 
            total: { jogos: 0, pontos: 0, sumSq: 0, jogosReais: 0, pontosReais: 0, scouts: {} }, 
            casa: { jogos: 0, pontos: 0, sumSq: 0, jogosReais: 0, pontosReais: 0, scouts: {} }, 
            fora: { jogos: 0, pontos: 0, sumSq: 0, jogosReais: 0, pontosReais: 0, scouts: {} },
            roundHistory: [],
          };
        }

        // Track per-round raw score for sparkline
        playerStats[atletaId].roundHistory.push(atleta.pontuacao);

        // Salvar a pontuação se for a última rodada do recorte
        if (round === Math.max(...targetRounds)) {
          playerStats[atletaId].pontosUltimaRodada = atleta.pontuacao;
        }
        
        const pStat = playerStats[atletaId];
        const matchContext = roundMatches[atleta.clube_id];
        
        // Sum total — apply exponential decay so recent rounds weight more
        const weightedPts = atleta.pontuacao * decayWeight;
        pStat.total.jogos += decayWeight; // weighted count
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

          // --- 3b. Accumulate Match Points for Teams ---
          // Find the related match
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

                // Update Player Scout Stats
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

                // Update Team Scout Stats
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

    // --- 3c. Update Team Aggregates (M.CONQ and M.CED) ---
    for (const match of validMatches) {
      const mPts = matchPoints[match.partida_id];
      const homeTeamInfo = getTeamStats(match.clube_casa_id);
      const awayTeamInfo = getTeamStats(match.clube_visitante_id);

      // Helper loop to merge scout properties
      const mergeScouts = (target: AggregatedStats, sourceScouts: Partial<Record<keyof Scout, ScoutStats>>) => {
        for (const [key, val] of Object.entries(sourceScouts)) {
          const s = key as keyof Scout;
          if (!target.scouts[s]) target.scouts[s] = { pontos: 0, sumSq: 0 };
          target.scouts[s]!.pontos += val!.pontos;
          target.scouts[s]!.sumSq += val!.sumSq;
        }
      };

      // Home Team conquered points
      for (const [posStr, stats] of Object.entries(mPts.homeConquered)) {
        const pos = parseInt(posStr, 10);
        if (!homeTeamInfo.conquistadosCasa[pos]) homeTeamInfo.conquistadosCasa[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        homeTeamInfo.conquistadosCasa[pos].jogos += stats.count; // Add number of players
        homeTeamInfo.conquistadosCasa[pos].pontos += stats.pontos;
        homeTeamInfo.conquistadosCasa[pos].sumSq += stats.sumSq;
        mergeScouts(homeTeamInfo.conquistadosCasa[pos], stats.scouts);

        // The exact points Home Team conquered were CONCEDED by Away Team
        if (!awayTeamInfo.cedidosFora[pos]) awayTeamInfo.cedidosFora[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        awayTeamInfo.cedidosFora[pos].jogos += stats.count;
        awayTeamInfo.cedidosFora[pos].pontos += stats.pontos;
        awayTeamInfo.cedidosFora[pos].sumSq += stats.sumSq;
        mergeScouts(awayTeamInfo.cedidosFora[pos], stats.scouts);
      }

      // Away Team conquered points
      for (const [posStr, stats] of Object.entries(mPts.awayConquered)) {
        const pos = parseInt(posStr, 10);
        if (!awayTeamInfo.conquistadosFora[pos]) awayTeamInfo.conquistadosFora[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        awayTeamInfo.conquistadosFora[pos].jogos += stats.count;
        awayTeamInfo.conquistadosFora[pos].pontos += stats.pontos;
        awayTeamInfo.conquistadosFora[pos].sumSq += stats.sumSq;
        mergeScouts(awayTeamInfo.conquistadosFora[pos], stats.scouts);

        // The exact points Away Team conquered were CONCEDED by Home Team
        if (!homeTeamInfo.cedidosCasa[pos]) homeTeamInfo.cedidosCasa[pos] = { jogos: 0, pontos: 0, sumSq: 0, scouts: {} };
        homeTeamInfo.cedidosCasa[pos].jogos += stats.count;
        homeTeamInfo.cedidosCasa[pos].pontos += stats.pontos;
        homeTeamInfo.cedidosCasa[pos].sumSq += stats.sumSq;
        mergeScouts(homeTeamInfo.cedidosCasa[pos], stats.scouts);
      }
    }
  }

  // Calculate Global League Averages (FDR base)
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
