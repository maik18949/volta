# Investment-Rechner — Design Spec

**Datum:** 2026-06-14
**Status:** Approved
**Projekt:** Immobilien Portfolio Manager (Volta)

---

## Kontext

Der Investment-Rechner ist eine eigenständige Sektion in der App, mit der Kaufkandidaten vor dem Erwerb durchgerechnet werden können. Nach dem Kauf kann ein Kandidat direkt ins Portfolio übernommen werden.

Dieser Spec klärt alle offenen Fragen und Gaps aus dem ursprünglichen Datenmodell (Sektion 11 in `immobilien_datenmodell_v2.md`).

---

## Kernentscheidungen

| Thema | Entscheidung |
|---|---|
| Scratchpad vs. Liste | Liste — mehrere Kaufkandidaten speicherbar und einzeln abrufbar |
| Dateneingabe | Progressiv — alle Felder immer sichtbar, KPIs schalten sich still frei |
| Berechnung | On-the-fly via `@Observable` — kein Bestätigen-Button |
| Ausklappbare Sektionen | Nicht verwenden — alle Felder immer offen, kein Klick nötig |
| KPI-Anzeige | Zentrale fixierte KPI-Leiste, immer sichtbar auch beim Scrollen |
| Sensitivitätsanalyse | 5 Parameter individuell per Slider verstellbar, KPIs aktualisieren live |
| Nach Promote | Eintrag bleibt erhalten, als "übernommen" markiert, Link zur Immobilie |
| Direkter Vergleich | Vorerst nicht — mentaler Vergleich reicht, für v2 vorgemerkt |
| `target_rent_confidence` | Nicht implementiert — für v2 im Hinterkopf behalten |
| Namensgebung | Manuelles Pflichtfeld `name` |

---

## 1 — Datenmodell

`InvestmentCalculation` enthält **alle Felder aus `Property`** außer:
- `statusHistory` (keine Realität-Erfassung)
- `extraordinaryCosts` (keine laufende Kostenverfolgung)
- `rentGuarantee` (nicht relevant vor dem Kauf)

### Eigene Felder

| Feld | Typ | Pflicht | Zweck |
|---|---|---|---|
| `name` | String | ✓ | Anzeigename in der Liste (z.B. "ETW Dresden Neustadt") |
| `targetRentMonthly` | Double | — | Angestrebte Kaltmiete — Alias oder Überschreibung von `coldRentMonthly` |
| `promotedPropertyId` | UUID? | — | Verknüpfung zur entstandenen Immobilie nach Promote |
| `isPromoted` | Bool | — | Flag: wurde als Immobilie übernommen |
| `promotedAt` | Date? | — | Zeitpunkt der Übernahme |
| `createdAt` | Date | — | Erstellungszeitpunkt |
| `updatedAt` | Date | — | Letzte Änderung |

### Nicht modelliert

- `target_rent_confidence` — zurückgestellt für v2, kein Recheneffekt in v1

### Berechnete Felder

Alle KPIs sind **keine gespeicherten Felder**. Sie werden immer live vom ViewModel berechnet und nie in SwiftData persistiert.

---

## 2 — KPIs & Pflichtfelder

KPIs schalten sich still frei sobald genügend Daten vorhanden sind. Fehlende KPIs zeigen `—`.

### Freischalt-Stufen

| Stufe | Felder | Freischaltet |
|---|---|---|
| **1 — Sofort** | Name, Kaufpreis, Kaltmiete | Kaufpreisfaktor, Bruttorendite |
| **2 — Finanzierung** | Kreditsumme, Zinssatz, Tilgungsrate | Cashflow vor Steuer, DSCR, Break-Even-Miete, LTV, Cash-on-Cash |
| **3 — Kosten** | Hausgeld (nicht umlagefähig), Verwaltung, Instandhaltung | Nettorendite, genauerer Cashflow |
| **4 — Steuer** | Grenzsteuersatz, Gebäudewert, AfA-Satz | Cashflow nach Steuer |

Stufen 2–4 sind optional. Wer nur Kaufpreis und Miete eingibt, sieht sofort Kaufpreisfaktor und Bruttorendite.

### KPI-Definitionen

| Priorität | KPI | Formel |
|---|---|---|
| 🥇 | **Kaufpreisfaktor** | `purchasePrice / (coldRentMonthly * 12)` |
| 🥇 | **Bruttorendite** | `(coldRentMonthly * 12) / purchasePrice` |
| 🥈 | **Cashflow/Monat vor Steuer** | `effectiveIncome - mortgage - nonRecoverableCosts` |
| 🥈 | **Cashflow/Monat nach Steuer** | `cashflowBeforeTax + taxEffectMonthly` |
| 🥈 | **Nettorendite** | `noi / totalInvestment` |
| 🥉 | **Cash-on-Cash** | `cashflowAfterDebtYearly / equityUsed` |
| ➕ | **Break-Even-Miete** | `nonRecoverableCostsMonthly + monthlyMortgage` |
| ➕ | **DSCR** | `noiYearly / debtServiceAnnual` |
| ➕ | **LTV** | `loanAmount / totalInvestment` |

Formeln folgen denselben Definitionen wie in `immobilien_datenmodell_v2.md` Sektion 10.

### KPI-Anzeige

- Cashflow negativ → rot, positiv → grün
- Jede KPI-Karte zeigt Benchmark-Kontext analog zum bestehenden `KPICardWithContext`-Muster
- Cashflow zeigt vor Steuer als Primärwert, nach Steuer als sekundären Hinweis darunter

---

## 3 — UI-Layout

### Detailansicht

```
┌─ KPI-PANEL (fixiert, scrollt nicht mit) ────────────────────┐
│  Kaufpreisfaktor 24,3×    Bruttorendite    4,1%             │
│  Cashflow/Mon   −87 €     Nettorendite     3,2%             │
│  Cash-on-Cash    3,8%     Break-Even-Miete 780 €            │
│  DSCR            0,82     LTV              81,4%            │
│                  * nach Steuer: +43 €/Mon                   │
├─ EINGABE (scrollbar, alle Sektionen immer offen) ───────────┤
│                                                             │
│  [Kauf]                    [Einnahmen]                      │
│  Name *                    Kaltmiete *                      │
│  Kaufpreis *               Parking-Miete                    │
│  Kaufnebenkosten           Sonstige Einnahmen               │
│  Renovierung               Leerstandsquote                  │
│                                                             │
│  [Finanzierung]            [Kosten]                         │
│  Kreditsumme               Hausgeld (gesamt)                │
│  Zinssatz                  Hausgeld (umlagefähig)           │
│  Tilgungsrate              Verwaltungskosten                │
│  Kreditbeginn              Instandhaltungsrücklage          │
│  Akt. Bankrate (optional)  Grundsteuer                      │
│                                                             │
│  [AfA & Steuer]                                             │
│  Gebäudewert               AfA-Satz                         │
│  Bodenwert                 Grenzsteuersatz                  │
│                                                             │
├─ SENSITIVITÄTSANALYSE ──────────────────────────────────────┤
│  Miete       ────●──────  950 €   (±20%)                   │
│  Zinssatz    ──────●────  4,5%    (±2 Prozentpunkte)       │
│  Kaufpreis   ────●──────  263k €  (±15%)                   │
│  Leerstand   ──●────────  5%      (±10 Prozentpunkte)      │
│  Instandh.   ────●──────  50 €    (±100 €/Mon)             │
│                                                             │
│  → KPI-Panel aktualisiert sich live beim Slider-Bewegen     │
└─────────────────────────────────────────────────────────────┘
```

### Sidebar-Listenansicht (Karten)

```
┌─────────────────────────────────────────────┐
│ ETW Dresden Neustadt         ✓ übernommen   │
│ Dresden · 263.600 €                         │
│ Bruttorendite 4,1%   Kaufpreisfaktor  24×   │
│ Cashflow/Mon −87 €   Nettorendite    3,2%   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Haus Hamburg Eimsbüttel                     │
│ Hamburg · 480.000 €                         │
│ Bruttorendite 3,8%   Kaufpreisfaktor  26×   │
│ Cashflow/Mon  —      Nettorendite      —    │
└─────────────────────────────────────────────┘
```

- `—` wenn Finanzierungsfelder noch nicht ausgefüllt
- `✓ übernommen` Badge wenn `isPromoted = true`
- Sortierung: zuletzt bearbeitet zuerst (`updatedAt` absteigend)

---

## 4 — Sensitivitätsanalyse

### Parameter & Bereiche

| Parameter | Bereich | Schritt |
|---|---|---|
| Kaltmiete | ±20% des Basiswerts | 10 € |
| Zinssatz | ±2 Prozentpunkte | 0,1% |
| Kaufpreis | ±15% des Basiswerts | 1.000 € |
| Leerstandsquote | ±10 Prozentpunkte | 1% |
| Instandhaltungsrücklage | ±100 €/Mon | 5 € |

### Verhalten

- Slider-Positionen sind **nicht persistent** — beim Schließen der Ansicht zurückgesetzt
- Nur die Basisdaten werden in SwiftData gespeichert
- Der KPI-Panel zeigt immer die Sensitivitäts-adjustierten Werte wenn Slider von Mitte abweichen
- Visueller Hinweis wenn Sensitivität aktiv ist (z.B. kleines Icon im KPI-Panel)

---

## 5 — Promote-Flow

```
[Button: "Als Immobilie übernehmen"]
         ↓
Confirmation Sheet:
"Kaufkandidat wird als neue Immobilie ins Portfolio aufgenommen.
 Dieser Eintrag bleibt als Referenz erhalten."
         ↓
→ Neues Property-Objekt mit allen Feldern aus InvestmentCalculation
→ statusHistory startet leer (normaler Onboarding-Flow greift)
→ InvestmentCalculation.isPromoted = true
→ InvestmentCalculation.promotedPropertyId = neue Property.id
→ InvestmentCalculation.promotedAt = Date()
→ Badge "✓ übernommen" erscheint in Listenansicht
→ Link "→ Zur Immobilie" im KPI-Panel sichtbar
```

Der Investment-Rechner-Eintrag wird **nicht gelöscht**. Er dient als Referenz für den Prognose-vs-Realität-Vergleich (zukünftiges Feature).

---

## 6 — ViewModel-Struktur

```swift
@Observable
class InvestmentCalculatorViewModel {
    var calculation: InvestmentCalculation

    // Live-berechnete KPIs (nie in SwiftData gespeichert)
    var kaufpreisfaktor: Double?
    var bruttorendite: Double?
    var nettorendite: Double?
    var cashflowBeforeTax: Double?
    var cashflowAfterTax: Double?
    var cashOnCash: Double?
    var breakEvenRent: Double?
    var dscr: Double?
    var ltv: Double?

    // Sensitivitäts-Overrides (temporär, nicht persistent)
    var sensitivityRentDelta: Double = 0         // z.B. −0.1 = −10%
    var sensitivityInterestDelta: Double = 0     // z.B. +0.01 = +1%
    var sensitivityPriceDelta: Double = 0
    var sensitivityVacancyDelta: Double = 0
    var sensitivityMaintenanceDelta: Double = 0  // absolut in €/Mon
}
```

KPI-Berechnung delegiert an `KPICalculator` (bestehende Calculations-Schicht) — kein doppelter Code.

---

## 7 — Dateistruktur (neu)

```
Models/
  InvestmentCalculation.swift       # SwiftData Model (erweitert bestehenden Stub)

ViewModels/
  InvestmentCalculatorViewModel.swift  # @Observable, KPI-Berechnungen, Sensitivität

Views/InvestmentCalculator/
  InvestmentCalculatorListView.swift   # Sidebar-Liste aller Kaufkandidaten
  InvestmentCalculatorDetailView.swift # Fixierter KPI-Panel + scrollbare Eingabe
  InvestmentKPIPanel.swift             # Fixierter KPI-Bereich (eigene View)
  InvestmentInputSections.swift        # Scrollbare Eingabefelder (alle Sektionen)
  InvestmentSensitivityView.swift      # Slider-Bereich
  InvestmentPromoteSheet.swift         # Confirmation Sheet für Promote
```

---

## 8 — Abgrenzung & v2-Kandidaten

| Thema | v1 | v2 |
|---|---|---|
| `target_rent_confidence` | Nicht implementiert | Warnsymbol + Sensitivitäts-Preset |
| Direkter Objektvergleich | Nicht implementiert | Side-by-side zweier Kandidaten |
| Prognose vs. Realität nach Promote | Nicht implementiert | Verknüpfte Ansicht in Property |
| Sensitivitäts-Presets speichern | Nicht implementiert | Optional speicherbare Szenarien |
| Notizen | Im Modell vorhanden (`notes`), UI optional | — |
