# Übersicht-Seite Redesign

Status: approved, ready for implementation plan
Branch: `redesign-uebersicht-seite`

## Kontext

Die Übersicht-Seite (`web/app/(app)/properties/[id]/page.tsx`) einer Immobilie zeigt eine Kennzahlen-Leiste, eine "Rendite & Investment"-Card mit 8 KPIs, einen "Aktueller Stand"-Block und weitere Cards. Dieses Dokument beschreibt vier zusammenhängende Änderungen, die gemeinsam brainstormed wurden:

1. Seitenkopf: Foto + Objektdaten wandern nach oben, KPI-Leiste folgt darunter
2. Ampel-Punkt (rot/orange/grün) wird durch eine Verlaufs-Skala mit Positions-Marker ersetzt
3. Info-Popup je KPI wird neu strukturiert (kein Overlay, Formel mit echten Zahlen, klarere Texte, Skala statt Tabelle)
4. "Laufende Kosten" im Aktueller-Stand-Block wird aufgeschlüsselt

Alle visuellen Entscheidungen wurden mit dem Nutzer per Mockup-Vergleich (Browser-Companion) abgestimmt.

## 1. Seitenkopf: Foto + Objektdaten + KPI-Leiste

**Heutiger Zustand:** `OverviewKpiBar` (sticky) → `PropertyHeaderPhoto` (200px hohes Vollbreite-Foto) → `CurrentStatusCard` → `ReturnsCard` → `FinancingCard` → `ObjectCard` (alle Objektfelder, weit unten).

**Neu:** Eine Card ganz oben auf der Seite, bestehend aus:

- Links ein **quadratisches Foto** (120px), das horizontal durchscrollbar/wischbar ist (Scroll-Snap), sofern mehrere Fotos existieren. Anzeige: kleine Positions-Punkte unten mittig + Zähler-Badge ("2/5") oben rechts. Ohne Fotos bleibt der bisherige Platzhalter (Icon je `property_type`, Gradient-Hintergrund) — keine Punkte/Badge in dem Fall.
- Rechts daneben **alle Objektdaten**, die bisher in `ObjectCard` standen: Adresse (als Titel), Typ, Baujahr, Wohnfläche, Zimmer, Kaltmiete/m², Kaufpreis/m², Energieklasse, Zustand, Heizung, Stellplatz, plus `notes` falls vorhanden — als 2-spaltiges Grid wie im bisherigen `ObjectCard`.
- Direkt darunter, innerhalb derselben Card oder unmittelbar folgend: die KPI-Leiste (bisher `OverviewKpiBar`, nicht mehr sticky an der Seite, sondern Teil dieses Kopfbereichs — sticky-Verhalten wird in diesem Redesign fallengelassen, da die Leiste jetzt Teil des Seitenkopfs ist statt einer eigenen oben fixierten Leiste).

**`ObjectCard` entfällt** als eigene Card weiter unten auf der Seite — der Inhalt zieht komplett in den neuen Seitenkopf um. `PropertyHeaderPhoto` wird durch die neue Foto-Karussell-Komponente ersetzt.

### Foto-Karussell — technische Notizen

- Neue Komponente (ersetzt `PropertyHeaderPhoto`), erhält alle Fotos der Immobilie (nicht nur das Titelbild) sortiert wie in `FotosSection` / `resolveCoverPhoto` — Startposition ist das Titelbild (`is_cover_photo`), falls gesetzt, sonst das erste.
- Scrollen per natives horizontales Scrollen mit `scroll-snap-type: x mandatory` (kein JS-Slider nötig) — funktioniert per Touch-Wisch und Trackpad gleichermaßen.
- Punkte-Indikator und Zähler-Badge aktualisieren sich über einen Scroll-Listener (IntersectionObserver oder `scrollLeft`-Berechnung), rein clientseitig.
- Kein Editieren/Löschen/Titelbild-Setzen hier — das bleibt exklusiv der `FotosSection` auf der Immobiliendaten-Seite vorbehalten. Dieses Karussell ist nur zum Ansehen.

## 2. KPI-Skala statt Ampel-Punkt

Betrifft: `ReturnsCard` (8 KPI-Zeilen), `OverviewKpiBar` (Nettorendite, Cash-on-Cash, DSCR — "CF nach Steuern" hat keinen Benchmark und bleibt ohne Skala), und die Info-Popups (größere Variante mit Achsenbeschriftung).

**Neue Komponente `KpiScale`:**
- Durchgehender Rot→Orange→Grün-Farbverlauf (`linear-gradient(90deg, red 0%, orange 50%, green 100%)`), 6px hoch (Zeilen), etwas dünner in der schmalen `OverviewKpiBar` (5px, kürzere Breite, keine Achsenbeschriftung).
- Ein Marker (kleines nach unten zeigendes Dreieck/Caret, von oberhalb der Leiste) markiert die Position des aktuellen Werts.
- In den Popups zusätzlich kleine Achsenbeschriftung unter der Skala (Domain-Min, grüner Schwellwert, orangener Schwellwert, Domain-Max).
- Werte außerhalb der Domain werden auf 0% bzw. 100% geklemmt (Marker bleibt an Rand sichtbar, läuft nicht aus der Leiste heraus).

**Positions-Berechnung** — abhängig von der Richtung des jeweiligen KPI (`BENCHMARK_THRESHOLDS` in `kpiCalculator.ts`):
- `higherIsBetter`: `pct = clamp((value − domainMin) / (domainMax − domainMin), 0, 1)`
- `lowerIsBetter`: `pct = clamp((domainMax − value) / (domainMax − domainMin), 0, 1)` (niedriger Wert → weiter rechts/grün)

**Domains je KPI** (neu zu definieren, ergänzt `BENCHMARK_THRESHOLDS` um `domainMin`/`domainMax`):

| KPI | Richtung | Grün | Orange | Domain |
|---|---|---|---|---|
| Bruttorendite | höher besser | ≥ 5 % | 3–5 % | 0 % – 10 % |
| Nettorendite | höher besser | ≥ 4 % | 2–4 % | 0 % – 8 % |
| Cash-on-Cash | höher besser | ≥ 6 % | 3–6 % | −20 % – 20 % |
| Eigenkapitalrendite | höher besser | ≥ 8 % | 4–8 % | −10 % – 20 % |
| Kaufpreisfaktor | niedriger besser | ≤ 20× | 20–25× | 10× – 35× |
| DSCR | höher besser | ≥ 1,25 | 1,0–1,25 | 0 – 2,0 |
| LTV | niedriger besser | ≤ 70 % | 70–80 % | 0 % – 110 % |
| Tats. Leerstandsquote | niedriger besser | ≤ 3 % | 3–8 % | 0 % – 20 % |

Der Farbverlauf selbst bleibt ein fixer 3-Stop-Gradient (Drittel/Drittel/Drittel) unabhängig von der exakten Schwellenwert-Position innerhalb der Domain — das ist eine bewusste visuelle Vereinfachung (kein pixelgenaues Alignment von Gradient-Stop und Schwellenwert), so wie in den abgestimmten Mockups.

**Wertfarbe:** Der Zahlenwert selbst wird in derselben Ampelfarbe eingefärbt (`text-red-600` / `text-amber-600` / `text-emerald-600`), über dieselbe `benchmarkColor()`-Funktion wie bisher der Punkt.

**`KpiChip.tsx` wird gelöscht** — ersetzt durch `KpiScale` (Zeilen-Variante) + farbigen Wert.

**Card-Hintergrund** in `ReturnsCard`/`GlassCard`-Nutzung an dieser Stelle: weiß (`bg-white`) statt des bisherigen halbtransparenten Glass-Looks.

## 3. Info-Popup je KPI

`Modal.tsx` bzw. eine für diesen Zweck angepasste Variante: **kein dunkler Overlay mehr** (`bg-black/40` entfällt). Das Popup schwebt zentriert mit Schatten über der weiterhin voll sichtbaren Seite; Klick außerhalb schließt weiterhin (der Klick-Catcher bleibt, nur ohne sichtbare Abdunklung).

**Neuer Inhalt** (ersetzt die bisherige Struktur aus `formula` / `meaning` / `benchmarks`-Tabelle / `context`):

1. **Formel** — allgemein, mehrzeilig klarer formatiert (`÷` statt `/`, Klammern und Zeilenumbrüche für Lesbarkeit)
2. **Berechnung** — dieselbe Formel mit den echten Werten dieser Immobilie durchgerechnet, endet mit `= <Ergebnis>` hervorgehoben
3. **Wozu** — ein bis zwei Sätze: wofür die Kennzahl gut ist / warum sie relevant ist
4. **Wann gut** — ein bis zwei Sätze: ab welchem Wert es gut ist und kurz warum
5. **Skala** mit Achsenbeschriftung (ersetzt die Grün/Orange/Rot-Tabelle)
6. **Einordnung** (fett gesetztes Label) — zusätzlicher Marktkontext, **nur gerendert wenn vorhanden**; ist der Text leer/undefiniert, entfällt der komplette Abschnitt inklusive Trennlinie und Label (kein Platzhaltertext, keine leere Box)

### Datenanbindung für "Berechnung"

Die Formel-Substitution braucht Rohwerte, die aktuell nicht bis zur Popup-Komponente durchgereicht werden. `KpiInfoButton` (bzw. eine neue Wrapper-Komponente) braucht zusätzlich zum bisherigen `kpi`-Prop:
- die rohe `property`-Row (für `cold_rent_monthly`, `parking_rent_monthly`, `monthly_mortgage`, etc.)
- `summary: PropertySummary` und `overview: OverviewMetrics`
- zwei neue, bisher nur lokal in `computeOverviewMetrics` berechnete Zwischenwerte müssen auf `OverviewMetrics` ergänzt werden, da sie für Cash-on-Cash- und Eigenkapitalrendite-Berechnungen gebraucht werden: `cashflowBeforeTaxYear` und `eigenkapitalrenditeNumerator` (Namen final beim Implementieren)

Pro KPI wird eine kleine, reine Formatierungsfunktion gebraucht, die aus diesen Werten den "Berechnung"-String baut (z. B. `(999 € + 0 €) × 12 ÷ 280.000 € = 4,3 %`). Diese Funktionen leben sinnvollerweise neben `KPI_INFO` in `lib/kpiInfo.ts` oder einer neuen Datei, nicht in der Komponente selbst.

### Texte je KPI (neu formuliert)

Ersetzt `meaning`/`context`/`benchmarks` in `lib/kpiInfo.ts`. Neue Struktur pro Eintrag: `formula` (mehrzeilig), `purpose` ("Wozu"), `goodWhen` ("Wann gut"), `einordnung` (optional).

**Bruttorendite**
- Formel: `(Kaltmiete + Stellplatzmiete) × 12 ÷ Kaufpreis`
- Wozu: Erster grober Vergleichswert zwischen Objekten — zeigt den Rohertrag, bevor laufende Kosten abgezogen werden.
- Wann gut: Ab 5 % ist die Miete komfortabel höher als typische Finanzierungskosten. Unter 3 % deckt die Miete oft nicht mal die Zinsen nach Bewirtschaftungskosten.
- Einordnung: In A-Lagen sind 2,5–3,5 % strukturell bedingt durch hohe Kaufpreise — kein Qualitätsmerkmal, sondern Marktrealität.

**Nettorendite**
- Formel: `NOI (Nettobetriebsergebnis) ÷ Gesamtinvestment`
- Wozu: Beste Vergleichskennzahl für die tatsächliche Performance — berücksichtigt laufende Kosten und Kaufnebenkosten, anders als die Bruttorendite.
- Wann gut: Ab 4 % ist die Rendite nach Kosten solide. Unter 2 % ist sie bei aktuellen Zinsen von 4 %+ wirtschaftlich kritisch.
- Einordnung: Faustregel: Nettorendite = Bruttorendite minus 1,5 bis 2,5 Prozentpunkte.

**Cash-on-Cash Return**
- Formel: `Cashflow vor Steuern (Jahr) ÷ eingesetztes Eigenkapital` — Cashflow vor Steuern = Mieteinnahmen − volle Kreditrate (Zins + Tilgung) − Bewirtschaftungskosten
- Wozu: Zeigt, wie viel Bargeld die Immobilie dieses Jahr abwirft, relativ zum eingesetzten Eigenkapital — ohne Anrechnung von Tilgung oder Wertsteigerung. Für die Gesamtrendite inkl. Vermögensaufbau siehe „Eigenkapitalrendite".
- Wann gut: Ab 6 % ist der Cashflow deutlich positiv zum Eigenkapital. Unter 3 % (oder negativ) trägt sich die Investition kaum aus laufenden Einnahmen.
- Einordnung: Bei aktuellen Zinsen und typischen Kaufpreisfaktoren in A/B-Städten ist 0–2 % realistisch — in A-Lagen oft negativ. Stark hebel-abhängig: mehr Eigenkapital senkt den prozentualen CoC trotz besserem Zins-Coverage.

**Eigenkapitalrendite**
- Formel: `(Jahresnettokaltmiete − nicht umlegbare Kosten p.a. − Steuern p.a. − Zinskosten p.a.) ÷ eingesetztes Eigenkapital` — entspricht Cash-on-Cash, aber nur der Zinsanteil der Kreditrate wird abgezogen (nicht die Tilgung)
- Wozu: Wie Cash-on-Cash, aber die Tilgung wird nicht als Kosten behandelt — sie baut ja Vermögen auf, auch wenn kein Bargeld fließt. Enthält keine Wertsteigerung.
- Wann gut: Ab 8 % ist die Gesamtrendite auf das Eigenkapital stark. Unter 4 % ist sie schwach, selbst wenn der Cash-on-Cash-Wert negativ aussieht.
- Einordnung: Da nur Zinsen statt der vollen Kreditrate abgezogen werden, liegt die Eigenkapitalrendite immer über dem Cash-on-Cash-Wert (um genau den Tilgungsanteil ÷ eingesetztes Eigenkapital) — das ist kein Fehler, sondern der Unterschied zwischen den beiden Kennzahlen.

**Kaufpreisfaktor**
- Formel: `Kaufpreis ÷ Jahreskaltmiete`
- Wozu: Zeigt, wie viele Jahresmieten der Kaufpreis entspricht — gebräuchlich unter Maklern und Banken, Kehrwert der Bruttorendite × 100.
- Wann gut: Bis 20× gilt als günstig. Über 25× ist der Kaufpreis im Verhältnis zur Miete hoch.
- Einordnung: A-Lagen lagen 2024 bei 25–35, B-Lagen bei 18–25, C-Lagen unter 18. Ein Faktor unter 15 kann auf strukturelle Risiken hinweisen (Leerstand, schrumpfende Region).

**DSCR (Debt Service Coverage Ratio)**
- Formel: `NOI ÷ jährlicher Schuldendienst (Kreditrate × 12)`
- Wozu: Risiko-Indikator, ob die Immobilie den Kredit allein aus dem Betriebsergebnis trägt — wichtig für Banken und zur eigenen Absicherung.
- Wann gut: Ab 1,25 trägt sich der Kredit komfortabel aus dem Betriebsergebnis. Unter 1,0 reicht das Betriebsergebnis allein nicht aus.
- Einordnung: Banken fordern für Kreditvergabe typischerweise 1,2–1,5. Bei aktuellen Zinsen (4 %+) ist ein DSCR über 1,0 in A/B-Lagen schwer zu erreichen — 0,85–1,0 ist für Privatinvestoren mit Einkommensnachweis strukturell normal.

**LTV (Loan-to-Value)**
- Formel: `Restschuld ÷ Gesamtinvestment`
- Wozu: Zeigt den Verschuldungsgrad der Immobilie — je niedriger, desto weniger Zins- und Refinanzierungsrisiko bei einer Anschlussfinanzierung.
- Wann gut: Unter 70 % gelten meist die besten Bankkonditionen. Ab 80 % steigen die Zinsen spürbar.
- Einordnung: Banken bieten die besten Konditionen unter 60 % LTV (Pfandbrief-Beleihungsgrenze). Ab 80 % steigen die Zinsen deutlich — ca. +1,3 Prozentpunkte.

**Tatsächliche Leerstandsquote**
- Formel: `Leerstandstage seit Erwerb ÷ Eigentumstage seit Erwerb`
- Wozu: Zeigt den Ist-Leerstand seit dem Kauf im Vergleich zur angenommenen Leerstandsquote (Mietausfallwagnis) aus den Objektdaten.
- Wann gut: Unter 3 % ist der Leerstand gering. Über 8 % liegt deutlich über dem, was die meisten Kalkulationen einplanen.
- Einordnung: Nationaler Markt-Leerstand Ende 2024 bei ~2,2 %. In strukturschwachen Regionen reale Leerstandsquoten von 10–15 %+.

Alle 8 KPIs haben aktuell einen sinnvollen Einordnung-Text — die "leer → Abschnitt entfällt"-Logik wird trotzdem so gebaut (nicht hartkodiert immer sichtbar), damit künftige KPIs ohne Marktkontext sauber aussehen.

## 4. Laufende Kosten aufschlüsseln

Betrifft: `CurrentStatusCard.tsx`, "Laufende Kosten"-Zeile.

**Heutiger Zustand:** Ein einzelner Betrag, berechnet als algebraische Umkehrung (`incomeActualMonthly − monthlyMortgage − cashflowBeforeTaxMonthly`) — fragil, siehe Kommentar im Code, da es sich nur deckt, weil `extraordinaryCostsThisMonth` für den aktuellen Monat hartkodiert 0 ist.

**Neu:** Unter der "Laufende Kosten"-Zeile werden die Einzelposten eingerückt mit dünner Trennlinie links aufgelistet (Design: Variante "1 — Indent mit dünner Linie links" aus dem Mockup-Vergleich):

1. Hausgeld (nicht umlagefähig)
2. Instandhaltungsrücklage
3. Hausverwaltung
4. Gebäudeversicherung
5. Sonstige Kosten (nur wenn ≠ 0)
6. Stellplatz-Kosten, falls vorhanden (nur wenn ≠ 0) — Summe aus den Stellplatz-Nebenkosten
7. Vom Eigentümer getragene umlagefähige Kosten (nur während Leerstand, nur wenn ≠ 0)

Die Summe dieser Posten muss exakt der oben stehenden "Laufende Kosten"-Zahl entsprechen. Dafür muss `computePropertySummary` (`lib/data/propertySummary.ts`) bzw. `cashflowCalculator.ts` die Einzelposten des aktuellen Monats als benanntes Array zurückgeben (z. B. `runningCostsBreakdown: { label: string; amountMonthly: number }[]`), statt dass `CurrentStatusCard` sie algebraisch zurückrechnet. Die fragile Umkehrrechnung samt Warn-Kommentar in `CurrentStatusCard.tsx` (Zeilen 21–29) entfällt dadurch.

## Offene Implementierungs-Details (für den Plan)

- Exakte Prop-Signatur von `KpiInfoButton` (welche Objekte/Felder durchgereicht werden)
- Ob `KpiScale` eine gemeinsame Komponente für Zeilen-Variante (klein, ohne Achsen) und Popup-Variante (größer, mit Achsenbeschriftung) ist, oder zwei separate Komponenten mit gemeinsamer Kernlogik
- Genaue Formatierung der "Berechnung"-Strings je KPI (Rundung, Tausendertrennzeichen — bestehende `formatCurrency`/`formatPercent`/`formatNumber` aus `lib/formatters.ts` wiederverwenden)
- Struktur/Name des neuen `runningCostsBreakdown`-Rückgabewerts in `propertySummary.ts`
- Foto-Karussell: genaue Scroll-Snap-Implementierung, IntersectionObserver vs. Scroll-Event für den aktiven Index
