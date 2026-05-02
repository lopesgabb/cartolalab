# Design Doc: Tabela Pro de Alta Densidade (Premium)

**Data:** 2026-05-01  
**Status:** Aprovado  
**Tópico:** UI/UX Redesign - Jogadores

## 1. Visão Geral
Transformar a listagem de jogadores do CartolaLab em uma ferramenta de análise de alta performance ("Bloomberg Edition"), combinando densidade máxima de dados com uma estética premium baseada em Glassmorphism e minimalismo técnico.

## 2. Objetivos
*   Visualizar todas as métricas originais em uma única grade sem perder a clareza.
*   Implementar uma experiência de navegação fluida em telas com muitos dados.
*   Elevar a percepção de valor do produto através de acabamento visual moderno.

## 3. Especificações Visuais
*   **Fundo**: `#0A0F1A` (Dark profundo).
*   **Containers**: Glassmorphism com `backdrop-filter: blur(20px)`, bordas sutis (`rgba(255,255,255,0.05)`) e fundo levemente translúcido.
*   **Tipografia**: Inter. Números usando `font-variant-numeric: tabular-nums` para alinhamento vertical perfeito.
*   **Cores de Status**:
    *   Positivo: `#00FF88` (Vibrante)
    *   Negativo: `#FF4D6A`
    *   IA Score/Info: `#4DA6FF`
    *   Soma Pos: `#FFB800` (Dourado/Premium)

## 4. Arquitetura da Tabela
### Estrutura de Fixação (Sticky)
*   **Header**: Fixo no topo com desfoque de fundo.
*   **Primeira Coluna (Atleta)**: Fixa à esquerda para manter o contexto durante a rolagem horizontal das métricas.

### Colunas (Ordem Final)
1.  `#` (Index)
2.  `Atleta` (Avatar + Apelido + Sigla Clube - **Sticky**)
3.  `Pos` (Badge minimalista)
4.  `J` (Jogos no período)
5.  `Últ. Pts` (Pontuação da última rodada)
6.  `Média` (Média oficial Cartola - **Destaque**)
7.  `MG(p)` (Média Geral no Período)
8.  `M. Casa` (Média em Casa)
9.  `M. Fora` (Média Fora)
10. `M. CONQ` (Média Conquistada)
11. `M. CED` (Média Cedida)
12. `SOMA` (M. CONQ + M. CED)
13. `M. COMP` (Média Composta)
14. `IA SCORE` (Previsão da IA)
15. `SOMA POS` (Ranking agregado - **Destaque Dourado**)
16. `Momento` (Sparkline visual das últimas 5 rodadas)

## 5. Funcionalidades de Interação
*   **Hover**: Efeito de iluminação (`glow`) na linha inteira.
*   **Expansão**: Clique na linha para expandir detalhes adicionais (detalhamento de scouts e histórico).
*   **Ordenação**: Feedback visual claro da coluna ativa (cor e ícone).

## 6. Considerações Técnicas
*   Uso de `Tailwind CSS 4` para variáveis de tema.
*   `Framer Motion` para animações suaves de entrada e expansão.
*   Otimização de renderização para evitar lag em tabelas de 100+ linhas.
*   Imagens: Uso das URLs reais da API (escudos e fotos).
