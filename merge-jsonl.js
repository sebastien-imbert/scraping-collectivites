const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT_DIR = path.join(__dirname, 'data_clean');
const OUTPUT_FILE = path.join(__dirname, 'all.jsonl');

async function mergeJsonl() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.jsonl'));

  if (files.length === 0) {
    console.log('❌ Aucun fichier jsonl trouvé');
    return;
  }

  // reset fichier output
  fs.writeFileSync(OUTPUT_FILE, '');

  const outputStream = fs.createWriteStream(OUTPUT_FILE, { flags: 'a' });

  let totalLines = 0;

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    console.log(`📂 Merge ${file}...`);

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;
      outputStream.write(line + '\n');
      totalLines++;
    }
  }

  outputStream.end();

  console.log(`\n🎉 Merge terminé`);
  console.log(`📁 Fichier : ${OUTPUT_FILE}`);
  console.log(`🧾 Lignes totales : ${totalLines}`);
}

mergeJsonl();
