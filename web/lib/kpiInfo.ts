import type { BenchmarkKpi } from '@/lib/calculations/kpiCalculator';

export interface KpiInfo {
  name: string;
  /** General formula, may contain \n for multi-line display. */
  formula: string;
  /** "Wozu" — what the KPI is for / why it matters. */
  purpose: string;
  /** "Wann gut" — the threshold and why. */
  goodWhen: string;
  /** "Einordnung" — additional market context. Omitted entirely from the popup when absent. */
  einordnung?: string;
}

// Copy from docs/superpowers/specs/2026-08-01-uebersicht-redesign-design.md.
export const KPI_INFO: Record<BenchmarkKpi, KpiInfo> = {
  grossYield: {
    name: 'Bruttorendite',
    formula: '(Kaltmiete + Stellplatzmiete) × 12\n÷ Kaufpreis',
    purpose: 'Erster grober Vergleichswert zwischen Objekten — zeigt den Rohertrag, bevor laufende Kosten abgezogen werden.',
    goodWhen:
      'Ab 5 % ist die Miete komfortabel höher als typische Finanzierungskosten. Unter 3 % deckt die Miete oft nicht mal die Zinsen nach Bewirtschaftungskosten.',
    einordnung: 'In A-Lagen sind 2,5–3,5 % strukturell bedingt durch hohe Kaufpreise — kein Qualitätsmerkmal, sondern Marktrealität.',
  },
  netYield: {
    name: 'Nettorendite',
    formula: 'NOI (Nettobetriebsergebnis)\n÷ Gesamtinvestment',
    purpose:
      'Beste Vergleichskennzahl für die tatsächliche Performance — berücksichtigt laufende Kosten und Kaufnebenkosten, anders als die Bruttorendite.',
    goodWhen: 'Ab 4 % ist die Rendite nach Kosten solide. Unter 2 % ist sie bei aktuellen Zinsen von 4 %+ wirtschaftlich kritisch.',
    einordnung: 'Faustregel: Nettorendite = Bruttorendite minus 1,5 bis 2,5 Prozentpunkte.',
  },
  cashOnCash: {
    name: 'Cash-on-Cash Return',
    formula:
      'Cashflow vor Steuern (Jahr)\n÷ eingesetztes Eigenkapital\n\nCashflow vor Steuern = Mieteinnahmen\n− volle Kreditrate (Zins + Tilgung) − Bewirtschaftungskosten',
    purpose:
      'Zeigt, wie viel Bargeld die Immobilie dieses Jahr abwirft, relativ zum eingesetzten Eigenkapital — ohne Anrechnung von Tilgung oder Wertsteigerung. Für die Gesamtrendite inkl. Vermögensaufbau siehe „Eigenkapitalrendite".',
    goodWhen:
      'Ab 6 % ist der Cashflow deutlich positiv zum Eigenkapital. Unter 3 % (oder negativ) trägt sich die Investition kaum aus laufenden Einnahmen.',
    einordnung:
      'Bei aktuellen Zinsen und typischen Kaufpreisfaktoren in A/B-Städten ist 0–2 % realistisch — in A-Lagen oft negativ. Stark hebel-abhängig: mehr Eigenkapital senkt den prozentualen CoC trotz besserem Zins-Coverage.',
  },
  eigenkapitalrendite: {
    name: 'Eigenkapitalrendite',
    formula:
      '(Jahresnettokaltmiete − nicht umlegbare Kosten p.a.\n− Steuern p.a. − Zinskosten p.a.)\n÷ eingesetztes Eigenkapital\n\nEntspricht Cash-on-Cash, aber nur der Zinsanteil\nder Kreditrate wird abgezogen (nicht die Tilgung).',
    purpose:
      'Wie Cash-on-Cash, aber die Tilgung wird nicht als Kosten behandelt — sie baut ja Vermögen auf, auch wenn kein Bargeld fließt. Enthält keine Wertsteigerung.',
    goodWhen:
      'Ab 8 % ist die Gesamtrendite auf das Eigenkapital stark. Unter 4 % ist sie schwach, selbst wenn der Cash-on-Cash-Wert negativ aussieht.',
    einordnung:
      'Da nur Zinsen statt der vollen Kreditrate abgezogen werden, liegt die Eigenkapitalrendite immer über dem Cash-on-Cash-Wert (um genau den Tilgungsanteil ÷ eingesetztes Eigenkapital) — das ist kein Fehler, sondern der Unterschied zwischen den beiden Kennzahlen.',
  },
  kaufpreisfaktor: {
    name: 'Kaufpreisfaktor',
    formula: 'Kaufpreis ÷ Jahreskaltmiete',
    purpose:
      'Zeigt, wie viele Jahresmieten der Kaufpreis entspricht — gebräuchlich unter Maklern und Banken, Kehrwert der Bruttorendite × 100.',
    goodWhen: 'Bis 20× gilt als günstig. Über 25× ist der Kaufpreis im Verhältnis zur Miete hoch.',
    einordnung:
      'A-Lagen lagen 2024 bei 25–35, B-Lagen bei 18–25, C-Lagen unter 18. Ein Faktor unter 15 kann auf strukturelle Risiken hinweisen (Leerstand, schrumpfende Region).',
  },
  dscr: {
    name: 'DSCR (Debt Service Coverage Ratio)',
    formula: 'NOI\n÷ jährlicher Schuldendienst (Kreditrate × 12)',
    purpose:
      'Risiko-Indikator, ob die Immobilie den Kredit allein aus dem Betriebsergebnis trägt — wichtig für Banken und zur eigenen Absicherung.',
    goodWhen: 'Ab 1,25 trägt sich der Kredit komfortabel aus dem Betriebsergebnis. Unter 1,0 reicht das Betriebsergebnis allein nicht aus.',
    einordnung:
      'Banken fordern für Kreditvergabe typischerweise 1,2–1,5. Bei aktuellen Zinsen (4 %+) ist ein DSCR über 1,0 in A/B-Lagen schwer zu erreichen — 0,85–1,0 ist für Privatinvestoren mit Einkommensnachweis strukturell normal.',
  },
  ltv: {
    name: 'LTV (Loan-to-Value)',
    formula: 'Restschuld ÷ Gesamtinvestment',
    purpose:
      'Zeigt den Verschuldungsgrad der Immobilie — je niedriger, desto weniger Zins- und Refinanzierungsrisiko bei einer Anschlussfinanzierung.',
    goodWhen: 'Unter 70 % gelten meist die besten Bankkonditionen. Ab 80 % steigen die Zinsen spürbar.',
    einordnung:
      'Banken bieten die besten Konditionen unter 60 % LTV (Pfandbrief-Beleihungsgrenze). Ab 80 % steigen die Zinsen deutlich — ca. +1,3 Prozentpunkte.',
  },
  actualVacancyRate: {
    name: 'Tatsächliche Leerstandsquote',
    formula: 'Leerstandstage seit wirtschaftlichem Übergang\n÷ Eigentumstage seit wirtschaftlichem Übergang',
    purpose:
      'Zeigt den Ist-Leerstand seit dem wirtschaftlichen Übergang im Vergleich zur angenommenen Leerstandsquote (Mietausfallwagnis) aus den Objektdaten. Mietgarantie-Phasen zählen nicht als Leerstand — da fließt garantierte Miete, auch ohne Mieter.',
    goodWhen: 'Unter 3 % ist der Leerstand gering. Über 8 % liegt deutlich über dem, was die meisten Kalkulationen einplanen.',
    einordnung: 'Nationaler Markt-Leerstand Ende 2024 bei ~2,2 %. In strukturschwachen Regionen reale Leerstandsquoten von 10–15 %+.',
  },
};
