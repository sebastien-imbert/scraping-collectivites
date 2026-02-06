const fs = require("fs");
const readline = require("readline");

const INPUT = "epci_enriched.jsonl";
const OUTPUT = "epci_clean.jsonl";

const rl = readline.createInterface({
  input: fs.createReadStream(INPUT),
  crlfDelay: Infinity,
});

const out = fs.createWriteStream(OUTPUT);

rl.on("line", (line) => {
  if (!line.trim()) return;

  const { epci, communes } = JSON.parse(line);

  const cleaned = {
    ...epci,
    communes,
  };

  out.write(JSON.stringify(cleaned) + "\n");
});

rl.on("close", () => {
  out.end();
  console.log("✅ epci_clean.jsonl généré");
});
