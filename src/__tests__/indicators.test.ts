import { describe, it, expect } from 'vitest';
import {
  custoBeneficio,
  regularidade,
  calcularForma,
  calcularScoutPoints,
  sortAtletas,
  filterAtletas,
} from '../lib/indicators';
import type { AtletaEnriquecido, Scout } from '../types/cartola';

// Helper to create a minimal AtletaEnriquecido for testing
function makePlayer(overrides: Partial<AtletaEnriquecido> = {}): AtletaEnriquecido {
  return {
    atleta_id: 1,
    nome: 'Test Player',
    apelido: 'Test',
    foto: '',
    clube_id: 100,
    posicao_id: 5,
    status_id: 7,
    pontos_num: 5.0,
    preco_num: 10.0,
    variacao_num: 0.5,
    media_num: 6.0,
    jogos_num: 5,
    scout: {},
    custoBeneficio: 0.6,
    ...overrides,
  } as AtletaEnriquecido;
}

// =============================================================================
// custoBeneficio
// =============================================================================
describe('custoBeneficio', () => {
  it('calculates correct ratio', () => {
    expect(custoBeneficio(10, 5)).toBe(2.0);
  });
  it('returns 0 when preco is 0', () => {
    expect(custoBeneficio(10, 0)).toBe(0);
  });
  it('returns 0 when preco is negative', () => {
    expect(custoBeneficio(10, -5)).toBe(0);
  });
  it('rounds to 2 decimal places', () => {
    expect(custoBeneficio(7, 3)).toBe(2.33);
  });
});

// =============================================================================
// regularidade (standard deviation)
// =============================================================================
describe('regularidade', () => {
  it('returns 0 for a single score', () => {
    expect(regularidade([5])).toBe(0);
  });
  it('returns 0 for empty array', () => {
    expect(regularidade([])).toBe(0);
  });
  it('returns 0 when all scores are equal', () => {
    expect(regularidade([5, 5, 5, 5])).toBe(0);
  });
  it('calculates correct standard deviation', () => {
    // [2, 4, 6] → mean=4, variance=((4+0+4)/3)=2.667, stddev=1.633
    const result = regularidade([2, 4, 6]);
    expect(result).toBeCloseTo(1.63, 1);
  });
  it('handles negative scores', () => {
    const result = regularidade([-3, 0, 3]);
    expect(result).toBeGreaterThan(0);
  });
});

// =============================================================================
// calcularForma
// =============================================================================
describe('calcularForma', () => {
  it('returns empty for single score', () => {
    expect(calcularForma([5])).toEqual([]);
  });
  it('returns empty for empty array', () => {
    expect(calcularForma([])).toEqual([]);
  });
  it('detects upward trend', () => {
    // 5 → 8 = +3 (> 1) → 'up'
    expect(calcularForma([5, 8])).toEqual(['up']);
  });
  it('detects downward trend', () => {
    // 8 → 5 = -3 (< -1) → 'down'
    expect(calcularForma([8, 5])).toEqual(['down']);
  });
  it('detects stable', () => {
    // 5 → 5.5 = +0.5 (within ±1) → 'stable'
    expect(calcularForma([5, 5.5])).toEqual(['stable']);
  });
  it('handles mixed trends', () => {
    expect(calcularForma([2, 8, 3, 3.5])).toEqual(['up', 'down', 'stable']);
  });
});

// =============================================================================
// calcularScoutPoints
// =============================================================================
describe('calcularScoutPoints', () => {
  it('calculates correctly for a goal scorer', () => {
    const scout: Scout = { G: 1, FS: 2, FC: 1 } as Scout;
    const result = calcularScoutPoints(scout);
    // G=8, FS=0.5*2=1, FC=-0.5*1=-0.5 → total = 8.5
    expect(result.total).toBeCloseTo(8.5);
    expect(result.breakdown.length).toBe(3);
  });
  it('handles empty scout', () => {
    const result = calcularScoutPoints({} as Scout);
    expect(result.total).toBe(0);
    expect(result.breakdown).toEqual([]);
  });
  it('sorts breakdown by points descending', () => {
    const scout: Scout = { G: 1, CV: 1 } as Scout;
    const result = calcularScoutPoints(scout);
    expect(result.breakdown[0].key).toBe('G');  // +8
    expect(result.breakdown[1].key).toBe('CV'); // -5
  });
});

// =============================================================================
// sortAtletas
// =============================================================================
describe('sortAtletas', () => {
  const players = [
    makePlayer({ atleta_id: 1, media_num: 3 }),
    makePlayer({ atleta_id: 2, media_num: 8 }),
    makePlayer({ atleta_id: 3, media_num: 5 }),
  ];

  it('sorts descending by default', () => {
    const sorted = sortAtletas(players, 'media_num', 'desc');
    expect(sorted.map(p => p.atleta_id)).toEqual([2, 3, 1]);
  });
  it('sorts ascending when specified', () => {
    const sorted = sortAtletas(players, 'media_num', 'asc');
    expect(sorted.map(p => p.atleta_id)).toEqual([1, 3, 2]);
  });
  it('does not mutate original array', () => {
    const sorted = sortAtletas(players, 'media_num', 'desc');
    expect(players[0].atleta_id).toBe(1); // original unchanged
    expect(sorted[0].atleta_id).toBe(2);
  });
});

// =============================================================================
// filterAtletas
// =============================================================================
describe('filterAtletas', () => {
  const players = [
    makePlayer({ atleta_id: 1, posicao_id: 5, clube_id: 100, status_id: 7, jogos_num: 5, apelido: 'Neymar' }),
    makePlayer({ atleta_id: 2, posicao_id: 4, clube_id: 200, status_id: 2, jogos_num: 3, apelido: 'Arrascaeta' }),
    makePlayer({ atleta_id: 3, posicao_id: 5, clube_id: 100, status_id: 7, jogos_num: 1, apelido: 'Pedro' }),
  ];

  it('returns all when no filters', () => {
    expect(filterAtletas(players, {}).length).toBe(3);
  });
  it('filters by posicaoId', () => {
    const result = filterAtletas(players, { posicaoId: 5 });
    expect(result.length).toBe(2);
    expect(result.every(p => p.posicao_id === 5)).toBe(true);
  });
  it('filters by clubeId', () => {
    const result = filterAtletas(players, { clubeId: 200 });
    expect(result.length).toBe(1);
    expect(result[0].apelido).toBe('Arrascaeta');
  });
  it('filters by statusId', () => {
    const result = filterAtletas(players, { statusId: 7 });
    expect(result.length).toBe(2);
  });
  it('filters by minimum games', () => {
    const result = filterAtletas(players, { jogosMin: 3 });
    expect(result.length).toBe(2);
  });
  it('filters by search text (case insensitive)', () => {
    const result = filterAtletas(players, { search: 'ney' });
    expect(result.length).toBe(1);
    expect(result[0].apelido).toBe('Neymar');
  });
  it('combines multiple filters', () => {
    const result = filterAtletas(players, { posicaoId: 5, jogosMin: 3 });
    expect(result.length).toBe(1);
    expect(result[0].apelido).toBe('Neymar');
  });
});
