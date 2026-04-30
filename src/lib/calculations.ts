/**
 * Pure calculation functions extracted from the indicators engine.
 * These are stateless, side-effect-free functions that can be unit tested
 * without mocking Firestore or any external dependency.
 */

/**
 * Clamp a value between min and max.
 * Used for FDR and Momentum multipliers (typically ±30% → [0.7, 1.3]).
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate the Fixture Difficulty Rating (FDR) multiplier.
 * 
 * FDR measures how much a specific opponent concedes points to a position
 * relative to the league average. A high FDR means an easier fixture.
 * 
 * @param mediaCedida - Points conceded by opponent for this position
 * @param globalConcededAvg - League average points conceded for this position
 * @param minClamp - Minimum multiplier (default: 0.7 → -30%)
 * @param maxClamp - Maximum multiplier (default: 1.3 → +30%)
 * @returns Multiplier between minClamp and maxClamp
 */
export function calculateFDR(
  mediaCedida: number | undefined,
  globalConcededAvg: number,
  minClamp = 0.7,
  maxClamp = 1.3
): number {
  if (!mediaCedida || globalConcededAvg <= 0) return 1.0;
  const raw = mediaCedida / globalConcededAvg;
  return clamp(raw, minClamp, maxClamp);
}

/**
 * Calculate the Momentum multiplier.
 * 
 * Momentum compares the player's recent performance (last 3 rounds)
 * against their overall average. A rising player gets a bonus.
 * 
 * @param indiceMomento - Average score in the last 3 rounds
 * @param mediaGeralPeriodo - Average score across the full selected period
 * @param minClamp - Minimum multiplier (default: 0.7 → -30%)
 * @param maxClamp - Maximum multiplier (default: 1.3 → +30%)
 * @returns Multiplier between minClamp and maxClamp
 */
export function calculateMomentum(
  indiceMomento: number | undefined,
  mediaGeralPeriodo: number | undefined,
  minClamp = 0.7,
  maxClamp = 1.3
): number {
  if (!mediaGeralPeriodo || mediaGeralPeriodo <= 0 || indiceMomento === undefined) return 1.0;
  const raw = indiceMomento / mediaGeralPeriodo;
  return clamp(raw, minClamp, maxClamp);
}

/**
 * Calculate the AI Score (Previsão IA).
 * 
 * Combines the base score with Momentum and FDR multipliers.
 * 
 * @param baseScore - The raw weighted average (mediaGeralPeriodo)
 * @param momentumMultiplier - From calculateMomentum()
 * @param fdrMultiplier - From calculateFDR()
 * @returns Final AI prediction score
 */
export function calculateAIScore(
  baseScore: number,
  momentumMultiplier: number,
  fdrMultiplier: number
): number {
  return baseScore * momentumMultiplier * fdrMultiplier;
}

/**
 * Calculate the Risk Factor based on the Coefficient of Variation.
 * 
 * A highly irregular player (high standard deviation relative to mean)
 * gets penalized. Maximum penalty is 50%.
 * 
 * @param regularidade - Standard deviation of scores
 * @param mediaGeral - Average score
 * @param penaltyWeight - How much CV reduces the score (default: 0.15)
 * @param minFactor - Minimum factor to never penalize below (default: 0.5)
 * @returns Risk factor between minFactor and 1.0
 */
export function calculateRiskFactor(
  regularidade: number,
  mediaGeral: number,
  penaltyWeight = 0.15,
  minFactor = 0.5
): number {
  if (mediaGeral <= 0) return minFactor;
  const cv = regularidade / mediaGeral;
  return Math.max(minFactor, 1 - cv * penaltyWeight);
}

/**
 * Calculate the simple arithmetic average of scores.
 * Used for period averages (MG(P)) as per user preference.
 * 
 * @param scores - Array of scores
 * @returns Simple arithmetic mean, or 0 if empty
 */
export function simpleAverage(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

/**
 * Calculate running averages for sparkline display.
 * Each point i is the cumulative average of scores [0..i].
 * 
 * @param scores - Array of raw scores per round
 * @returns Array of cumulative averages
 */
export function toRunningAverage(scores: number[]): number[] {
  let sum = 0;
  return scores.map((v, i) => {
    sum += v;
    return sum / (i + 1);
  });
}

/**
 * Calculate Composite Score (M.COMP).
 * 
 * Integrates base projection, scout affinity, and risk factor.
 * 
 * @param projBase - Base projection (60% player + 40% matchup context)
 * @param afinidadeTatica - Scout affinity bonus (clamped to [-2, 2])
 * @param fatorRisco - Risk factor from calculateRiskFactor()
 * @returns Final composite score
 */
export function calculateCompositeScore(
  projBase: number,
  afinidadeTatica: number,
  fatorRisco: number
): number {
  const afinidadeLimitada = clamp(afinidadeTatica, -2, 2);
  return (projBase + afinidadeLimitada) * fatorRisco;
}
