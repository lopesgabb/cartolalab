import { NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * GET /api/player-history?id=12345
 * Returns the round-by-round score for a specific athlete from Firestore.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const atletaId = searchParams.get('id');

  if (!atletaId) {
    return NextResponse.json({ error: 'Missing id param' }, { status: 400 });
  }

  try {
    // Get all available rounds sorted ascending
    const rodadasSnap = await getDocs(collection(db, 'rodadas'));
    const rounds = rodadasSnap.docs
      .map(d => parseInt(d.id, 10))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    const history: { rodada: number; pontos: number; entrou: boolean }[] = [];

    await Promise.all(
      rounds.map(async (round) => {
        try {
          const atletasSnap = await getDocs(
            collection(db, 'rodadas', String(round), 'atletas')
          );
          const doc = atletasSnap.docs.find(d => d.id === atletaId);
          if (doc) {
            const data = doc.data();
            history.push({
              rodada: round,
              pontos: data.pontuacao ?? 0,
              entrou: data.entrou_em_campo ?? false,
            });
          } else {
            history.push({ rodada: round, pontos: 0, entrou: false });
          }
        } catch {
          history.push({ rodada: round, pontos: 0, entrou: false });
        }
      })
    );

    // Sort by round ascending
    history.sort((a, b) => a.rodada - b.rodada);

    return NextResponse.json({ atletaId, history });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
