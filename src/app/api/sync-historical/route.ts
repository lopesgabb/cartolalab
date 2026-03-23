import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, setDoc, writeBatch } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get('start') || '1';
  const endParam = searchParams.get('end') || '5';
  
  const start = parseInt(startParam, 10);
  const end = parseInt(endParam, 10);

  if (isNaN(start) || isNaN(end) || start > end || start < 1) {
    return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
  }

  const results = [];

  try {
    const mercadoStatusReq = await fetch('https://api.cartola.globo.com/mercado/status', { cache: 'no-store' });
    const mercadoStatus = await mercadoStatusReq.json();
    const currentRound = mercadoStatus.rodada_atual;

    for (let r = start; r <= end; r++) {
      console.log(`Fetching round ${r}...`);
      
      const atletasUrl = r === currentRound 
        ? 'https://api.cartola.globo.com/atletas/pontuados'
        : `https://api.cartola.globo.com/atletas/pontuados/${r}`;

      const [responseAtletas, responsePartidas] = await Promise.all([
        fetch(atletasUrl, { cache: 'no-store' }),
        fetch(`https://api.cartola.globo.com/partidas/${r}`, { cache: 'no-store' })
      ]);

      if (!responseAtletas.ok) {
        console.error(`Failed to fetch atletas for round ${r}: ${responseAtletas.status}`);
        results.push({ round: r, status: 'error', type: 'atletas', code: responseAtletas.status });
        continue;
      }

      const dataAtletas = await responseAtletas.json();
      const dataPartidas = responsePartidas.ok ? await responsePartidas.json() : null;
      
      if (!dataAtletas.atletas || Object.keys(dataAtletas.atletas).length === 0) {
        console.warn(`No athletes found for round ${r}. Skipping.`);
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
        // Path: rodadas/{rodadaId}/atletas/{atletaId}
        const docRef = doc(db, 'rodadas', String(r), 'atletas', id);
        batch.set(docRef, atletaData as any, { merge: true });
        opCount++;
        totalSavedAtletas++;

        // Firestore batches support up to 500 operations
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

      console.log(`Saved ${totalSavedAtletas} athletes and ${totalSavedPartidas} matches for round ${r}.`);
      results.push({ round: r, status: 'success', athletes_saved: totalSavedAtletas, partidas_saved: totalSavedPartidas });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Sync Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
