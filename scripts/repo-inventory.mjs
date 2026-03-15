import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "omnia.repo.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

function printSection(title, rows) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
  for (const row of rows) {
    console.log(`${row.id.padEnd(18)} ${row.path} [${row.status}]`);
  }
}

console.log(`${manifest.name} repo inventory`);
console.log("=".repeat(`${manifest.name} repo inventory`.length));

console.log("\nTop-level taxonomy");
console.log("------------------");
for (const [key, value] of Object.entries(manifest.topLevel)) {
  console.log(`${key.padEnd(12)} ${value}`);
}

printSection("Core products", manifest.coreApps);
printSection("Website properties", manifest.websiteProperties);
printSection("Prototype areas", manifest.prototypeAreas);
