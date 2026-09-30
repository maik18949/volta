/**
 * Grunderwerbsteuersätze je Bundesland (Prozent des Kaufpreises).
 * Quelle: Angabe des Projektinhabers, Stand 29.09.2026.
 */
export const GERMAN_STATES = [
  { name: 'Baden-Württemberg', ratePercent: 5 },
  { name: 'Bayern', ratePercent: 3.5 },
  { name: 'Berlin', ratePercent: 6 },
  { name: 'Brandenburg', ratePercent: 6.5 },
  { name: 'Bremen', ratePercent: 5.5 },
  { name: 'Hamburg', ratePercent: 5.5 },
  { name: 'Hessen', ratePercent: 6 },
  { name: 'Mecklenburg-Vorpommern', ratePercent: 6 },
  { name: 'Niedersachsen', ratePercent: 5 },
  { name: 'Nordrhein-Westfalen', ratePercent: 6.5 },
  { name: 'Rheinland-Pfalz', ratePercent: 5 },
  { name: 'Saarland', ratePercent: 6.5 },
  { name: 'Sachsen', ratePercent: 5.5 },
  { name: 'Sachsen-Anhalt', ratePercent: 5 },
  { name: 'Schleswig-Holstein', ratePercent: 6.5 },
  { name: 'Thüringen', ratePercent: 5 },
] as const;

export type StateName = (typeof GERMAN_STATES)[number]['name'];

export const STATE_NAMES: readonly StateName[] = GERMAN_STATES.map((s) => s.name);

export function isStateName(value: string): value is StateName {
  return (STATE_NAMES as readonly string[]).includes(value);
}

/** Steuersatz in Prozent (z. B. 5.5) oder null, wenn `state` kein kanonischer Ländername ist. */
export function landTransferTaxRatePercent(state: string): number | null {
  return GERMAN_STATES.find((s) => s.name === state)?.ratePercent ?? null;
}

/** Vorschlag = Satz × Gesamtkaufpreis, auf Cent gerundet; null ohne bekanntes Bundesland. */
export function suggestLandTransferTax(state: string, purchasePrice: number): number | null {
  const rate = landTransferTaxRatePercent(state);
  if (rate === null) return null;
  return Math.round(purchasePrice * rate) / 100;
}

// The ü -> ue fold is the only special case because ü is the only umlaut in the Bundesland names.
function fold(text: string): string {
  return text.normalize('NFC').trim().toLowerCase().replace(/ü/g, 'ue').replace(/\s+/g, ' ');
}

/** Bildet Freitext auf den kanonischen Ländernamen ab; leer, wenn nicht erkennbar. */
export function normalizeState(text: string): StateName | '' {
  const key = fold(text);
  return STATE_NAMES.find((name) => fold(name) === key) ?? '';
}
