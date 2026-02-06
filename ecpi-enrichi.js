const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'epci_base.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'epci_enriched.jsonl');

const API_BASE = 'https://geo.api.gouv.fr';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} – ${url}`);
  }
  return res.json();
}

async function enrichEpci(epci) {
  const code = epci.code;

  // 1️⃣ Détails EPCI
  const epciDetails = await fetchJson(`${API_BASE}/epcis/${code}`);

  // 2️⃣ Communes de l’EPCI
  const communes = await fetchJson(`${API_BASE}/epcis/${code}/communes`);

  return {
    epci: {
      nom: epciDetails.nom,
      code: epciDetails.code,
      codesDepartements: epciDetails.codesDepartements || [],
      codesRegions: epciDetails.codesRegions || [],
      population: epciDetails.population ?? null
    },
    communes: communes.map(c => ({
      nom: c.nom,
      code: c.code,
      codeDepartement: c.codeDepartement,
      codeRegion: c.codeRegion,
      codesPostaux: c.codesPostaux || [],
      population: c.population ?? null
    }))
  };
}

async function run() {
  const epcis = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

  console.log(`🔎 ${epcis.length} EPCI à enrichir`);

  const output = fs.createWriteStream(OUTPUT_FILE);

  let index = 0;
  for (const epci of epcis) {
    index++;
    try {
      const enriched = await enrichEpci(epci);
      output.write(JSON.stringify(enriched) + '\n');

      console.log(`✅ ${index}/${epcis.length} – ${epci.nom}`);
    } catch (err) {
      console.error(`⚠️ Erreur EPCI ${epci.code}: ${err.message}`);
    }

    // ⏳ petite pause pour rester clean avec l’API
    await new Promise(r => setTimeout(r, 150));
  }

  output.end();
  console.log('\n🎉 Enrichissement terminé');
}

run().catch(console.error);
