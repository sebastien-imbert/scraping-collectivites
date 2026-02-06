const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data_clean', 'ecpi');
const OUTPUT_MD = path.join(__dirname, 'report_ecpi.md');

const pct = (n, total) => (total === 0 ? '0.00' : ((n / total) * 100).toFixed(2));

function createEmptyStats() {
  return {
    total: 0,
    noEmail: 0,
    noTelephone: 0,
    noWebsite: 0,
    noLatLng: 0,
    noContactAtAll: 0,
    emptyPageLikely: 0,
    byType: {}, // pour compter par type d'EPCI
  };
}

function analyzeLines(lines, stats) {
  for (const line of lines) {
    const c = JSON.parse(line);

    const hasEmail = !!c.contacts?.email || !!c.email;
    const hasTel = !!c.contacts?.telephone || !!c.telephone;
    const hasWebsite = !!c.website;
    const hasLatLng = c.latitude !== null && c.longitude !== null;

    stats.total++;

    if (!hasEmail) stats.noEmail++;
    if (!hasTel) stats.noTelephone++;
    if (!hasWebsite) stats.noWebsite++;
    if (!hasLatLng) stats.noLatLng++;
    if (!hasEmail && !hasTel && !hasWebsite) stats.noContactAtAll++;
    if (!hasEmail && !hasTel && !hasWebsite && !hasLatLng) stats.emptyPageLikely++;

    // Comptage par type d'EPCI
    const type = c.typeEpci || 'Inconnu';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  }
}

function statsToMarkdown(title, stats) {
  let md = `
## ${title}

- **Total EPCI** : ${stats.total}

| Indicateur | Nombre | % |
|-----------|--------|----|
| Sans email | ${stats.noEmail} | ${pct(stats.noEmail, stats.total)} % |
| Sans téléphone | ${stats.noTelephone} | ${pct(stats.noTelephone, stats.total)} % |
| Sans site web | ${stats.noWebsite} | ${pct(stats.noWebsite, stats.total)} % |
| Sans GPS | ${stats.noLatLng} | ${pct(stats.noLatLng, stats.total)} % |
| Sans aucun contact | ${stats.noContactAtAll} | ${pct(stats.noContactAtAll, stats.total)} % |
| Pages probablement vides | ${stats.emptyPageLikely} | ${pct(stats.emptyPageLikely, stats.total)} % |
`;

  // Tableau par type d'EPCI
  md += `\n### Répartition par type d'EPCI\n\n`;
  md += `| Type d'EPCI | Nombre | % |\n|-----------|--------|----|\n`;
  for (const [type, count] of Object.entries(stats.byType)) {
    md += `| ${type} | ${count} | ${pct(count, stats.total)} % |\n`;
  }

  return md;
}

function main() {
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.jsonl'));

  if (files.length === 0) {
    console.log('Aucun fichier EPCI trouvé');
    return;
  }

  let md = `# Rapport Qualité Données EPCI\n\n`;
  md += `Généré le ${new Date().toLocaleString()}\n\n---\n`;

  const globalStats = createEmptyStats();

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);

    const fileStats = createEmptyStats();
    analyzeLines(lines, fileStats);
    analyzeLines(lines, globalStats);

    md += statsToMarkdown(`Fichier – ${file}`, fileStats);
    md += `\n---\n`;
  }

  md += `\n# GLOBAL\n`;
  md += statsToMarkdown('Tous EPCI', globalStats);

  fs.writeFileSync(OUTPUT_MD, md, 'utf-8');
  console.log('✅ Rapport Markdown généré :', OUTPUT_MD);
}

main();
