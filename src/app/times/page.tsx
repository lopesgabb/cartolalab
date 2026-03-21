import { CartolaAPI } from '@/lib/cartola-api';
import { enrichAtletas } from '@/lib/indicators';
import type { AtletaEnriquecido, Clube } from '@/types/cartola';
import TimesClient, { type TeamStats } from './TimesClient';

export const revalidate = 300;

export const metadata = {
  title: 'Times | CartolaLab',
  description: 'Estatísticas de times do Brasileirão. Pontos conquistados e cedidos por posição.',
};

function calculateTeamStats(atletas: AtletaEnriquecido[], clubes: Record<string, Clube>): TeamStats[] {
  const teamMap = new Map<number, {
    total: number;
    count: number;
    porPosicao: Record<number, { total: number; count: number }>;
  }>();

  for (const a of atletas) {
    if (a.jogos_num < 1) continue;
    let team = teamMap.get(a.clube_id);
    if (!team) {
      team = { total: 0, count: 0, porPosicao: {} };
      teamMap.set(a.clube_id, team);
    }
    team.total += a.media_num;
    team.count++;

    if (!team.porPosicao[a.posicao_id]) {
      team.porPosicao[a.posicao_id] = { total: 0, count: 0 };
    }
    team.porPosicao[a.posicao_id].total += a.media_num;
    team.porPosicao[a.posicao_id].count++;
  }

  const stats: TeamStats[] = [];
  for (const [clubeId, data] of teamMap) {
    const clube = clubes[String(clubeId)];
    if (!clube) continue;

    const porPosicao: Record<number, { media: number; total: number; count: number }> = {};
    for (const [posId, pos] of Object.entries(data.porPosicao)) {
      porPosicao[Number(posId)] = {
        media: Number((pos.total / pos.count).toFixed(2)),
        total: Number(pos.total.toFixed(2)),
        count: pos.count,
      };
    }

    stats.push({
      clube,
      totalPontos: Number(data.total.toFixed(2)),
      totalJogadores: data.count,
      porPosicao,
      mediaGeral: data.count > 0 ? Number((data.total / data.count).toFixed(2)) : 0,
    });
  }

  return stats.sort((a, b) => b.mediaGeral - a.mediaGeral);
}

export default async function TimesPage() {
  const mercado = await CartolaAPI.getMercado();
  const atletas = enrichAtletas(mercado.atletas, mercado.clubes, mercado.posicoes, mercado.status);
  const teamStats = calculateTeamStats(atletas, mercado.clubes);

  return <TimesClient teamStats={teamStats} />;
}
