import { CartolaAPI } from '@/lib/cartola-api';
import { enrichAtletas, getTopPlayers } from '@/lib/indicators';
import { computeAdvancedIndicators } from '@/lib/indicators-engine';
import RankingCard from '@/components/RankingCard';

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
  const topScore = getTopPlayers(atletas, 'mediaComposta', 10, 2);
  const topRodada = getTopPlayers(atletas, 'pontos_num', 10, 1);
  const topValorizacao = getTopPlayers(atletas, 'variacao_num', 10, 1);

  // Top 4 por posição usando o Score (M.COMP)
  const topGoleiros = getTopPlayers(atletas.filter(a => a.posicao_id === 1), 'mediaComposta', 4, 1);
  const topLaterais = getTopPlayers(atletas.filter(a => a.posicao_id === 2), 'mediaComposta', 4, 1);
  const topZagueiros = getTopPlayers(atletas.filter(a => a.posicao_id === 3), 'mediaComposta', 4, 1);
  const topMeias = getTopPlayers(atletas.filter(a => a.posicao_id === 4), 'mediaComposta', 4, 1);
  const topAtacantes = getTopPlayers(atletas.filter(a => a.posicao_id === 5), 'mediaComposta', 4, 1);

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


      {/* Top 4 Section */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', marginTop: '2rem' }} className="gradient-text">
        🎯 Melhores Opções por Posição (Score)
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <RankingCard title="🧤 Goleiros" atletas={topGoleiros} metric="mediaComposta" metricLabel="SCORE" />
        <RankingCard title="🛡️ Laterais" atletas={topLaterais} metric="mediaComposta" metricLabel="SCORE" />
        <RankingCard title="🧱 Zagueiros" atletas={topZagueiros} metric="mediaComposta" metricLabel="SCORE" />
        <RankingCard title="🪄 Meias" atletas={topMeias} metric="mediaComposta" metricLabel="SCORE" />
        <RankingCard title="⚽ Atacantes" atletas={topAtacantes} metric="mediaComposta" metricLabel="SCORE" />
      </div>

      {/* Grid of tables */}
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem' }} className="gradient-text">
        📊 Rankings Gerais
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 640px), 1fr))', gap: '1.5rem' }}>
        <RankingCard title="🏆 Top 10 — Melhores Médias" atletas={topMedia} metric="media_num" metricLabel="MG" />
        <RankingCard title="💎 Top 10 — Melhores Opções (Score)" atletas={topScore} metric="mediaComposta" metricLabel="SCORE" />
        <RankingCard title="⚡ Top 10 — Última Rodada" atletas={topRodada} metric="pontos_num" metricLabel="PTS" />
        <RankingCard title="📈 Top 10 — Valorização" atletas={topValorizacao} metric="variacao_num" metricLabel="VAR" />
      </div>
    </div>
  );
}
