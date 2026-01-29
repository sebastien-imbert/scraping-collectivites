const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'collectivites_0-500.json';
const OUTPUT_DIR = './csv_by_departement';

// 1️⃣ Crée le dossier de sortie si nécessaire
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// 2️⃣ Lire le JSON
const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
const collectivites = JSON.parse(rawData);

// 3️⃣ Regrouper par département
const grouped = {};

collectivites.forEach(item => {
  const cp = item.codePostal || '';
  const dep = cp.slice(0, 2); // prend les 2 premiers chiffres
  if (!dep) return;

  if (!grouped[dep]) grouped[dep] = [];
  grouped[dep].push(item);
});

// 4️⃣ Fonction utilitaire pour convertir un tableau en CSV
function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(';'), // séparateur Excel FR
    ...rows.map(row =>
headers.map(h => {
  const value = row[h] ?? '';
  return `"${String(value).replace(/"/g, '""')}"`;
}).join(';')
    )
  ].join('\n');
  return csv;
}

// 5️⃣ Écrire un CSV par département
Object.entries(grouped).forEach(([dep, rows]) => {
  const csv = toCSV(rows);
  const fileName = path.join(OUTPUT_DIR, `collectivites_${dep}.csv`);
  fs.writeFileSync(fileName, csv, 'utf-8');
  console.log(`✅ Département ${dep} → ${rows.length} lignes → ${fileName}`);
});

console.log('🎉 Tous les CSV ont été générés !');
