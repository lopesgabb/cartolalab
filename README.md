# ⚽ CartolaLab

**CartolaLab** é uma plataforma avançada de análise e dashboard para o Cartola FC. Construída com os princípios modernos de desenvolvimento SaaS, a aplicação transforma dados brutos em decisões estratégicas através de um motor de indicadores sofisticado e arquitetura de alta performance.

---

## 🚀 Funcionalidades Principais

### 🧠 Motor de Indicadores (4 Pilares)
O coração do CartolaLab é seu algoritmo de pontuação que avalia atletas com base em quatro dimensões técnicas:
1.  **Projeção Base**: Média ponderada entre o desempenho histórico do jogador e o contexto da partida (Mando de campo).
2.  **Encaixe de Scouts (Afinidade Tática)**: Correlação entre o volume de scouts cedidos pelo adversário e a especialidade do atleta.
3.  **Fator de Regularidade**: Cálculo do coeficiente de variação para medir a consistência e o risco da escalação.
4.  **Peso Tático**: Atribuição de pesos dinâmicos aos scouts (G, A, DS, etc.) para refletir sua importância no jogo real.

### 📊 Dashboard Interativo
-   **Rankings por Posição**: Visualização rápida das melhores opções para Goleiros, Laterais, Zagueiros, Meias e Atacantes.
-   **Status do Mercado**: Acompanhamento em tempo real do fechamento do mercado e temporada.
-   **Comparativo de Médias**: Diferenciação entre média geral, média em casa e média fora.

---

## 🏛️ Arquitetura SaaS Serverless

O projeto foi refatorado para operar como uma plataforma SaaS pronta para produção (Production-ready):

- **CQRS (Command Query Responsibility Segregation)**: A lógica pesada de agregação de scouts ocorre no momento do *sync* (Command), gravando uma "Read Model" otimizada (`aggregatedStats`). O Front-end apenas consome esse documento, garantindo carregamentos de página instantâneos em *O(1)*.
- **API Stateless**: Totalmente compatível com ambientes *Serverless* (Vercel, AWS Lambda), escalando horizontalmente sem a necessidade de manter estado local em memória.
- **Segurança (DevSecOps)**: 
  - Proteção avançada contra *Timing Attacks* (`crypto.timingSafeEqual`) na validação de endpoints privados.
  - Regras de segurança rigorosas (`firestore.rules`) permitindo leitura apenas do "Read Model" otimizado e bloqueando mutações externas.
- **Domain-Driven Design (DDD)**: O domínio central de cálculos está isolado (`src/lib/domain`), permitindo testabilidade pura e manutenção previsível.

---

## 🛠️ Tech Stack

-   **Frontend**: [Next.js](https://nextjs.org/) (App Router)
-   **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
-   **Estilização**: [Tailwind CSS](https://tailwindcss.com/) com design system customizado
-   **Backend/Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) 
-   **Segurança API**: Node.js Native Crypto APIs
-   **Animações**: [Framer Motion](https://www.framer.com/motion/)

## 🔄 Sincronização de Dados (Atualizando as rodadas)

O CartolaLab possui uma API segura projetada para baixar os dados brutos oficiais do Cartola FC e recalcular todas as métricas e médias complexas do campeonato automaticamente.

Para atualizar o seu painel com novas rodadas, você deve enviar uma requisição via terminal para a API, autenticando-se com a sua chave secreta (que fica no arquivo `.env.local` na variável `SYNC_API_SECRET`).

> **Importante:** O seu servidor local do projeto precisa estar rodando (usando `npm run dev`, por exemplo, na porta 3000 ou 3001) para que a API receba a requisição.

### 1. Atualizar apenas uma rodada específica (Mais rápido - Recomendado)
Use este comando para baixar apenas a rodada mais recente. Exemplo para baixar a **rodada 16**:

```bash
curl -X POST -H "x-api-secret: SUA_CHAVE_SECRETA_AQUI" -d '{"start": 16, "end": 16}' -H "Content-Type: application/json" http://localhost:3000/api/sync-historical
```
*Nota: A arquitetura do sistema é inteligente. Mesmo que você mande baixar apenas a rodada 16, após concluir o download ele olhará para todas as rodadas salvas no seu banco de dados e recalculará as médias totais e rankings de todos os jogadores para garantir a precisão matemática atualizada.*

### 2. Atualizar várias rodadas juntas (Carga inicial)
Se for a primeira vez que você roda o projeto e quiser baixar um lote de rodadas de uma só vez, informe o intervalo completo. Exemplo para baixar da **rodada 1 até a 16**:

```bash
curl -X POST -H "x-api-secret: SUA_CHAVE_SECRETA_AQUI" -d '{"start": 1, "end": 16}' -H "Content-Type: application/json" http://localhost:3000/api/sync-historical
```

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.
