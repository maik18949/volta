# Cashflow & Steuerberechnung — Design Spec
**Datum:** 2026-06-16  
**Status:** Zur Implementierung freigegeben

---

## Kontext & Problemstellung

Die bisherige Steuer- und Cashflow-Berechnung enthält mehrere grundlegende Fehler:

1. **Instandhaltungsrücklage** wird fälschlicherweise steuerlich abgesetzt (sie ist im Cashflow korrekt, aber nicht sofort steuerlich absetzbar)
2. **Divisor immer 12** — im Erwerbsjahr müssen nur die tatsächlichen Eigentumsmonate gezählt werden
3. **Prognose-Einnahmen statt Ist** — `effectiveGrossIncomeYearly` (mit Leerstandsquote) wird für die Ist-Berechnung verwendet
4. **Status-abhängige Kosten fehlen im Steuerabzug** — umlagefähige Kosten und Grundsteuer Wohnung sind nur bei Leerstand/Mietgarantie absetzbar, bei Vermietung nicht
5. **Kein WE/Stellplatz-Split** — Stellplatz-Kosten werden fälschlicherweise auf 0 gesetzt wenn vermietet, obwohl der Eigentümer sie immer trägt
6. **Zinsen vor Besitzübergang** werden nicht berücksichtigt (sind als vorweggenommene Werbungskosten absetzbar)
7. **Zinsjahr-Grenze** nicht gecheckt — Darlehensmonate aus Vorjahren dürfen nicht in das aktuelle Steuerjahr einfließen
8. **Zinsen nicht amortisierend** — fixer Monatsbetrag statt exakter Zinsanteil je Monat laut Tilgungsplan

---

## Einnahmenlogik je Status

| Status | Einnahme kommt von |
|--------|-------------------|
| Vermietet | `coldRentMonthly + parkingRentMonthly` aus Einstellungen (automatisch) |
| Leerstand + Mietgarantie | Betrag aus `StatusEntry.incomeActualMonthly` (manuell beim Anlegen des Eintrags) |
| Leerstand | 0 (automatisch) |
| Eigennutzung | 0 (automatisch) |
| Renovierung | 0 (automatisch) |

`StatusEntry.incomeActualMonthly` wird nur für Mietgarantie-Einträge genutzt und nur dann im UI angezeigt. Bei allen anderen Status wird das Feld ignoriert.

---

## Grundregeln (steuerrechtlich verifiziert)

### Status-Logik: Wer trägt welche Kosten?

| Kostenart | Vermietet | Leerstand / Mietgarantie / Eigennutzung / Renovierung |
|-----------|-----------|------------------------------------------------------|
| Umlagefähige Kosten Wohnung | Mieter zahlt → 0 für Eigentümer | Eigentümer trägt → absetzbar |
| Grundsteuer Wohnung | Mieter zahlt via NK-Abrechnung → 0 | Eigentümer zahlt direkt → absetzbar |
| Umlagefähige Kosten Stellplatz | **Eigentümer trägt immer** | **Eigentümer trägt immer** |
| Grundsteuer Stellplatz | **Eigentümer trägt immer** | **Eigentümer trägt immer** |
| Nicht umlagefähige Kosten (W+S) | Eigentümer trägt immer | Eigentümer trägt immer |
| Instandhaltungsrücklage (W+S) | Cashflow-Abfluss, **nicht steuerlich** | Cashflow-Abfluss, **nicht steuerlich** |
| Hausverwaltung | Immer absetzbar | Immer absetzbar |

### Zeitliche Abgrenzung im Steuerjahr Y

| Posten | Zeitraum |
|--------|---------|
| Zinsen | `max(loanStartDate, 1. Jan Y)` bis `31. Dez Y`, amortisierend je Monat |
| AfA | Erwerbsjahr: anteilig ab `economicTransferDate`; Folgejahre: voll |
| Einnahmen | Ab `economicTransferDate` in Jahr Y |
| Alle anderen Kosten | Ab `economicTransferDate` in Jahr Y |

**Zinsen vor Besitzübergang** sind als vorweggenommene Werbungskosten absetzbar (§9 EStG, BFH-Rechtsprechung), solange das Darlehen nachweislich für den Erwerb verwendet wurde.

**Zinsberechnung (amortisierend):** Für jeden Monat in Jahr Y wird der genaue Zinsanteil aus dem Tilgungsplan berechnet: `restschuld_zum_monatsbeginn × jahreszinssatz / 12`. Die Restschuld wird Monat für Monat akkumuliert basierend auf Darlehensbeginn, Zinssatz und monatlicher Rate. Diese Berechnung nutzt den bereits vorhandenen `AmortizationCalculator`.

---

## "Laufendes Jahr" — Hybrid-Berechnung

Das laufende Jahr kombiniert tatsächliche Daten mit einer Projektion:

| Zeitraum | Datenbasis |
|----------|-----------|
| Vergangene Monate (abgeschlossen) | Vollständig Ist aus Statushistorie |
| Aktueller Monat: 1. bis heute (inkl.) | Ist aus Statushistorie |
| Aktueller Monat: morgen bis Monatsende | Projektion mit aktuellem Status |
| Zukünftige Monate im laufenden Jahr | Vollständig projiziert mit aktuellem Status |

**Projektion:** Der letzte bekannte Status (letzter StatusEntry) wird für alle zukünftigen Tage/Monate fortgeschrieben. Einnahmen für projizierte Vermietet-Tage = `coldRentMonthly + parkingRentMonthly` (tagesanteilig).

---

## Tagesgenaue Proration

Gilt für **alle** Berechnungen: Einnahmen, steuerliche Abzüge und Cashflow-Kosten.

Wenn zwei StatusEntries in denselben Monat fallen (z.B. Mietgarantie bis 15. Juni, Vermietet ab 16. Juni):

```
Für jeden Status-Abschnitt im Monat:
  tagesanteil = anzahlTageInDiesemAbschnitt / gesamtTageImMonat
  einnahme  += statusEinnahme × tagesanteil
  abzüge    += statusAbhängigeKosten × tagesanteil
```

Beispiel Juni (30 Tage), Mietgarantie 1.-15., Vermietet 16.-30.:
```
Einnahmen:
  Mietgarantie (15 Tage): 999 × 15/30 = 499,50 €
  Vermietet    (15 Tage): 959 × 15/30 = 479,50 €
  Gesamt:                               979,00 €

Umlagefähige Kosten Wohnung (steuerlich):
  Mietgarantie (15 Tage): 225,60 × 15/30 = 112,80 € (absetzbar)
  Vermietet    (15 Tage): 225,60 × 15/30 =   0,00 € (Mieter zahlt)
  Gesamt absetzbar:                          112,80 €
```

---

## Datenmodell — Änderungen an `Property`

### Neue Felder

```swift
// Kaufpreis
var hasParking: Bool = false                                    // NEU: Trigger für alle Stellplatz-Felder

// Hausgeld Wohnung — optionale Aufteilung
var isHoaUnitSplit: Bool = false                               // NEU
var hoaFeeMaintenanceReserveUnitMonthly: Double = 0.0         // NEU: Rücklage innerhalb Hausgeld Wohnung

// Hausgeld Stellplatz — nur relevant wenn hasParking = true
var hoaFeeParkingTotalMonthly: Double = 0.0                   // NEU
var isHoaParkingSplit: Bool = false                            // NEU
var hoaFeeParkingRecoverableMonthly: Double = 0.0             // NEU: umlagefähig Stellplatz
var hoaFeeParkingMaintenanceReserveMonthly: Double = 0.0      // NEU: Rücklage Stellplatz

// Grundsteuer Stellplatz
var parkingPropertyTaxAnnual: Double = 0.0                    // NEU
```

### Abgeleitete Werte (nicht gespeichert)

```swift
// Wohnung
hoaFeeNonRecoverableUnitMonthly = hoaFeeTotalMonthly - hoaFeeRecoverableMonthly - hoaFeeMaintenanceReserveUnitMonthly

// Stellplatz
hoaFeeParkingNonRecoverableMonthly = hoaFeeParkingTotalMonthly - hoaFeeParkingRecoverableMonthly - hoaFeeParkingMaintenanceReserveMonthly
```

### Bestehende Felder — Semantikänderung

| Feld | Bisher | Neu |
|------|--------|-----|
| `purchasePriceParking` | optional | nur befüllt wenn `hasParking = true` |
| `propertyTaxAnnual` | WE+TE kombiniert | nur Wohnung (Grundsteuer Wohnung) |
| `hoaFeeTotalMonthly` | Hausgeld gesamt | Hausgeld Wohnung gesamt |
| `hoaFeeRecoverableMonthly` | umlagefähig gesamt | umlagefähig Wohnung |
| `maintenanceReserveMonthly` | zusätzliche Rücklage | bleibt: externe Rücklage außerhalb WEG (z.B. Einfamilienhaus) |

### Migration

Alle neuen Felder haben `= 0` / `= false` als SwiftData-Default. Bestehende Daten bleiben intakt.

**Auto-Migration:** `purchasePriceParking > 0` → `hasParking = true` automatisch.

**Manuelle Nacharbeit durch Nutzer:**
- `propertyTaxAnnual` auf Wohnung-Anteil korrigieren (war WE+TE kombiniert)
- `parkingPropertyTaxAnnual` nachtragen wenn Stellplatz vorhanden
- Hausgeld-Aufteilung ergänzen wenn gewünscht

---

## Berechnungslogik

### Hilfsfunktionen

```
// Monate in Jahr Y nach economicTransferDate
ownershipMonths(in year: Int, economicTransferDate: Date) -> [Month]

// Zinsanteil für einen bestimmten Monat (amortisierend)
interestForMonth(_ month: Date, loanStartDate: Date, loanAmount: Double,
                 interestRate: Double, monthlyPayment: Double) -> Double

// Ist der Monat abgeschlossen (inkl. heutiger Tag als letzter Ist-Tag)?
isPastOrCurrentMonth(_ month: Date) -> Bool  // true wenn Monat <= laufender Monat

// Tage eines Status-Abschnitts innerhalb eines Monats
daysInMonth(_ month: Date, from: Date, to: Date) -> Int
```

### Monatseinnahme (tagesgenau, Ist + Projektion)

```
func incomeForMonth(_ month: Date, statusHistory: [StatusEntry],
                    coldRentMonthly: Double, parkingRentMonthly: Double) -> Double:
  abschnitte = statusAbschnitte(für: month, aus: statusHistory)
  // Für Tage nach heute im laufenden Monat: letzter bekannter Status
  gesamt = 0
  für jeden abschnitt (von: start, bis: end, status: s):
    tagesanteil = tage(start, end) / tageImMonat(month)
    einnahme = einnahmeProMonat(status: s, coldRent, parkingRent)
    gesamt += einnahme × tagesanteil
  return gesamt
```

### TaxCalculator — `annualTaxableIncome`

```
Inputs:
  - year: Int
  - statusHistory: [StatusEntry]
  - economicTransferDate: Date
  - loanStartDate: Date, loanAmount: Double, interestRate: Double, monthlyPayment: Double
  - afaBasis: Double, depreciationRate: Double
  - hoaUnitNonRecoverableMonthly: Double      (abgeleitet: total - recoverable - reserve)
  - hoaUnitRecoverableMonthly: Double
  - hoaUnitSplitComplete: Bool
  - hoaParkingNonRecoverableMonthly: Double   (abgeleitet, 0 wenn kein Stellplatz)
  - hoaParkingRecoverableMonthly: Double
  - propertyTaxUnitMonthly: Double
  - propertyTaxParkingMonthly: Double
  - propertyManagementMonthly: Double
  - otherCostsMonthly: Double
  - coldRentMonthly: Double
  - parkingRentMonthly: Double

Berechnung:
  1. eigentumsMonateImJahr = ownershipMonths(year, economicTransferDate)
  
  2. zinsenJahr = Σ interestForMonth(m, loanStartDate, ...) 
                 für alle Monate m in Jahr Y 
                 ab max(loanStartDate, 1. Jan Y)
  
  3. afaJahr = isAcquisitionYear(year)
               ? afaBasis × depreciationRate / 12 × eigentumsMonateAnzahl
               : afaBasis × depreciationRate
  
  4. Für jeden Eigentumsmonat (tagesgenau):
     - einnahmen += incomeForMonth(m, ...)
     - leerstandTageAnteil += (leerstandTage im Monat / tageImMonat)
     - vermietungsTageAnteil += (vermietungsTage im Monat / tageImMonat)
  
  5. Abzüge (in Monatseinheiten, tagesgenau):
     immer (× eigentumsMonateAnzahl):
       - hoaUnitNonRecoverableMonthly
       - hoaParkingNonRecoverableMonthly
       - propertyManagementMonthly
       - propertyTaxParkingMonthly
       - otherCostsMonthly
     nur Leerstand-Anteil (× leerstandTageAnteil):
       - hoaUnitRecoverableMonthly
       - propertyTaxUnitMonthly
  
  6. return einnahmen - zinsenJahr - afaJahr - summeAbzüge
```

### TaxCalculator — Steuereffekt

```
taxEffectYearly  = max(0, -annualTaxableIncome) × marginalTaxRate
taxEffectMonthly = taxEffectYearly ÷ eigentumsMonateAnzahlImJahr
```

### CashflowCalculator — `ownerBorneRecoverableCosts` (überarbeitet)

```
Inputs:
  - status: PropertyStatus
  - hoaUnitRecoverableMonthly: Double
  - hoaParkingRecoverableMonthly: Double   (immer abziehen)
  - propertyTaxUnitMonthly: Double
  - propertyTaxParkingMonthly: Double      (immer abziehen)

Logik:
  unitPart    = (status == .vermietet) ? 0 : hoaUnitRecoverable + propertyTaxUnit
  parkingPart = hoaParkingRecoverable + propertyTaxParking
  return unitPart + parkingPart
```

### CashflowCalculator — `cashflowBeforeTax` (monatlich, tagesgenau)

```
+ incomeForMonth(...)                          (tagesgenau, Ist + Projektion)
- monthlyMortgage                              (Zinsen + Tilgung)
- hoaUnitNonRecoverableMonthly                 (inkl. Rücklage — echter Abfluss)
- hoaParkingNonRecoverableMonthly              (immer, tagesanteilig wenn mid-month)
- ownerBorneRecoverableCosts(...)              (status-abhängig, tagesanteilig)
- propertyManagementMonthly
- maintenanceReserveMonthly                    (externe Rücklage falls vorhanden)
- extraordinaryCosts
```

---

## UI-Änderungen

### Wizard — Schritt "Kauf"

```
Kaufpreis *: [___]
☑ Stellplatz vorhanden
  ↳ Kaufpreis Wohnung *:    [___]
    Kaufpreis Stellplatz *: [___]
    Gesamtkaufpreis:        [automatisch = Wohnung + Stellplatz, readonly]
```

Wenn kein Stellplatz: nur ein Kaufpreisfeld.

### Wizard / Settings — Schritt "Kosten"

```
HAUSGELD WOHNUNG
  Hausgeld gesamt/Monat *: [___]
  [▶ Aufteilen]  (Toggle)
    davon umlagefähig/Monat:          [___]
    davon Instandhaltungsrücklage/Monat: [___]
    davon nicht umlagefähig/Monat:    [readonly = gesamt - umlagefähig - rücklage]
  ⚠ Validierung: umlagefähig + rücklage darf nicht > gesamt sein
  ⚠ "Hausgeld aufteilen für genaue steuerliche Berechnung" (wenn nicht aufgeteilt)

HAUSGELD STELLPLATZ  (nur wenn hasParking)
  [gleiche Struktur wie Wohnung]

GRUNDSTEUER
  Grundsteuer Wohnung/Jahr *:    [___]
  Grundsteuer Stellplatz/Jahr:   [___]  (nur wenn hasParking)

Hausverwaltung/Jahr:                [___]
Instandhaltungsrücklage/Monat (zusätzl., außerhalb WEG): [___]
Sonstige Kosten/Monat:              [___]
```

### StatusEntry-Sheet

Das Feld `Einnahme/Monat` wird nur angezeigt wenn Status = **Leerstand + Mietgarantie**. Bei allen anderen Status entfällt die Eingabe.

### Steuer-Tab

```
IST — Laufendes Jahr YYYY
  (Jan–[letzter-abg.-Monat] tatsächlich · [akt. Monat] anteilig · Rest projiziert)

  Einnahmen                              [X.XXX €]
  − Zinsen (amortisierend, ab Darlehensstart)
  − AfA (anteilig / voll)
  − Nicht umlagefähige Kosten Wohnung
  − Nicht umlagefähige Kosten Stellplatz
  − Umlagefähige Kosten Wohnung          (X,X Monate Leerstand von Y)
  − Grundsteuer Wohnung                  (X,X Monate Leerstand von Y)
  − Umlagefähige Kosten Stellplatz
  − Grundsteuer Stellplatz
  − Hausverwaltung
  ─────────────────────────────────────
  = Steuerliches Ergebnis
  × Grenzsteuersatz
  = Steuererstattung Jahr
  ÷ Eigentumsmonate
  = Steuereffekt ∅ monatlich

  ⚠ "Für genaue Berechnung Hausgeld aufteilen" (falls unvollständig)

SOLL — Prognose
  Jahr: [Picker, Standard = nächstes Kalenderjahr, in-memory]
  [Zurücksetzen auf Einstellungswerte]

  Kaltmiete/Monat:    [Regler, Default = Einstellung]
  Parkingmiete/Monat: [Regler, Default = Einstellung]
  Hausgeld gesamt:    [Regler, Default = Einstellung]

  Einnahmen (Vollvermietung, 12 Monate)
  − Zinsen (amortisierend für gewähltes Jahr)
  − AfA
  − Nicht umlagefähige Kosten
  − Umlagefähige Kosten Stellplatz
  − Grundsteuer Stellplatz
  − Hausverwaltung
  ─────────────────────────────────────
  = Steuerliches Ergebnis (Prognose)
  × Grenzsteuersatz
  = Steuererstattung (Prognose)
  ÷ 12
  = Steuereffekt ∅ monatlich (Prognose)
```

### Cashflow-Tab

Tabellenstruktur unverändert. `afterTax` verwendet den Ist-Steuereffekt des laufenden Jahres (jährlicher Durchschnitt ÷ Eigentumsmonate). Kein Per-Monat-Status-Splitting.

---

## Warnung-Logik

| Zustand | Anzeige |
|---------|---------|
| `isHoaUnitSplit = false` | ⚠ Hausgeld Wohnung aufteilen für genaue steuerliche Berechnung |
| `isHoaUnitSplit = true`, Felder unvollständig | ⚠ Aufteilung Wohnung unvollständig |
| `hasParking && !isHoaParkingSplit` | ⚠ Hausgeld Stellplatz aufteilen für genaue steuerliche Berechnung |
| `hasParking && isHoaParkingSplit`, unvollständig | ⚠ Aufteilung Stellplatz unvollständig |
| Jede aktive Warnung | Steuer-Tab: "Für genaue Ist-Berechnung Hausgeld aufteilen (Einstellungen)" |

**Validierung Hausgeld-Aufteilung:** `umlagefähig + rücklage ≤ gesamt` — Fehler wenn überschritten, Speichern blockiert.

**Fallback bei fehlender Aufteilung:**
- Nicht umlagefähig Wohnung = `hoaFeeTotalMonthly - hoaFeeRecoverableMonthly` (enthält Rücklage → leichte Steuerüberoptimierung)
- Stellplatz-Kosten = 0 wenn `!isHoaParkingSplit`

---

## Tests

Bestehende Tests werden aktualisiert. Neue Tests:

**Steuerberechnung:**
- `test_annualTaxableIncome_acquisitionYear_prorated`
- `test_annualTaxableIncome_fullYear_noProration`
- `test_annualTaxableIncome_mixedStatus_leerstandAndVermietet`
- `test_annualTaxableIncome_loanStartedPriorYear_correctInterestMonths`
- `test_taxEffectMonthly_divisorIsOwnershipMonths`

**Zinsen:**
- `test_interestForMonth_amortizing_correctDecline`
- `test_interestForMonth_loanStartedPriorYear`
- `test_interestForMonth_loanStartedCurrentYear`

**Tagesproration:**
- `test_incomeForMonth_midMonthStatusChange`
- `test_costs_midMonthProration_leerstandToVermietet`
- `test_ownerBorneRecoverable_vermietet_parkingAlwaysIncluded`
- `test_ownerBorneRecoverable_leerstand_unitAndParkingIncluded`

**Hybrid-Berechnung:**
- `test_currentMonthSplit_pastDaysActual_futureDaysProjected`

---

## Nicht im Scope

- Eigennutzung steuerlich (kein V+V-Einkommen, eigene Regeln)
- Immobilienverkauf mid-year
- Mehrere Stellplätze
