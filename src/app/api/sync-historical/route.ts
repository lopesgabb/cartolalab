import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, writeBatch, getDocs, collection } from 'firebase/firestore';
import { log } from '@/lib/logger';
import { calculateHistoricalAggregates } from '@/lib/domain/aggregation';
import crypto from 'crypto';

function authenticate(request: Request): NextResponse | null {
  const secret = request.headers.get('x-api-secret');
  const expectedSecret = process.env.SYNC_API_SECRET;
  
  if (!expectedSecret || !secret) {
    log('warn', 'sync-historical', 'Unauthorized sync attempt (missing secret)', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use timingSafeEqual to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSecret);
  const secretBuffer = Buffer.from(secret);
  
  if (expectedBuffer.length !== secretBuffer.length || !crypto.timingSafeEqual(expectedBuffer, secretBuffer)) {
    log('warn', 'sync-historical', 'Unauthorized sync attempt (invalid secret)', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export async function POST(request: Request) {
  const authError = authenticate(request);
  if (authError) return authError;

  let start: number;
  let end: number;

  try {
    const body = await request.json();
    start = parseInt(String(body.start), 10);
    end = parseInt(String(body.end), 10);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body. Expected { start, end }' }, { status: 400 });
  }

  if (isNaN(start) || isNaN(end) || start > end || start < 1) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  const results = [];

  try {
    const mercadoStatusReq = await fetch('https://api.cartola.globo.com/mercado/status', { cache: 'no-store' });
    const mercadoStatus = await mercadoStatusReq.json();
    const currentRound = mercadoStatus.rodada_atual;

    for (let r = start; r <= end; r++) {
      log('info', 'sync-historical', `Fetching round ${r}`, { currentRound });
      
      const atletasUrl = r === currentRound 
        ? 'https://api.cartola.globo.com/atletas/pontuados'
        : `https://api.cartola.globo.com/atletas/pontuados/${r}`;

      const [responseAtletas, responsePartidas] = await Promise.all([
        fetch(atletasUrl, { cache: 'no-store' }),
        fetch(`https://api.cartola.globo.com/partidas/${r}`, { cache: 'no-store' })
      ]);

      if (!responseAtletas.ok) {
        log('error', 'sync-historical', `Failed to fetch atletas for round ${r}`, { status: responseAtletas.status });
        results.push({ round: r, status: 'error', type: 'atletas', code: responseAtletas.status });
        continue;
      }

      const dataAtletas = await responseAtletas.json();
      const dataPartidas = responsePartidas.ok ? await responsePartidas.json() : null;
      
      if (!dataAtletas.atletas || Object.keys(dataAtletas.atletas).length === 0) {
        log('warn', 'sync-historical', `No athletes found for round ${r}. Skipping.`);
        results.push({ round: r, status: 'skipped (no data)' });
        continue;
      }

      // We'll write data using Firestore batches for efficiency
      let batch = writeBatch(db);
      let opCount = 0;
      let totalSavedAtletas = 0;
      let totalSavedPartidas = 0;

      // Extract athletes
      const atletasEntries = Object.entries(dataAtletas.atletas);
      
      for (const [id, atletaData] of atletasEntries) {
        const docRef = doc(db, 'rodadas', String(r), 'atletas', id);
        batch.set(docRef, atletaData as Record<string, unknown>, { merge: true });
        opCount++;
        totalSavedAtletas++;

        if (opCount >= 490) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      // Extract and save partidas
      if (dataPartidas && dataPartidas.partidas) {
        for (const partida of dataPartidas.partidas) {
          const partidaDocRef = doc(db, 'rodadas', String(r), 'partidas', String(partida.partida_id));
          batch.set(partidaDocRef, partida, { merge: true });
          opCount++;
          totalSavedPartidas++;

          if (opCount >= 490) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      // Also save the round metadata:
      if (dataAtletas.rodada) {
         await setDoc(doc(db, 'rodadas', String(r)), {
            metadata: dataAtletas.rodada,
            total_atletas: dataAtletas.total_atletas || totalSavedAtletas,
            timestamp_sync: new Date().toISOString()
         }, { merge: true });
      }

      log('info', 'sync-historical', `Saved round ${r}`, { totalSavedAtletas, totalSavedPartidas });
      results.push({ round: r, status: 'success', athletes_saved: totalSavedAtletas, partidas_saved: totalSavedPartidas });
    }

    // After all raw data is synced, compute and store the CQRS aggregated statistics
    log('info', 'sync-historical', 'Computing CQRS aggregates...');
    const [agg3, agg5, aggAll] = await Promise.all([
      calculateHistoricalAggregates('3'),
      calculateHistoricalAggregates('5'),
      calculateHistoricalAggregates('all')
    ]);

    await setDoc(doc(db, 'system', 'aggregatedStats'), {
      '3': agg3,
      '5': agg5,
      'all': aggAll,
      updatedAt: new Date().toISOString()
    });
    log('info', 'sync-historical', 'CQRS aggregates saved successfully.');

    return NextResponse.json({ success: true, results, aggregated: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'sync-historical', 'Sync failed', { error: message });
    // Never expose internal error details in production
    const safeMessage = process.env.NODE_ENV === 'production'
      ? 'Internal sync error. Check server logs.'
      : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      error: 'This endpoint now requires POST. Use: curl -X POST -H "Content-Type: application/json" -H "x-api-secret: YOUR_SECRET" -d \'{"start":1,"end":13}\' http://localhost:3000/api/sync-historical' 
    },
    { status: 405 }
  );
}

export async function DELETE(request: Request) {
  const authError = authenticate(request);
  if (authError) return authError;
  const { searchParams } = new URL(request.url);
  const round = searchParams.get('round');
  if (!round) return NextResponse.json({ error: 'Missing round param' }, { status: 400 });
  
  try {
    // Delete atletas
    const atletasSnap = await getDocs(collection(db, 'rodadas', round, 'atletas'));
    let batch = writeBatch(db);
    let opCount = 0;
    atletasSnap.forEach(d => {
      batch.delete(d.ref);
      opCount++;
    });
    if (opCount > 0) await batch.commit();

    // Delete partidas
    const partidasSnap = await getDocs(collection(db, 'rodadas', round, 'partidas'));
    batch = writeBatch(db);
    opCount = 0;
    partidasSnap.forEach(d => {
      batch.delete(d.ref);
      opCount++;
    });
    if (opCount > 0) await batch.commit();

    log('info', 'sync-historical', `Round ${round} data cleared`);
    return NextResponse.json({ success: true, message: `Round ${round} data cleared` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log('error', 'sync-historical', 'Delete failed', { error: message });
    const safeMessage = process.env.NODE_ENV === 'production'
      ? 'Internal error. Check server logs.'
      : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
