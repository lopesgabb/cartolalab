# 📗 Manual do CartolaLab: Entenda nossos Indicadores

Bem-vindo ao **CartolaLab**! Nosso objetivo é transformar dados complexos em decisões simples para você mitar no Cartola. Este guia explica cada coluna e cálculo do nosso sistema de forma clara e intuitiva.

---

## 1. As Médias de Base (Histórico do Atleta)

Estes números mostram o "currículo" do jogador no período selecionado (últimas 3, 5 rodadas ou todo o campeonato):

*   **MG(p) (Média Geral no Período):** É a pontuação média do jogador em todos os jogos que ele participou no período escolhido.
*   **M.Casa / M.Fora:** Mostra como o jogador se comporta dependendo de onde joga. Muitos atletas "mitam" em casa, mas desaparecem fora, e vice-versa.
*   **Regularidade:** Indica se o jogador é constante. 
    *   *Quanto menor o número, mais regular ele é.* 
    *   Um jogador com regularidade alta é o famoso "8 ou 80": pode fazer 20 pontos ou -3.

---

## 2. Indicadores de Contexto (O Próximo Jogo)

Aqui olhamos para o cenário da rodada atual (quem o jogador vai enfrentar):

*   **M.CONQ (Média Conquistada):** Mostra quantos pontos o **TIME** do jogador costuma fazer naquela posição específica. 
    *   *Exemplo:* Se o Palmeiras em casa costuma pontuar bem com laterais, a M.CONQ do lateral do Palmeiras será alta.
*   **M.CED (Média Cedida):** Indica quantos pontos o **ADVERSÁRIO** costuma entregar para aquela posição. É o famoso "caminho das pedras".
*   **SOMA (M.CONQ + M.CED):** É a força do confronto. Se a soma for alta, o cenário é muito favorável para aquela posição.

---

## 3. Indicadores Avançados (O Coração do Lab)

Aqui entra a nossa inteligência para projetar o desempenho:

### **M.COMP (Média Composta)**
É o nosso indicador mais equilibrado. Ele usa a fórmula:
`((Média Mando * 0.6 + Média Confronto * 0.4) + Afinidade) * Fator de Risco`

*   **O que significa?** Nós pegamos o histórico do jogador no mando de campo (60% de peso) e somamos com a força do confronto (40% de peso). 
*   **Afinidade:** Damos um bônus se os "scouts" (ações de jogo como desarmes e finalizações) que o jogador faz batem com o que o adversário costuma ceder.
*   **Fator de Risco:** Reduzimos levemente o score de jogadores muito instáveis para proteger você de possíveis "zicas".

### **IA SCORE (Previsão da IA)**
Nossa Inteligência Artificial cruza todos os scouts individualmente. Ela projeta ponto a ponto o que pode acontecer no jogo, considerando o momento atual do atleta e a dificuldade da partida.

---

## 4. Tomada de Decisão (O Ranking Final)

*   **Momento:** Avalia apenas as últimas 3 rodadas. Serve para identificar quem está em "fase iluminada".
*   **SOMA POS (Soma de Rankings):** Este é o indicador definitivo para quem não quer ter dúvida. 
    *   Nós ranqueamos todos os jogadores por vários critérios (IA Score, M.COMP, Média Geral, etc.).
    *   **Quanto menor a SOMA POS, melhor o jogador.** 
    *   Se um jogador está no topo de vários rankings diferentes, a SOMA POS dele será baixíssima, indicando que ele é a melhor escolha da rodada.

---

## 💡 Dica de Ouro
Use a **SOMA POS** para filtrar os melhores da rodada e depois olhe a **M.COMP** para confirmar se o risco vale a pena. Boa sorte e boas mitadas!
