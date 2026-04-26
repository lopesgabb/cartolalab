import { CartolaAPI } from '@/lib/cartola-api';
import { enrichAtletas, getTopPlayers } from '@/lib/indicators';
import { computeAdvancedIndicators } from '@/lib/indicators-engine';
import RankingCard from '@/components/RankingCard';
import EmAlta from '@/components/EmAlta';

export const revalidate = 300;

async function getData() {
  const [mercadoStatus, mercado, partidasData] = await Promise.all([
    CartolaAPI.getMercadoStatus(),
    CartolaAPI.getMercado(),
    CartolaAPI.getPartidas(),
  ]);

  let atletas = enrichAtletas(
    mercado.atletas,
    mercado.clubes,
    mercado.posicoes,
    mercado.status
  );

  // Calcular indicadores avançados (M.CONQ, M.CED, M.COMP) para o dashboard tbm
  atletas = await computeAdvancedIndicators(atletas, partidasData?.partidas || [], 'all');

  return { mercadoStatus, atletas, clubes: mercado.clubes };
}

export default async function DashboardPage() {
  const { mercadoStatus, atletas } = await getData();

  const topMedia = getTopPlayers(atletas, 'media_num', 10, 2);
  const topScore = getTopPlayers(atletas, 'previsaoIA', 10, 2);
  const topRodada = getTopPlayers(atletas, 'pontos_num', 10, 1);
  const topValorizacao = getTopPlayers(atletas, 'variacao_num', 10, 1);

  // Top 4 por posição usando a Previsão IA
  const topGoleiros = getTopPlayers(atletas.filter(a => a.posicao_id === 1), 'previsaoIA', 4, 1);
  const topLaterais = getTopPlayers(atletas.filter(a => a.posicao_id === 2), 'previsaoIA', 4, 1);
  const topZagueiros = getTopPlayers(atletas.filter(a => a.posicao_id === 3), 'previsaoIA', 4, 1);
  const topMeias = getTopPlayers(atletas.filter(a => a.posicao_id === 4), 'previsaoIA', 4, 1);
  const topAtacantes = getTopPlayers(atletas.filter(a => a.posicao_id === 5), 'previsaoIA', 4, 1);

  // "Em Alta" — players with biggest (Momento - MediaGeral) delta
  const emAlta = atletas
    .filter(a => a.indiceMomento !== undefined && a.mediaGeralPeriodo !== undefined && a.jogos_num >= 2 && (a.lastRoundsHistory?.length ?? 0) >= 2)
    .map(a => ({ ...a, deltaMomento: (a.indiceMomento ?? 0) - (a.mediaGeralPeriodo ?? 0) }))
    .sort((a, b) => b.deltaMomento - a.deltaMomento)
    .slice(0, 6);

  const mercadoAberto = mercadoStatus.status_mercado === 1;
  const fechamento = mercadoStatus.fechamento;
  const fechamentoDate = new Date(fechamento.ano, fechamento.mes - 1, fechamento.dia, fechamento.hora, fechamento.minuto);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1.5rem' }}>
      {/* Market Status Banner */}
      <div
        className="card-glow"
        style={{
          marginBottom: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          borderColor: mercadoAberto ? 'var(--color-accent)' : 'var(--color-warning)',
        }}
      >
        <div>
          <p className="stat-label">Status do Mercado</p>
          <p className="stat-value" style={{ color: mercadoAberto ? 'var(--color-accent)' : 'var(--color-warning)', marginTop: '0.25rem' }}>
            {mercadoAberto ? '🟢 Aberto' : '🔴 Fechado'}
          </p>
        </div>
        <div>
          <p className="stat-label">Rodada Atual</p>
          <p className="stat-value" style={{ color: 'var(--color-info)', marginTop: '0.25rem' }}>
            {mercadoStatus.nome_rodada}
          </p>
        </div>
        <div>
          <p className="stat-label">Temporada</p>
          <p className="stat-value" style={{ marginTop: '0.25rem' }}>
            {mercadoStatus.temporada}
          </p>
        </div>
        <div>
          <p className="stat-label">{mercadoAberto ? 'Fechamento' : 'Rodada'}</p>
          <p className="stat-value" style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>
            {fechamentoDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
            {' '}
            {fechamentoDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div>
          <p className="stat-label">Times Escalados</p>
          <p className="stat-value" style={{ marginTop: '0.25rem' }}>
            {mercadoStatus.times_escalados.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>


      {/* Em Alta Section */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem', marginTop: '2rem' }} className="gradient-text">
        🔥 Em Alta — Maior Momento
      </h2>
      <p style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Jogadores com maior Índice de Momento nas últimas 3 rodadas vs. média histórica
      </p>
      <EmAlta atletas={emAlta} />

      {/* Top 4 Section */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', marginTop: '2rem' }} className="gradient-text">
        🎯 Melhores Oportunidades por Posição (Previsão IA)
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <RankingCard title="🧤 Goleiros" atletas={topGoleiros} metric="previsaoIA" metricLabel="IA SCORE" />
        <RankingCard title="🛡️ Laterais" atletas={topLaterais} metric="previsaoIA" metricLabel="IA SCORE" />
        <RankingCard title="🧱 Zagueiros" atletas={topZagueiros} metric="previsaoIA" metricLabel="IA SCORE" />
        <RankingCard title="🪄 Meias" atletas={topMeias} metric="previsaoIA" metricLabel="IA SCORE" />
        <RankingCard title="⚽ Atacantes" atletas={topAtacantes} metric="previsaoIA" metricLabel="IA SCORE" />
      </div>

      {/* Grid of tables */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }} className="gradient-text">
        📊 Rankings Gerais
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 640px), 1fr))', gap: '1.5rem' }}>
        <RankingCard title="🏆 Top 10 — Melhores Médias" atletas={topMedia} metric="media_num" metricLabel="MG" />
        <RankingCard title="💎 Top 10 — Previsões da IA" atletas={topScore} metric="previsaoIA" metricLabel="IA SCORE" />
        <RankingCard title="⚡ Top 10 — Última Rodada" atletas={topRodada} metric="pontos_num" metricLabel="PTS" />
        <RankingCard title="📈 Top 10 — Valorização" atletas={topValorizacao} metric="variacao_num" metricLabel="VAR" />
      </div>
    </div>
  );
}
