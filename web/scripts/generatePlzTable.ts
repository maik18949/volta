// Usage (aus web/): pnpm generate:plz <pfad-zu-german-postcodes.csv>
// Quelle der CSV: https://gist.github.com/pmdroid/6ae8286a494cafce82b6ea5f6cc2362a
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { STATE_NAMES } from '../lib/data/landTransferTaxRates';
import { parsePostcodeCsv, renderTableModule } from './plzTableBuilder';

const SOURCE_NOTE =
  'GitHub-Gist pmdroid/6ae8286a494cafce82b6ea5f6cc2362a (german-postcodes.csv), bereinigt';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) fail('Usage: pnpm generate:plz <path-to-german-postcodes.csv>');

let csv: string;
try {
  csv = readFileSync(csvPath, 'utf8');
} catch (err) {
  fail(`Cannot read ${csvPath}: ${err instanceof Error ? err.message : String(err)}`);
}

const table = parsePostcodeCsv(csv);

if (table.unique.size === 0) fail('Refusing to write: no unique PLZ found in the CSV.');
const covered = new Set(table.unique.values());
const missing = STATE_NAMES.filter((name) => !covered.has(name));
if (missing.length > 0) {
  fail(`Refusing to write: Bundesländer without any unique PLZ: ${missing.join(', ')}`);
}

const outPath = path.resolve(__dirname, '../lib/data/plzToState.ts');
writeFileSync(outPath, renderTableModule(table, SOURCE_NOTE));

console.log(`PLZ eindeutig: ${table.unique.size}, uneindeutig: ${table.ambiguous.size}`);
for (const [plz, states] of [...table.ambiguous].sort()) console.log(`  ${plz}: ${states.join(' / ')}`);
console.log(`Geschrieben: ${outPath}`);
