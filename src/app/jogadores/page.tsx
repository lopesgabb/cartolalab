import { CartolaAPI } from '@/lib/cartola-api';
import { enrichAtletas } from '@/lib/indicators';
import { computeAdvancedIndicators, type Timeframe } from '@/lib/indicators-engine';
import JogadoresClient from './JogadoresClient';

export const revalidate = 300;

export const metadata = {
  title: 'Jogadores | CartolaLab',
  description: 'Estatísticas completas de todos os jogadores do Cartola FC. Médias, scouts, preços e indicadores avançados.',
};

export default async function JogadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const periodParam = (sp?.period as string) || 'all';
  const period: Timeframe = ['3', '5', 'all'].includes(periodParam) ? (periodParam as Timeframe) : 'all';

  const [mercado, partidasData] = await Promise.all([
    CartolaAPI.getMercado(),
    CartolaAPI.getPartidas(),
  ]);

  let atletas = enrichAtletas(
    mercado.atletas,
    mercado.clubes,
    mercado.posicoes,
    mercado.status
  );

  // Add all advanced indicators: M.CONQ, M.CED, SOMA, MCC, MG, MC, MF
  atletas = await computeAdvancedIndicators(atletas, partidasData?.partidas || [], period);

  return <JogadoresClient atletas={atletas} clubes={mercado.clubes} currentPeriod={period} />;
}
