import type {
  MercadoResponse,
  MercadoStatus,
  PartidasResponse,
  PontuadosResponse,
} from '@/types/cartola';

const BASE_URL = 'https://api.cartola.globo.com';

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchWithCache<T>(endpoint: string, cacheDuration = CACHE_DURATION): Promise<T> {
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < cacheDuration) {
    return cached.data as T;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    cache: 'no-store', // Disable Next.js persistent fetch cache since we use our in-memory Map
  });

  if (!response.ok) {
    throw new Error(`Cartola API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data as T;
}

export const CartolaAPI = {
  /** Get market status (current round, market open/closed, etc.) */
  async getMercadoStatus(): Promise<MercadoStatus> {
    return fetchWithCache<MercadoStatus>('/mercado/status', 60_000);
  },

  /** Get all players with full data (scouts, prices, stats) */
  async getMercado(): Promise<MercadoResponse> {
    return fetchWithCache<MercadoResponse>('/atletas/mercado');
  },

  /** Get scored players for current round (partial points) */
  async getPontuados(): Promise<PontuadosResponse> {
    return fetchWithCache<PontuadosResponse>('/atletas/pontuados', 30_000);
  },

  /** Get matches for current round */
  async getPartidas(): Promise<PartidasResponse> {
    return fetchWithCache<PartidasResponse>('/partidas');
  },

  /** Get all rounds */
  async getRodadas(): Promise<unknown> {
    return fetchWithCache('/rodadas');
  },

  /** Get post-round highlights */
  async getDestaques(): Promise<unknown> {
    return fetchWithCache('/pos-rodada/destaques');
  },

  /** Clear in-memory cache */
  clearCache(): void {
    cache.clear();
  },
};
