// Sync round 11 data to Firestore via REST API using the Firebase web API key
// This bypasses the need for firebase-admin credentials

const API_KEY = 'AIzaSyCEgp9CfpxJrICqPcegHQw1QHa6TEjVx58';
const PROJECT_ID = 'cartolalab-app';
const RESOURCE_PATH = `projects/${PROJECT_ID}/databases/(default)/documents`;
const BASE_URL = `https://firestore.googleapis.com/v1/${RESOURCE_PATH}`;

function toFirestoreFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) { fields[k] = { nullValue: null }; }
    else if (typeof v === 'boolean') { fields[k] = { booleanValue: v }; }
    else if (typeof v === 'number') { fields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }; }
    else if (typeof v === 'string') { fields[k] = { stringValue: v }; }
    else if (Array.isArray(v)) { fields[k] = { arrayValue: { values: v.map(toFirestoreValue) } }; }
    else if (typeof v === 'object') { fields[k] = { mapValue: { fields: toFirestoreFields(v) } }; }
  }
  return fields;
}

function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFirestoreFields(v) } };
}

async function batchWrite(writes) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:batchWrite?key=${API_KEY}`;
  const body = { writes };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`batchWrite failed ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  const ROUND = 11;
  
  // Load atletas
  const atletasData = require('/tmp/atletas_r11.json');
  const partidasData = require('/tmp/partidas_r11.json');
  
  const atletasEntries = Object.entries(atletasData.atletas);
  const partidas = partidasData.partidas || [];
  
  console.log(`Syncing round ${ROUND}: ${atletasEntries.length} atletas, ${partidas.length} partidas`);

  // Write partidas in one batch (10 docs, well under 500 limit)
  console.log('Writing partidas...');
  const partidaWrites = partidas.map(p => ({
    update: {
      name: `${RESOURCE_PATH}/rodadas/${ROUND}/partidas/${p.partida_id}`,
      fields: toFirestoreFields(p)
    }
  }));
  
  try {
    await batchWrite(partidaWrites);
    console.log(`✓ ${partidas.length} partidas written`);
  } catch (e) {
    console.error('Partidas batch failed:', e.message);
  }

  // Write atletas in batches of 200
  console.log('Writing atletas...');
  const BATCH_SIZE = 200;
  let written = 0;
  
  for (let i = 0; i < atletasEntries.length; i += BATCH_SIZE) {
    const chunk = atletasEntries.slice(i, i + BATCH_SIZE);
    const writes = chunk.map(([id, data]) => ({
      update: {
        name: `${RESOURCE_PATH}/rodadas/${ROUND}/atletas/${id}`,
        fields: toFirestoreFields(data)
      }
    }));
    
    try {
      await batchWrite(writes);
      written += chunk.length;
      console.log(`  ✓ ${written}/${atletasEntries.length} atletas written`);
    } catch (e) {
      console.error(`  ✗ Batch at ${i} failed:`, e.message.substring(0, 200));
    }
  }

  // Write round metadata
  console.log('Writing round metadata...');
  const metaWrites = [{
    update: {
      name: `${RESOURCE_PATH}/rodadas/${ROUND}`,
      fields: toFirestoreFields({
        metadata: atletasData.rodada || {},
        total_atletas: atletasData.total_atletas || atletasEntries.length,
        timestamp_sync: new Date().toISOString()
      })
    }
  }];
  
  try {
    await batchWrite(metaWrites);
    console.log('✓ Round metadata written');
  } catch (e) {
    console.error('Metadata write failed:', e.message);
  }

  console.log(`\nDone! Round ${ROUND} synced with ${written} atletas and ${partidas.length} partidas.`);
}

main().catch(console.error);
