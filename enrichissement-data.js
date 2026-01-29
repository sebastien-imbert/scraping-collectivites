const fs = require('fs');
const path = require('path');

// Dossiers d'entrée et sortie
const INPUT_DIR = './data_clean';
const OUTPUT_DIR = './data_enriched';
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ───── Fonction pour enrichir une commune
async function enrichCommune(data) {
  try {
    const postalCode = data.adresse?.postalCode?.trim();
    if (!postalCode) throw new Error('Pas de code postal');

    // Requête API Gouv par code postal
    const resp = await fetch(
      `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(postalCode)}&fields=nom,code,codeEpci,siren,population,surface,mairie`
    );

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();

    if (!json || json.length === 0) {
      console.log(`⚠️ Aucun résultat API pour ${data.nom} (${postalCode})`);
    } else {
      // On essaie de matcher sur nomNormalise sinon on prend le premier
      const nomNorm = (data.nomNormalise || data.nom || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const commune = json.find(c => c.nom.toLowerCase().replace(/[^a-z0-9]/g, '') === nomNorm) || json[0];

      if (commune) {
        data.codeInsee = commune.code;
        data.codeEpci = commune.codeEpci;
        data.sirenEpci = commune.siren;
        data.population = commune.population;
        data.surface = commune.surface;
        data.mairieUrl = commune.mairie;
      }
    }
  } catch (e) {
    console.log(`❌ Erreur API pour "${data.nom}" (${data.adresse?.postalCode || '??'}): ${e.message}`);
  }

  // ───── Enrichissement commercial
  data.hasWebsite = !!data.website;
  data.hasEmail = !!data.contacts?.email && data.contacts.email.includes('@');
  data.commercialScore =
    (data.population || 0) / 1000 + (data.hasWebsite ? 1 : 0) + (data.hasEmail ? 1 : 0);

  return data;
}

// ───── Fonction pour traiter un fichier JSONL
async function enrichFile(filePath) {
  const fileName = path.basename(filePath);
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  const output = fs.createWriteStream(path.join(OUTPUT_DIR, fileName));

  for (const line of lines) {
    const data = JSON.parse(line);
    const enriched = await enrichCommune(data);
    output.write(JSON.stringify(enriched) + '\n');
  }

  output.end();
  console.log(`🎉 Fichier enrichi : ${fileName}`);
}

// ───── Boucle sur tous les fichiers du dossier
async function main() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.jsonl'));
  for (const file of files) {
    await enrichFile(path.join(INPUT_DIR, file));
  }
  console.log('✅ Tous les fichiers enrichis !');
}

main();
