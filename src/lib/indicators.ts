import type { Atleta, AtletaEnriquecido, Clube, Posicao, StatusJogador, Scout, SCOUT_POINTS } from '@/types/cartola';

/**
 * Enrich raw player data with club, position, status objects and computed indicators
 */
export function enrichAtletas(
  atletas: Atleta[],
  clubes: Record<string, Clube>,
  posicoes: Record<string, Posicao>,
  status: Record<string, StatusJogador>
): AtletaEnriquecido[] {
  return atletas.map((atleta) => ({
    ...atleta,
    clube: clubes[String(atleta.clube_id)],
    posicao: posicoes[String(atleta.posicao_id)],
    statusJogador: status[String(atleta.status_id)] || { id: atleta.status_id, nome: 'Desconhecido' },
    custoBeneficio: atleta.preco_num > 0 ? Number((atleta.media_num / atleta.preco_num).toFixed(2)) : 0,
  }));
}

/**
 * Calculate cost-benefit ratio
 */
export function custoBeneficio(media: number, preco: number): number {
  if (preco <= 0) return 0;
  return Number((media / preco).toFixed(2));
}

/**
 * Calculate standard deviation (regularity) for a set of scores
 * Lower = more regular
 */
export function regularidade(pontuacoes: number[]): number {
  if (pontuacoes.length < 2) return 0;
  const mean = pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length;
  const squaredDiffs = pontuacoes.map((p) => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / pontuacoes.length;
  return Number(Math.sqrt(variance).toFixed(2));
}

/**
 * Determine form trend from last N scores
 * Returns array of 'up', 'down', or 'stable' indicators
 */
export function calcularForma(pontuacoes: number[]): ('up' | 'down' | 'stable')[] {
  if (pontuacoes.length < 2) return [];
  const forma: ('up' | 'down' | 'stable')[] = [];
  for (let i = 1; i < pontuacoes.length; i++) {
    const diff = pontuacoes[i] - pontuacoes[i - 1];
    if (diff > 1) forma.push('up');
    else if (diff < -1) forma.push('down');
    else forma.push('stable');
  }
  return forma;
}

/**
 * Get total scout points breakdown for a player
 */
export function calcularScoutPoints(scout: Scout): { total: number; breakdown: { key: string; count: number; points: number }[] } {
  const scoutPoints: Record<string, number> = {
    G: 8.0, A: 5.0, SG: 5.0, DS: 1.2, FC: -0.5, FS: 0.5,
    FF: 0.8, FD: 1.0, FT: 3.0, DE: 3.0, GS: -2.0, CA: -2.0,
    CV: -5.0, PC: -3.0, PP: -4.0, PS: 1.0, I: -0.5, V: 1.0, DP: 7.0,
  };

  const breakdown: { key: string; count: number; points: number }[] = [];
  let total = 0;

  for (const [key, count] of Object.entries(scout)) {
    if (count && scoutPoints[key] !== undefined) {
      const points = count * scoutPoints[key];
      breakdown.push({ key, count, points: Number(points.toFixed(1)) });
      total += points;
    }
  }

  breakdown.sort((a, b) => b.points - a.points);
  return { total: Number(total.toFixed(1)), breakdown };
}

/**
 * Sort players by a given field
 */
export function sortAtletas(
  atletas: AtletaEnriquecido[],
  field: keyof AtletaEnriquecido | 'custoBeneficio',
  direction: 'asc' | 'desc' = 'desc'
): AtletaEnriquecido[] {
  return [...atletas].sort((a, b) => {
    const aVal = a[field as keyof AtletaEnriquecido];
    const bVal = b[field as keyof AtletaEnriquecido];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'desc' ? bVal - aVal : aVal - bVal;
    }
    return 0;
  });
}

/**
 * Filter players by position, club, status, price range, and minimum games
 */
export function filterAtletas(
  atletas: AtletaEnriquecido[],
  filters: {
    posicaoId?: number;
    clubeId?: number;
    statusId?: number;
    precoMin?: number;
    precoMax?: number;
    jogosMin?: number;
    search?: string;
  }
): AtletaEnriquecido[] {
  return atletas.filter((a) => {
    if (filters.posicaoId && a.posicao_id !== filters.posicaoId) return false;
    if (filters.clubeId && a.clube_id !== filters.clubeId) return false;
    if (filters.statusId && a.status_id !== filters.statusId) return false;
    if (filters.precoMin !== undefined && a.preco_num < filters.precoMin) return false;
    if (filters.precoMax !== undefined && a.preco_num > filters.precoMax) return false;
    if (filters.jogosMin !== undefined && a.jogos_num < filters.jogosMin) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        a.apelido.toLowerCase().includes(searchLower) ||
        a.nome.toLowerCase().includes(searchLower) ||
        (a.clube?.apelido?.toLowerCase().includes(searchLower) ?? false)
      );
    }
    return true;
  });
}

/**
 * Get top N players by a metric
 */
export function getTopPlayers(
  atletas: AtletaEnriquecido[],
  metric: 'media_num' | 'pontos_num' | 'custoBeneficio' | 'variacao_num' | 'mediaComposta' | 'previsaoIA',
  n: number = 10,
  minGames: number = 1
): AtletaEnriquecido[] {
  return atletas
    .filter((a) => (a.jogos_num || 0) >= minGames && a.status_id === 7) // Apenas prováveis
    .sort((a, b) => {
      const aVal = metric === 'custoBeneficio' ? (a.custoBeneficio || 0) : ((a[metric as keyof AtletaEnriquecido] as number) || 0);
      const bVal = metric === 'custoBeneficio' ? (b.custoBeneficio || 0) : ((b[metric as keyof AtletaEnriquecido] as number) || 0);
      return bVal - aVal;
    })
    .slice(0, n);
}
