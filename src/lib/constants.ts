/**
 * Centralized constants for CartolaLab.
 * Import from here instead of redefining in each file.
 */

// -------------------------------------------------- 
// Position IDs → CSS color variables
// -------------------------------------------------- 
export const POS_COLORS: Record<number, string> = {
  1: 'var(--color-goleiro)',    // Goleiro
  2: 'var(--color-lateral)',    // Lateral
  3: 'var(--color-zagueiro)',   // Zagueiro
  4: 'var(--color-meia)',       // Meia
  5: 'var(--color-atacante)',   // Atacante
  6: 'var(--color-tecnico)',    // Técnico
};

// -------------------------------------------------- 
// Scout key → Cartola FC point value
// -------------------------------------------------- 
export const SCOUT_POINTS: Record<string, number> = {
  G:   8.0,
  A:   5.0,
  SG:  5.0,
  DS:  1.2,
  FC: -0.5,
  FS:  0.5,
  FF:  0.8,
  FD:  1.0,
  FT:  3.0,
  DE:  3.0,
  GS: -2.0,
  CA: -2.0,
  CV: -5.0,
  PC: -3.0,
  PP: -4.0,
  PS:  1.0,
  I:  -0.5,
  V:   1.0,
  DP:  7.0,
};

// -------------------------------------------------- 
// Scout key → Portuguese label (singular)
// -------------------------------------------------- 
export const SCOUT_LABELS: Record<string, string> = {
  G:  'Gol',
  A:  'Assistência',
  SG: 'Saldo de Gols',
  DS: 'Desarme',
  FC: 'Falta Cometida',
  FS: 'Falta Sofrida',
  FF: 'Finalização Fora',
  FD: 'Finalização Defendida',
  FT: 'Finalização na Trave',
  DE: 'Defesa',
  GS: 'Gol Sofrido',
  CA: 'Cartão Amarelo',
  CV: 'Cartão Vermelho',
  PC: 'Pênalti Cometido',
  PP: 'Pênalti Perdido',
  PS: 'Pênalti Sofrido',
  I:  'Impedimento',
  V:  'Vitória',
  DP: 'Defesa de Pênalti',
};

// -------------------------------------------------- 
// Position IDs → abbreviation label
// -------------------------------------------------- 
export const POS_LABELS: Record<number, string> = {
  1: 'GOL',
  2: 'LAT',
  3: 'ZAG',
  4: 'MEI',
  5: 'ATA',
  6: 'TEC',
};

// -------------------------------------------------- 
// Decay factor for exponential weighting of rounds.
// More recent rounds have higher weight (0.9^0, 0.9^1, ...)
// -------------------------------------------------- 
export const ROUND_DECAY = 0.9;
