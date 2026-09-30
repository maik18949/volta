/**
 * Hinweis: Alle Prozentwerte in dieser Datei sind GANZE Prozent (0-100), nicht Dezimalbrüche,
 * weil sie die Eingabe im UI-Feld abbilden.
 */

/** Gebäudeanteil in Prozent (0-100, zwei Nachkommastellen) aus den Euro-Werten; null ohne Kaufpreis. */
export function buildingSharePercent(buildingValue: number, purchasePrice: number): number | null {
  if (!(purchasePrice > 0)) return null;
  return Math.round((buildingValue / purchasePrice) * 10000) / 100;
}

/** Begrenzt einen Prozentwert (0-100) auf 0..100; NaN wird zu 0. */
export function clampPercent(percent: number): number {
  if (Number.isNaN(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

/** Gebäudewert = Anteil (ganze Prozent, 0-100) x Kaufpreis (auf Cent), Grundstückswert = Rest. */
export function valuesFromBuildingShare(percent: number, purchasePrice: number): { buildingValue: number; landValue: number } {
  const buildingValue = Math.round(purchasePrice * clampPercent(percent)) / 100;
  const landValue = Math.round((purchasePrice - buildingValue) * 100) / 100;
  return { buildingValue, landValue };
}

const PERCENT_INPUT = /^(\d{0,3})(?:[.,](\d{0,2}))?$/;

/**
 * Parst die Texteingabe des Prozentfelds (ganze Prozent). Erlaubt '.' oder ',' als Dezimaltrenner,
 * höchstens 3 Vorkomma- und 2 Nachkommastellen; '' ergibt 0. Ungültige Eingabe ergibt null
 * (Aufrufer ignorieren sie). Begrenzt NICHT auf 0..100 - das macht `valuesFromBuildingShare`.
 */
export function parsePercentInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return 0;
  const match = PERCENT_INPUT.exec(trimmed);
  if (!match) return null;
  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';
  return Number(`${whole === '' ? '0' : whole}.${fraction === '' ? '0' : fraction}`);
}

/** Anzeigetext für das Prozentfeld (deutsches Dezimalkomma), z. B. 80.71 -> '80,71', 80 -> '80'. */
export function formatPercentInput(percent: number): string {
  return String(percent).replace('.', ',');
}
