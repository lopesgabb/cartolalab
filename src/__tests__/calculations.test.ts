import { describe, it, expect } from 'vitest';
import {
  clamp,
  calculateFDR,
  calculateMomentum,
  calculateAIScore,
  calculateRiskFactor,
  simpleAverage,
  toRunningAverage,
  calculateCompositeScore,
} from '../lib/calculations';

// =============================================================================
// clamp
// =============================================================================
describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(1.0, 0.7, 1.3)).toBe(1.0);
  });
  it('clamps to min when below', () => {
    expect(clamp(0.3, 0.7, 1.3)).toBe(0.7);
  });
  it('clamps to max when above', () => {
    expect(clamp(2.0, 0.7, 1.3)).toBe(1.3);
  });
  it('returns exact boundary values', () => {
    expect(clamp(0.7, 0.7, 1.3)).toBe(0.7);
    expect(clamp(1.3, 0.7, 1.3)).toBe(1.3);
  });
  it('handles negative values', () => {
    expect(clamp(-5, -2, 2)).toBe(-2);
    expect(clamp(-1, -2, 2)).toBe(-1);
  });
});

// =============================================================================
// calculateFDR (Fixture Difficulty Rating)
// =============================================================================
describe('calculateFDR', () => {
  it('returns 1.0 when mediaCedida is undefined', () => {
    expect(calculateFDR(undefined, 5)).toBe(1.0);
  });
  it('returns 1.0 when globalConcededAvg is 0', () => {
    expect(calculateFDR(5, 0)).toBe(1.0);
  });
  it('returns 1.0 when globalConcededAvg is negative', () => {
    expect(calculateFDR(5, -2)).toBe(1.0);
  });
  it('returns 1.0 when opponent concedes exactly the league average', () => {
    expect(calculateFDR(5, 5)).toBe(1.0);
  });
  it('returns > 1 when opponent concedes more than average (easier fixture)', () => {
    const result = calculateFDR(7, 5);
    expect(result).toBeGreaterThan(1.0);
    expect(result).toBe(1.3); // 7/5 = 1.4, clamped to 1.3
  });
  it('returns < 1 when opponent concedes less than average (harder fixture)', () => {
    const result = calculateFDR(3, 5);
    expect(result).toBeLessThan(1.0);
    expect(result).toBe(0.7); // 3/5 = 0.6, clamped to 0.7
  });
  it('respects the ±30% clamp (never exceeds 1.3)', () => {
    expect(calculateFDR(100, 5)).toBe(1.3);
  });
  it('respects the ±30% clamp (never below 0.7)', () => {
    expect(calculateFDR(1, 100)).toBe(0.7);
  });
  it('returns exact ratio when within clamp range', () => {
    // 6/5 = 1.2, within [0.7, 1.3]
    expect(calculateFDR(6, 5)).toBeCloseTo(1.2);
  });
});

// =============================================================================
// calculateMomentum
// =============================================================================
describe('calculateMomentum', () => {
  it('returns 1.0 when indiceMomento is undefined', () => {
    expect(calculateMomentum(undefined, 5)).toBe(1.0);
  });
  it('returns 1.0 when mediaGeralPeriodo is undefined', () => {
    expect(calculateMomentum(5, undefined)).toBe(1.0);
  });
  it('returns 1.0 when mediaGeralPeriodo is 0', () => {
    expect(calculateMomentum(5, 0)).toBe(1.0);
  });
  it('returns 1.0 when mediaGeralPeriodo is negative', () => {
    expect(calculateMomentum(5, -3)).toBe(1.0);
  });
  it('returns 1.0 when momento equals media (no trend)', () => {
    expect(calculateMomentum(5, 5)).toBe(1.0);
  });
  it('returns > 1 when player is in rising form', () => {
    // 7/5 = 1.4, clamped to 1.3
    expect(calculateMomentum(7, 5)).toBe(1.3);
  });
  it('returns < 1 when player is in declining form', () => {
    // 3/5 = 0.6, clamped to 0.7
    expect(calculateMomentum(3, 5)).toBe(0.7);
  });
  it('accepts custom clamp values', () => {
    // 8/5 = 1.6, custom clamp to 1.5
    expect(calculateMomentum(8, 5, 0.5, 1.5)).toBe(1.5);
  });
});

// =============================================================================
// calculateAIScore
// =============================================================================
describe('calculateAIScore', () => {
  it('returns base score when both multipliers are 1.0', () => {
    expect(calculateAIScore(5.0, 1.0, 1.0)).toBe(5.0);
  });
  it('correctly applies momentum boost', () => {
    expect(calculateAIScore(10.0, 1.3, 1.0)).toBeCloseTo(13.0);
  });
  it('correctly applies FDR boost', () => {
    expect(calculateAIScore(10.0, 1.0, 1.2)).toBeCloseTo(12.0);
  });
  it('correctly combines both multipliers', () => {
    // 10 * 1.1 * 1.2 = 13.2
    expect(calculateAIScore(10.0, 1.1, 1.2)).toBeCloseTo(13.2);
  });
  it('handles zero base score', () => {
    expect(calculateAIScore(0, 1.3, 1.3)).toBe(0);
  });
  it('handles negative base score', () => {
    expect(calculateAIScore(-2.0, 1.0, 1.0)).toBe(-2.0);
  });
});

// =============================================================================
// calculateRiskFactor
// =============================================================================
describe('calculateRiskFactor', () => {
  it('returns 1.0 when regularidade is 0 (perfectly consistent)', () => {
    expect(calculateRiskFactor(0, 5)).toBe(1.0);
  });
  it('returns minFactor when mediaGeral is 0', () => {
    expect(calculateRiskFactor(3, 0)).toBe(0.5);
  });
  it('penalizes high variability', () => {
    // CV = 5/5 = 1.0, penalty = 1 - (1.0 * 0.15) = 0.85
    const result = calculateRiskFactor(5, 5);
    expect(result).toBeCloseTo(0.85);
  });
  it('never goes below minFactor (50%)', () => {
    // Extremely high CV
    const result = calculateRiskFactor(100, 5);
    expect(result).toBe(0.5);
  });
  it('low variability results in near-1.0 factor', () => {
    // CV = 1/10 = 0.1, penalty = 1 - (0.1 * 0.15) = 0.985
    const result = calculateRiskFactor(1, 10);
    expect(result).toBeCloseTo(0.985);
  });
  it('accepts custom penalty weight', () => {
    // CV = 5/5 = 1.0, penalty = 1 - (1.0 * 0.5) = 0.5
    expect(calculateRiskFactor(5, 5, 0.5)).toBeCloseTo(0.5);
  });
});

// =============================================================================
// simpleAverage
// =============================================================================
describe('simpleAverage', () => {
  it('returns 0 for empty array', () => {
    expect(simpleAverage([])).toBe(0);
  });
  it('returns the single value for a one-element array', () => {
    expect(simpleAverage([7])).toBe(7);
  });
  it('calculates correct mean', () => {
    expect(simpleAverage([4, 6, 8, 10])).toBe(7);
  });
  it('handles negative values', () => {
    expect(simpleAverage([-2, 0, 2])).toBe(0);
  });
  it('handles decimal values', () => {
    expect(simpleAverage([1.5, 2.5])).toBe(2.0);
  });
});

// =============================================================================
// toRunningAverage
// =============================================================================
describe('toRunningAverage', () => {
  it('returns empty array for empty input', () => {
    expect(toRunningAverage([])).toEqual([]);
  });
  it('returns single value for single input', () => {
    expect(toRunningAverage([5])).toEqual([5]);
  });
  it('calculates cumulative averages correctly', () => {
    // [4, 6] → [4/1, (4+6)/2] → [4, 5]
    expect(toRunningAverage([4, 6])).toEqual([4, 5]);
  });
  it('shows progression for multiple rounds', () => {
    // [2, 4, 6] → [2, 3, 4]
    const result = toRunningAverage([2, 4, 6]);
    expect(result).toEqual([2, 3, 4]);
  });
  it('handles all zeros', () => {
    expect(toRunningAverage([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

// =============================================================================
// calculateCompositeScore
// =============================================================================
describe('calculateCompositeScore', () => {
  it('returns projBase when afinidade is 0 and risk factor is 1', () => {
    expect(calculateCompositeScore(5, 0, 1.0)).toBe(5);
  });
  it('adds afinidade bonus', () => {
    // (5 + 1) * 1.0 = 6
    expect(calculateCompositeScore(5, 1, 1.0)).toBe(6);
  });
  it('clamps afinidade to [-2, 2]', () => {
    // afinidade 10 → clamped to 2 → (5 + 2) * 1.0 = 7
    expect(calculateCompositeScore(5, 10, 1.0)).toBe(7);
    // afinidade -10 → clamped to -2 → (5 + (-2)) * 1.0 = 3
    expect(calculateCompositeScore(5, -10, 1.0)).toBe(3);
  });
  it('applies risk factor penalty', () => {
    // (5 + 0) * 0.8 = 4
    expect(calculateCompositeScore(5, 0, 0.8)).toBe(4);
  });
  it('combines all factors', () => {
    // (5 + 1.5) * 0.85 = 5.525
    expect(calculateCompositeScore(5, 1.5, 0.85)).toBeCloseTo(5.525);
  });
});
