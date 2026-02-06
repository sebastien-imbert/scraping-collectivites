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
    emptyPageLikely: 0
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

    const isEmptyPage = !hasEmail && !hasTel && !hasWebsite && !hasLatLng;
    if (isEmptyPage) stats.emptyPageLikely++;
  }
}

function statsToMarkdown(title, stats) {
  return `
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
