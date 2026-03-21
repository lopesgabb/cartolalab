import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { AtletaEnriquecido, Partida, AtletaPontuado, Scout } from '@/types/cartola';

export type Timeframe = '3' | '5' | 'all';

// In-memory cache for historical data to prevent hitting Firestore on every page load
const historicalCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface ScoutStats {
  pontos: number;
  sumSq: number;
}

interface AggregatedStats {
  jogos: number;
  pontos: number;
  sumSq: number;
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
  const cacheKey = `history_${timeframe}`;
  let historyData = historicalCache.get(cacheKey);

  if (!historyData || Date.now() - historyData.timestamp > CACHE_TTL) {
    historyData = await loadHistoricalDataFromFirestore(timeframe);
    historicalCache.set(cacheKey, { data: historyData, timestamp: Date.now() });
  } else {
    historyData = historyData.data;
  }

  const { playerStats, teamStats } = historyData;

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
    const enriched = { ...atleta };
    const pStats = playerStats[atleta.atleta_id];
    
    // Player historical averages
    // Player historical averages and regularity
    if (pStats) {
      enriched.mediaGeralPeriodo = pStats.total.jogos > 0 ? pStats.total.pontos / pStats.total.jogos : 0;
      enriched.mediaCasaPeriodo = pStats.casa.jogos > 0 ? pStats.casa.pontos / pStats.casa.jogos : 0;
      enriched.mediaForaPeriodo = pStats.fora.jogos > 0 ? pStats.fora.pontos / pStats.fora.jogos : 0;
      
      // Regularidade individual (Desvio Padrão)
      const variance = (pStats.total.sumSq / pStats.total.jogos) - (enriched.mediaGeralPeriodo ** 2);
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

      // --- IMPLEMENTAÇÃO DOS 4 PILARES DO SCORE ---
      
      const playerMediaNoMando = isHome ? enriched.mediaCasaPeriodo : enriched.mediaForaPeriodo;
      const mediaConfronto = (mConq + mCed) / 2;

      // PILAR 1: Projeção Base (60% Jogador / 40% Contexto)
      const projBase = (playerMediaNoMando * 0.6) + (mediaConfronto * 0.4);

      // PILAR 2 & 4: Encaixe de Scouts & Peso dos Scouts (Afinidade Tática)
      // Definimos o peso dos scouts usando a constante SCOUT_POINTS do Cartola
      const SCOUT_POINTS: Record<string, number> = {
        G: 8.0, A: 5.0, SG: 5.0, DS: 1.2, FC: -0.5, FS: 0.5,
        FF: 0.8, FD: 1.0, FT: 3.0, DE: 3.0, GS: -2.0, CA: -2.0,
        CV: -5.0, PC: -3.0, PP: -4.0, PS: 1.0, I: -0.5, V: 1.0, DP: 7.0,
      };

      let afinidadeTatica = 0;
      if (pStats && pStats.total.jogos > 0 && enriched.scoutsCedidos) {
        for (const [s, data] of Object.entries(enriched.scoutsCedidos)) {
          const pScoutMedia = (pStats.total.scouts[s as keyof Scout]?.pontos || 0) / pStats.total.jogos;
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
    fora: AggregatedStats 
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

  // 3. Process each round
  for (const round of targetRounds) {
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
            total: { jogos: 0, pontos: 0, sumSq: 0, scouts: {} }, 
            casa: { jogos: 0, pontos: 0, sumSq: 0, scouts: {} }, 
            fora: { jogos: 0, pontos: 0, sumSq: 0, scouts: {} } 
          };
        }
        
        const pStat = playerStats[atletaId];
        const matchContext = roundMatches[atleta.clube_id];
        
        // Sum total
        pStat.total.jogos += 1;
        pStat.total.pontos += atleta.pontuacao;
        pStat.total.sumSq += (atleta.pontuacao ** 2);
        
        if (matchContext) {
          if (matchContext.isHome) {
            pStat.casa.jogos += 1;
            pStat.casa.pontos += atleta.pontuacao;
            pStat.casa.sumSq += (atleta.pontuacao ** 2);
          } else {
            pStat.fora.jogos += 1;
            pStat.fora.pontos += atleta.pontuacao;
            pStat.fora.sumSq += (atleta.pontuacao ** 2);
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

  return { playerStats, teamStats };
}
