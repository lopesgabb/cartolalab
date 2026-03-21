# ⚽ CartolaLab

**CartolaLab** é uma plataforma avançada de análise e dashboard para o Cartola FC. O objetivo do projeto é transformar dados brutos em decisões estratégicas através de um motor de indicadores sofisticado.

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

## 🛠️ Tech Stack

-   **Frontend**: [Next.js 15](https://nextjs.org/) (App Router)
-   **Linguagem**: [TypeScript](https://www.typescriptlang.org/)
-   **Estilização**: [Tailwind CSS](https://tailwindcss.com/) com design system customizado.
-   **Animações**: [Framer Motion](https://www.framer.com/motion/) para transições fluidas.
-   **Backend/Database**: [Firebase Firestore](https://firebase.google.com/docs/firestore) para armazenamento de dados históricos das rodadas.
-   **Ícones**: [Lucide React](https://lucide.dev/)

---

## ⚙️ Como Executar

1.  **Clone o repositório**:
    ```bash
    git clone https://github.com/SEU_USUARIO/cartolalab.git
    cd cartolalab
    ```

2.  **Instale as dependências**:
    ```bash
    npm install
    ```

3.  **Configure as variáveis de ambiente**:
    Crie um arquivo `.env.local` na raiz do projeto com suas credenciais do Firebase:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=sua_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_dominio
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
    ```

4.  **Inicie o servidor de desenvolvimento**:
    ```bash
    npm run dev
    ```
    Acesse `http://localhost:3000`.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---
Desenvolvido com ❤️ para apaixonados por futebol e estatística.
