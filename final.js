import fs from "fs";
import readline from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLLECTIVITES_FILE = path.join(__dirname, "all.jsonl");
const EPCI_FILE = path.join(__dirname, "epci_enriched.jsonl");
const OUTPUT_FILE = path.join(__dirname, "collectivites_enriched.jsonl");

/* ------------------ LOAD EPCI MAP ------------------ */

const epciMap = new Map();

for (const line of fs.readFileSync(EPCI_FILE, "utf8").split("\n")) {
  if (!line.trim()) continue;
  const obj = JSON.parse(line);
  epciMap.set(obj.epci.code, obj.epci);
}

/* ------------------ GEO API ------------------ */

async function fetchCommune(nom, departementCode) {
  const url = `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(
    nom
  )}&codeDepartement=${departementCode}&fields=nom,code,population,codeEpci&format=json`;

  const res = await fetch(url);
  const data = await res.json();

  return data[0] || null;
}

/* ------------------ PROCESS ------------------ */

const rl = readline.createInterface({
  input: fs.createReadStream(COLLECTIVITES_FILE),
});

const out = fs.createWriteStream(OUTPUT_FILE);

for await (const line of rl) {
  if (!line.trim()) continue;

  const collectivite = JSON.parse(line);

  const communeGeo = await fetchCommune(
    collectivite.nom,
    collectivite.departementCode
  );

  if (!communeGeo) {
    console.warn(`❌ Commune non trouvée: ${collectivite.nom}`);
    continue;
  }

  const epci = epciMap.get(communeGeo.codeEpci);

  const enriched = {
    ...collectivite,
    codeInsee: communeGeo.code,
    population: communeGeo.population,
    epci: epci
      ? {
          nom: epci.nom,
          code: epci.code,
        }
      : null,
  };

  out.write(JSON.stringify(enriched) + "\n");
}

console.log("✅ collectivites_enriched.jsonl généré");
