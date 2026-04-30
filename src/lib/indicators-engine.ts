import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { AtletaEnriquecido, Partida, Scout, ScoutContextStats, ScoutStatsObj } from '@/types/cartola';
import { SCOUT_POINTS } from './constants';
import { logger, startTimer } from './logger';
import type { Timeframe, HistoricalAggregates, AggregatedStats } from './domain/aggregation';
export type { Timeframe };

export async function computeAdvancedIndicators(
  atletasAtuais: AtletaEnriquecido[],
  proximasPartidas: Partida[],
  timeframe: Timeframe
): Promise<AtletaEnriquecido[]> {

  // 1. Fetch aggregated historical data from Firestore (CQRS Read Model)
  const timer = startTimer();

  const docRef = doc(db, 'system', 'aggregatedStats');
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    logger.error('indicators-engine', 'Aggregated stats not found in Firestore. Make sure to run the sync process.');
    throw new Error('Aggregated stats not found. Please run the sync process first.');
  }

  const allAggregates = docSnap.data();
  const historyData = allAggregates[timeframe] as HistoricalAggregates;

  if (!historyData) {
    logger.error('indicators-engine', `Aggregated stats for timeframe ${timeframe} not found.`);
    throw new Error(`Aggregated stats for timeframe ${timeframe} not found.`);
  }

  logger.info('indicators-engine', `Firestore aggregated read complete`, timer.elapsed());

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

