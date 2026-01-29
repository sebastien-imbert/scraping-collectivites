const fs = require('fs');
const path = require('path');

// 🔧 À adapter
const INPUT_FILE = path.join(__dirname, 'data', '02_mairies_aisne.jsonl');

const lines = fs.readFileSync(INPUT_FILE, 'utf-8').split('\n').filter(Boolean);
const total = lines.length;

const stats = {
  noEmail: 0,
  noTelephone: 0,
  noWebsite: 0,
  noLatLng: 0,
  noContactAtAll: 0,
  emptyPageLikely: 0
};

for (const line of lines) {
  const c = JSON.parse(line);
  const hasEmail = !!c.email;
  const hasTel = !!c.telephone;
  const hasWebsite = !!c.website;
  const hasLatLng = c.latitude !== null && c.longitude !== null;

  if (!hasEmail) stats.noEmail++;
  if (!hasTel) stats.noTelephone++;
  if (!hasWebsite) stats.noWebsite++;
  if (!hasLatLng) stats.noLatLng++;

  if (!hasEmail && !hasTel && !hasWebsite) stats.noContactAtAll++;

  const isEmptyPage = !hasEmail && !hasTel && !hasWebsite && !c.horaires && !hasLatLng;
  if (isEmptyPage) stats.emptyPageLikely++;
}

const pct = n => ((n / total) * 100).toFixed(2);

console.log('📊 Analyse des collectivités');
console.log('-----------------------------');
console.log(`Total collectivités : ${total}`);
console.log('');
console.log(`❌ Sans email       : ${stats.noEmail} (${pct(stats.noEmail)} %)`);
console.log(`❌ Sans téléphone   : ${stats.noTelephone} (${pct(stats.noTelephone)} %)`);
console.log(`❌ Sans site web    : ${stats.noWebsite} (${pct(stats.noWebsite)} %)`);
console.log(`❌ Sans GPS         : ${stats.noLatLng} (${pct(stats.noLatLng)} %)`);
console.log('');
console.log(`🚨 Sans aucun contact (email + tel + site) : ${stats.noContactAtAll} (${pct(stats.noContactAtAll)} %)`);
console.log(`💥 Pages probablement en erreur           : ${stats.emptyPageLikely} (${pct(stats.emptyPageLikely)} %)`);
console.log('-----------------------------');