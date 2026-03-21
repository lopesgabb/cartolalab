import { CartolaAPI } from '@/lib/cartola-api';
import { enrichAtletas } from '@/lib/indicators';
import CompararClient from './CompararClient';

export const revalidate = 300;

export const metadata = {
  title: 'Comparar Jogadores | CartolaLab',
  description: 'Compare jogadores do Cartola FC lado a lado. Métricas, scouts e indicadores detalhados.',
};

export default async function CompararPage() {
  const mercado = await CartolaAPI.getMercado();

  const atletas = enrichAtletas(
    mercado.atletas,
    mercado.clubes,
    mercado.posicoes,
    mercado.status
  );

  return <CompararClient atletas={atletas} clubes={mercado.clubes} />;
}
