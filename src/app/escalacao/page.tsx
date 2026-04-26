import { CartolaAPI } from '@/lib/cartola-api';
import { enrichAtletas } from '@/lib/indicators';
import { computeAdvancedIndicators } from '@/lib/indicators-engine';
import EscalacaoClient from './EscalacaoClient';

export const revalidate = 300;

export default async function EscalacaoPage() {
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

  atletas = await computeAdvancedIndicators(atletas, partidasData?.partidas || [], 'all');

  return <EscalacaoClient atletas={atletas} clubes={mercado.clubes} />;
}
