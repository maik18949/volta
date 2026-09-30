// Usage (aus web/): pnpm generate:plz <pfad-zu-german-postcodes.csv>
// Quelle der CSV: https://gist.github.com/pmdroid/6ae8286a494cafce82b6ea5f6cc2362a
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parsePostcodeCsv, renderTableModule } from './plzTableBuilder';

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: pnpm generate:plz <path-to-german-postcodes.csv>');
  process.exit(1);
}

const table = parsePostcodeCsv(readFileSync(csvPath, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const source = `GitHub-Gist pmdroid/6ae8286a494cafce82b6ea5f6cc2362a (german-postcodes.csv), bereinigt, erzeugt am ${today}`;
const outPath = path.resolve(process.cwd(), 'lib/data/plzToState.ts');
writeFileSync(outPath, renderTableModule(table, source));

console.log(`PLZ eindeutig: ${table.unique.size}, uneindeutig: ${table.ambiguous.size}`);
for (const [plz, states] of [...table.ambiguous].sort()) console.log(`  ${plz}: ${states.join(' / ')}`);
console.log(`Geschrieben: ${outPath}`);
