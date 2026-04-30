import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { getCacheStatus } from '@/lib/indicators-engine';

/**
 * GET /api/health
 * Public health check endpoint for monitoring.
 * Returns system status without exposing sensitive data.
 */
export async function GET() {
  const checks: Record<string, string> = {};
  let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';

  // Check Firestore connectivity
  try {
    const snap = await getDocs(query(collection(db, 'rodadas'), limit(1)));
    checks.firestore = snap.empty ? 'connected (empty)' : 'connected';
  } catch (err) {
    checks.firestore = 'unreachable';
    overallStatus = 'degraded';
  }

  // Check Cartola API reachability
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://api.cartola.globo.com/mercado/status', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    checks.cartolaApi = res.ok ? 'reachable' : `status ${res.status}`;
  } catch {
    checks.cartolaApi = 'unreachable';
    // This is expected in some environments (restricted DNS)
    if (overallStatus === 'ok') overallStatus = 'degraded';
  }

  // Cache status
  const cache = getCacheStatus();
  checks.indicatorCache = `${cache.size} entries, TTL ${cache.ttlMinutes}min`;

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    checks,
  });
}
