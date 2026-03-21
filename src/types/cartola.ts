// ============================================
// Cartola FC API Types
// ============================================

export interface Scout {
  G?: number;   // Gol
  A?: number;   // Assistência
  SG?: number;  // Saldo de Gol (Clean Sheet)
  DS?: number;  // Desarme
  FC?: number;  // Falta Cometida
  FS?: number;  // Falta Sofrida
  FF?: number;  // Finalização para Fora
  FD?: number;  // Finalização Defendida
  FT?: number;  // Finalização na Trave
  DE?: number;  // Defesa (goleiro)
  GS?: number;  // Gol Sofrido (goleiro)
  CA?: number;  // Cartão Amarelo
  CV?: number;  // Cartão Vermelho
  PC?: number;  // Pênalti Cometido
  PP?: number;  // Pênalti Perdido
  PS?: number;  // Pênalti Sofrido
  I?: number;   // Impedimento
  V?: number;   // Vitória (técnico)
  DP?: number;  // Defesa de Pênalti
}

export const SCOUT_POINTS: Record<keyof Scout, number> = {
  G: 8.0,
  A: 5.0,
  SG: 5.0,
  DS: 1.2,
  FC: -0.5,
  FS: 0.5,
  FF: 0.8,
  FD: 1.0,
  FT: 3.0,
  DE: 3.0,
  GS: -2.0,
  CA: -2.0,
  CV: -5.0,
  PC: -3.0,
  PP: -4.0,
  PS: 1.0,
  I: -0.5,
  V: 1.0,
  DP: 7.0,
};

export const SCOUT_LABELS: Record<keyof Scout, string> = {
  G: 'Gol',
  A: 'Assistência',
  SG: 'Saldo de Gol',
  DS: 'Desarme',
  FC: 'Falta Cometida',
  FS: 'Falta Sofrida',
  FF: 'Fin. Fora',
  FD: 'Fin. Defendida',
  FT: 'Fin. Trave',
  DE: 'Defesa',
  GS: 'Gol Sofrido',
  CA: 'Cartão Amarelo',
  CV: 'Cartão Vermelho',
  PC: 'Pênalti Cometido',
  PP: 'Pênalti Perdido',
  PS: 'Pênalti Sofrido',
  I: 'Impedimento',
  V: 'Vitória',
  DP: 'Defesa de Pênalti',
};

export interface Escudos {
  '60x60': string;
  '45x45': string;
  '30x30': string;
}

export interface Clube {
  id: number;
  nome: string;
  abreviacao: string;
  slug: string;
  apelido: string;
  nome_fantasia: string;
  escudos: Escudos;
  url_editoria: string;
}

export interface Posicao {
  id: number;
  nome: string;
  abreviacao: string;
}

export interface StatusJogador {
  id: number;
  nome: string;
}

export interface Atleta {
  atleta_id: number;
  nome: string;
  apelido: string;
  apelido_abreviado: string;
  foto: string;
  slug: string;
  clube_id: number;
  posicao_id: number;
  status_id: number;
  pontos_num: number;
  media_num: number;
  preco_num: number;
  variacao_num: number;
  jogos_num: number;
  scout: Scout;
  rodada_id: number;
  entrou_em_campo: boolean;
}

export interface MercadoResponse {
  clubes: Record<string, Clube>;
  posicoes: Record<string, Posicao>;
  status: Record<string, StatusJogador>;
  atletas: Atleta[];
}

export interface MercadoStatus {
  rodada_atual: number;
  status_mercado: number; // 1 = aberto, 2 = fechado
  temporada: number;
  game_over: boolean;
  fechamento: {
    dia: number;
    mes: number;
    ano: number;
    hora: number;
    minuto: number;
    timestamp: number;
  };
  times_escalados: number;
  mercado_pos_rodada: boolean;
  bola_rolando: boolean;
  nome_rodada: string;
  rodada_final: number;
}

export interface Partida {
  partida_id: number;
  clube_casa_id: number;
  clube_visitante_id: number;
  placar_oficial_mandante: number | null;
  placar_oficial_visitante: number | null;
  url_transmissao: string;
  local: string;
  valida: boolean;
  timestamp: number;
}

export interface PartidasResponse {
  clubes: Record<string, Clube>;
  partidas: Partida[];
  rodada: number;
}

export interface AtletaPontuado {
  atleta_id: number;
  apelido: string;
  foto: string;
  clube_id: number;
  posicao_id: number;
  pontuacao: number;
  scout: Scout;
  entrou_em_campo: boolean;
}

export interface PontuadosResponse {
  atletas: Record<string, AtletaPontuado>;
  rodada: number;
}

// ============================================
// Computed / UI Types
// ============================================

export interface AtletaEnriquecido extends Atleta {
  clube: Clube;
  posicao: Posicao;
  statusJogador: StatusJogador;
  // Computed indicators
  custoBeneficio: number;
  mediaUltimas5?: number;
  mediaCasa?: number;
  mediaFora?: number;
  regularidade?: number;
  forma?: ('up' | 'down' | 'stable')[];
  
  // Advanced Historical Indicators
  mediaGeralPeriodo?: number;
  mediaCasaPeriodo?: number;
  mediaForaPeriodo?: number;
  mediaConquistada?: number;
  desvioPadraoConquistada?: number;
  mediaCedida?: number;
  desvioPadraoCedida?: number;
  somaConqCed?: number;
  mccPersonalizado?: number;
  mediaComposta?: number;
  
  // Detailed Scout Indicators
  scoutsConquistados?: Partial<Record<keyof Scout, { media: number; desvioPadrao: number }>>;
  scoutsCedidos?: Partial<Record<keyof Scout, { media: number; desvioPadrao: number }>>;
}

export type PosicaoId = 1 | 2 | 3 | 4 | 5 | 6;

export const POSICAO_NAMES: Record<PosicaoId, string> = {
  1: 'Goleiro',
  2: 'Lateral',
  3: 'Zagueiro',
  4: 'Meia',
  5: 'Atacante',
  6: 'Técnico',
};

export const STATUS_COLORS: Record<number, string> = {
  2: '#f59e0b', // Dúvida - amber
  3: '#ef4444', // Suspenso - red
  5: '#ef4444', // Contundido - red
  6: '#6b7280', // Nulo - gray
  7: '#22c55e', // Provável - green
};

export const STATUS_NAMES: Record<number, string> = {
  2: 'Dúvida',
  3: 'Suspenso',
  5: 'Contundido',
  6: 'Nulo',
  7: 'Provável',
};
