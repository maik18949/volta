import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

export interface KpiInfo {
  name: string;
  formula: string;
  meaning: string;
  benchmarks: Array<{ label: string; range: string }>;
  context: string;
}

// Formula/meaning/benchmark ranges from spec-overview-tab.md's 3-tier table;
// "context" copy from docs/superpowers/specs/2026-06-14-kpi-benchmarks.md.
export const KPI_INFO: Record<BenchmarkKpi, KpiInfo> = {
  grossYield: {
    name: 'Bruttorendite',
    formula: '(Kaltmiete + Parkingmiete) × 12 / Kaufpreis',
    meaning: 'Rohertrag der Immobilie ohne laufende Kosten — guter erster Vergleichswert, aber kein Maß für die tatsächliche Rentabilität.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≥ 5 %' },
      { label: 'Orange (ok)', range: '3 – 5 %' },
      { label: 'Rot (schlecht)', range: '< 3 %' },
    ],
    context:
      'Bei Finanzierungskosten von 4%+ deckt eine Bruttorendite unter 4,5% oft nicht mal die Zinsen nach Bewirtschaftungskosten. In A-Lagen sind 2,5–3,5% strukturell bedingt durch hohe Kaufpreise — kein Qualitätsmerkmal.',
  },
  netYield: {
    name: 'Nettorendite',
    formula: 'NOI (Nettobetriebsergebnis) / Gesamtinvestment',
    meaning: 'Beste Vergleichskennzahl für die tatsächliche Performance — berücksichtigt laufende Kosten und Kaufnebenkosten.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≥ 4 %' },
      { label: 'Orange (ok)', range: '2 – 4 %' },
      { label: 'Rot (schlecht)', range: '< 2 %' },
    ],
    context:
      'Faustregel: Nettorendite = Bruttorendite minus 1,5 bis 2,5 Prozentpunkte. Bei 4% Zinsen ist eine Nettorendite unter 2% wirtschaftlich kritisch.',
  },
  cashOnCash: {
    name: 'Cash-on-Cash Return',
    formula: 'Cashflow nach Steuern (Jahr) / eingesetztes Eigenkapital',
    meaning: 'Wie gut arbeitet das eingesetzte Eigenkapital — wichtigster Vergleich zu anderen Anlageformen.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≥ 6 %' },
      { label: 'Orange (ok)', range: '3 – 6 %' },
      { label: 'Rot (schlecht)', range: '< 3 %' },
    ],
    context:
      'Bei aktuellen Zinsen und typischen Kaufpreisfaktoren in A/B-Städten ist 0–2% realistisch — in A-Lagen oft negativ. Stark hebel-abhängig: mehr Eigenkapital senkt den prozentualen CoC trotz besserem Zins-Coverage.',
  },
  kaufpreisfaktor: {
    name: 'Kaufpreisfaktor',
    formula: 'Kaufpreis / Jahreskaltmiete',
    meaning: 'Wie viele Jahresmieten der Kaufpreis entspricht — Kehrwert der Bruttorendite × 100.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≤ 20×' },
      { label: 'Orange (ok)', range: '20 – 25×' },
      { label: 'Rot (schlecht)', range: '> 25×' },
    ],
    context:
      'A-Lagen lagen 2024 bei 25–35, B-Lagen bei 18–25, C-Lagen unter 18. Ein Faktor unter 15 kann auf strukturelle Risiken hinweisen (Leerstand, schrumpfende Region).',
  },
  dscr: {
    name: 'DSCR (Debt Service Coverage Ratio)',
    formula: 'NOI / jährlicher Schuldendienst (Kreditrate × 12)',
    meaning: 'Risiko-Indikator — unter 1,0 trägt die Immobilie den Kredit nicht allein aus dem Betriebsergebnis.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≥ 1,25' },
      { label: 'Orange (ok)', range: '1,0 – 1,25' },
      { label: 'Rot (schlecht)', range: '< 1,0' },
    ],
    context:
      'Banken fordern für Kreditvergabe typischerweise 1,2–1,5. Bei aktuellen Zinsen (4%+) ist ein DSCR über 1,0 in A/B-Lagen schwer zu erreichen — 0,85–1,0 ist für Privatinvestoren mit Einkommensnachweis strukturell normal.',
  },
  ltv: {
    name: 'LTV (Loan-to-Value)',
    formula: 'Restschuld / Gesamtinvestment',
    meaning: 'Verschuldungsgrad der Immobilie — je niedriger, desto weniger Zins- und Refinanzierungsrisiko.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≤ 70 %' },
      { label: 'Orange (ok)', range: '70 – 80 %' },
      { label: 'Rot (schlecht)', range: '> 80 %' },
    ],
    context:
      'Banken bieten die besten Konditionen unter 60% LTV (Pfandbrief-Beleihungsgrenze). Ab 80% steigen die Zinsen deutlich — ca. +1,3 Prozentpunkte.',
  },
  actualVacancyRate: {
    name: 'Tatsächliche Leerstandsquote',
    formula: 'Leerstandstage seit Erwerb / Eigentumstage seit Erwerb',
    meaning: 'Ist-Wert im Vergleich zur angenommenen Leerstandsquote (Mietausfallwagnis) aus den Objektdaten.',
    benchmarks: [
      { label: 'Grün (gut)', range: '≤ 3 %' },
      { label: 'Orange (ok)', range: '3 – 8 %' },
      { label: 'Rot (schlecht)', range: '> 8 %' },
    ],
    context: 'Nationaler Markt-Leerstand Ende 2024 bei ~2,2%. In strukturschwachen Regionen reale Leerstandsquoten von 10–15%+.',
  },
};
