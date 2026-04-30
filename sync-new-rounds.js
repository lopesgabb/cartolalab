const { initializeApp } = require('firebase/app');
const { getFirestore, doc, writeBatch, setDoc } = require('firebase/firestore');

// Load environment variables from .env.local (never hardcode credentials)
require('dotenv').config({ path: require('path').join(__dirname, '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  console.error('ERROR: Firebase config not found. Make sure .env.local exists.');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const fs = require('fs');
const path = require('path');

async function syncRound(round) {
  console.log(`Checking data for round ${round}...`);
  
  let dataAtletas;
  let dataPartidas;

  const localAtletas = path.join(__dirname, `r${round}_atletas.json`);
  const localPartidas = path.join(__dirname, `r${round}_partidas.json`);

  if (fs.existsSync(localAtletas) && fs.existsSync(localPartidas)) {
    console.log(`Loading round ${round} from local files...`);
    dataAtletas = JSON.parse(fs.readFileSync(localAtletas, 'utf8'));
    dataPartidas = JSON.parse(fs.readFileSync(localPartidas, 'utf8'));
  } else {
    console.log(`Fetching round ${round} from API...`);
    const [resA, resP] = await Promise.all([
      fetch(`https://api.cartola.globo.com/atletas/pontuados/${round}`),
      fetch(`https://api.cartola.globo.com/partidas/${round}`)
    ]);
    
    if (!resA.ok) {
      console.error(`Round ${round} not available via API (Status: ${resA.status})`);
      return;
    }
    
    dataAtletas = await resA.json();
    dataPartidas = resP.ok ? await resP.json() : { partidas: [] };
  }

  if (!dataAtletas.atletas || Object.keys(dataAtletas.atletas).length === 0) {
    console.log(`No athletes found for round ${round}.`);
    return;
  }

  const atletasEntries = Object.entries(dataAtletas.atletas);
  const partidas = dataPartidas.partidas || [];

  console.log(`Syncing round ${round}: ${atletasEntries.length} atletas, ${partidas.length} partidas`);

  let batch = writeBatch(db);
  let opCount = 0;

  for (const [id, data] of atletasEntries) {
    const docRef = doc(db, 'rodadas', String(round), 'atletas', id);
    batch.set(docRef, data, { merge: true });
    opCount++;
    if (opCount >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      opCount = 0;
    }
  }

  for (const p of partidas) {
    const docRef = doc(db, 'rodadas', String(round), 'partidas', String(p.partida_id));
    batch.set(docRef, p, { merge: true });
    opCount++;
    if (opCount >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }

  await setDoc(doc(db, 'rodadas', String(round)), {
    metadata: dataAtletas.rodada || { id: round },
    total_atletas: dataAtletas.total_atletas || atletasEntries.length,
    timestamp_sync: new Date().toISOString()
  }, { merge: true });

  console.log(`Round ${round} synced successfully!`);
}

async function main() {
  await syncRound(13);
  // Also try 14 just in case some early points are in
  await syncRound(14);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
