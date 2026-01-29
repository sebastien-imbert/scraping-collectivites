const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 👉 dossiers
const INPUT_DIR = path.join(__dirname, 'data');
const OUTPUT_DIR = path.join(__dirname, 'data_clean');

// Création du dossier de sortie si besoin
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// --- Fonctions utilitaires ---
function normalizeString(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
}

function cleanPhone(phone = '') {
  return phone.replace(/\D/g, '');
}

function splitAdresse(adresse = '') {
  const parts = adresse.split(',').map(p => p.trim()).filter(Boolean);
  return {
    street: parts[0] || '',
    postalCode: parts.find(p => /^\d{5}$/.test(p)) || '',
    city: parts[2] || '',
    country: parts[3] || 'France',
  };
}

// --- Fonction principale pour un fichier ---
async function normalizeFile(inputFile, outputFile) {
  const rl = readline.createInterface({
    input: fs.createReadStream(inputFile),
    crlfDelay: Infinity,
  });

  const output = fs.createWriteStream(outputFile);
  let count = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    const raw = JSON.parse(line);
    const adresseSplit = splitAdresse(raw.adresse);

    const cleaned = {
      nom: raw.nom?.trim() || '',
      nomNormalise: normalizeString(raw.nom),
      typeCollectivite: 'Commune',

      region: raw.region || '',
      departement: raw.departement || '',
      departementCode: raw.departementCode || '',

      adresse: {
        street: adresseSplit.street,
        postalCode: adresseSplit.postalCode || raw.codePostal?.trim() || '',
        city: adresseSplit.city,
        country: adresseSplit.country,
      },

      contacts: {
        email: raw.email?.trim() || '',
        telephone: cleanPhone(raw.telephone),
      },

      horaires: raw.horaires?.trim() || '',

      latitude: raw.latitude ?? null,
      longitude: raw.longitude ?? null,

      website: raw.website || '',
      hasWebsite: Boolean(raw.website),
      hasHoraires: Boolean(raw.horaires),

      url: raw.url,
    };

    output.write(JSON.stringify(cleaned) + '\n');
    count++;

    if (count % 50 === 0) {
      console.log(`🧹 ${count} lignes traitées pour ${path.basename(inputFile)}`);
    }
  }

  output.end();
  console.log(`✅ Fichier normalisé : ${path.basename(outputFile)} (${count} lignes)`);
}

// --- Parcours de tous les fichiers .jsonl du dossier ---
async function run() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.jsonl'));

  console.log(`🔎 ${files.length} fichiers trouvés dans ${INPUT_DIR}`);

  for (const file of files) {
    const inputFile = path.join(INPUT_DIR, file);
    const outputFile = path.join(OUTPUT_DIR, file.replace('.jsonl', '_clean.jsonl'));
    await normalizeFile(inputFile, outputFile);
  }

  console.log(`\n🎉 Tous les fichiers ont été normalisés dans ${OUTPUT_DIR}`);
}

run().catch(console.error);
