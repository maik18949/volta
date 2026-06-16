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
5. **Kein WE/Stellplatz-Split** — TE-Kosten (umlagefähig Stellplatz, Grundsteuer Stellplatz) werden fälschlicherweise auf 0 gesetzt wenn vermietet, obwohl der Eigentümer sie immer trägt
6. **Zinsen vor Besitzübergang** werden nicht berücksichtigt (sind als vorweggenommene Werbungskosten absetzbar)
7. **Zinsjahr-Grenze** nicht gecheckt — Darlehensmonate aus Vorjahren dürfen nicht in das aktuelle Steuerjahr einfließen

---

## Grundregeln (aus Excel abgeleitet und steuerrechtlich verifiziert)

### Status-Logik: Wer trägt welche Kosten?

| Kostenart | Vermietet | Leerstand / Mietgarantie |
|-----------|-----------|--------------------------|
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
| Zinsen | `max(loanStartDate, 1. Jan Y)` bis `31. Dez Y` |
| AfA | Erwerbsjahr: anteilig ab `economicTransferDate`; Folgejahre: voll |
| Einnahmen | Ab `economicTransferDate` in Jahr Y |
| Alle anderen Kosten | Ab `economicTransferDate` in Jahr Y |

**Zinsen vor Besitzübergang** sind als vorweggenommene Werbungskosten absetzbar (§9 EStG, BFH-Rechtsprechung), solange das Darlehen nachweislich für den Erwerb verwendet wurde.

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

### Bestehende Felder — Semantikänderung

| Feld | Bisher | Neu |
|------|--------|-----|
| `purchasePriceParking` | optional | nur befüllt wenn `hasParking = true` |
| `propertyTaxAnnual` | WE+TE kombiniert | nur Wohnung (Grundsteuer Wohnung) |
| `hoaFeeTotalMonthly` | Hausgeld gesamt | Hausgeld Wohnung gesamt |
| `hoaFeeRecoverableMonthly` | umlagefähig gesamt | umlagefähig Wohnung |
| `maintenanceReserveMonthly` | zusätzliche Rücklage | bleibt: externe Rücklage (z.B. Einfamilienhaus ohne WEG) |

### Migration

Alle neuen Felder haben `= 0` / `= false` als SwiftData-Default. Bestehende Daten bleiben intakt.

**Auto-Migration:** Wenn `purchasePriceParking > 0` in bestehenden Daten → `hasParking = true` wird automatisch gesetzt.

**Manuelle Nacharbeit durch Nutzer:**
- `propertyTaxAnnual` auf Wohnung-Anteil korrigieren (war WE+TE kombiniert)
- `parkingPropertyTaxAnnual` nachtragen wenn Stellplatz vorhanden
- Hausgeld-Aufteilung (umlagefähig, Rücklage) ergänzen wenn gewünscht

---

## Berechnungslogik

### Hilfsfunktionen (neue Datumserweiterungen)

```
ownershipMonths(in year: Int, economicTransferDate: Date) -> Int
  → Anzahl Monate in Jahr Y ab economicTransferDate

interestMonths(in year: Int, loanStartDate: Date) -> Int
  → Anzahl Monate in Jahr Y ab max(loanStartDate, 1. Jan Y)

isAcquisitionYear(_ year: Int, economicTransferDate: Date) -> Bool
  → year == Calendar.year(of: economicTransferDate)
```

### TaxCalculator — neue Methode `annualTaxableIncome`

```
Inputs:
  - year: Int
  - statusHistory: [StatusEntry]
  - economicTransferDate: Date
  - loanStartDate: Date
  - monthlyInterest: Double
  - afaBasis: Double, depreciationRate: Double
  - hoaUnitNonRecoverableMonthly: Double      (= hoaTotal - hoaRecoverable - hoaRücklage, wenn split)
  - hoaUnitRecoverableMonthly: Double         (umlagefähig Wohnung)
  - hoaUnitSplitComplete: Bool                (ob Aufteilung vollständig)
  - hoaParkingNonRecoverableMonthly: Double
  - hoaParkingRecoverableMonthly: Double
  - propertyTaxUnitMonthly: Double            (Grundsteuer Wohnung / 12)
  - propertyTaxParkingMonthly: Double         (Grundsteuer Stellplatz / 12)
  - propertyManagementMonthly: Double
  - otherCostsMonthly: Double

Berechnung:
  1. eigentumsMonateImJahr = ownershipMonths(year, economicTransferDate)
  2. zinsMonate = interestMonths(year, loanStartDate)
  3. zinsenJahr = monthlyInterest × zinsMonate
  4. afaJahr = isAcquisitionYear(year) 
               ? depreciationMonthly × eigentumsMonateImJahr
               : afaBasis × depreciationRate
  5. Für jeden Eigentumsmonat:
       status = activeStatus(for: month)
       einnahmen += status.incomeActualMonthly
       if status != .vermietet: leerstandMonate += 1
  6. Abzüge:
     immer (× eigentumsMonateImJahr):
       - hoaUnitNonRecoverableMonthly
       - hoaParkingNonRecoverableMonthly
       - propertyManagementMonthly
       - propertyTaxParkingMonthly
       - otherCostsMonthly
     nur Leerstandsmonate (× leerstandMonate):
       - hoaUnitRecoverableMonthly
       - propertyTaxUnitMonthly
     nie:
       - Instandhaltungsrücklage
       - Tilgung
  7. return einnahmen - zinsenJahr - afaJahr - summeAbzüge
```

### TaxCalculator — Steuereffekt

```
taxEffectYearly = |annualTaxableIncome| × marginalTaxRate  (wenn negativ)
taxEffectMonthly = taxEffectYearly ÷ eigentumsMonateImJahr
```

### CashflowCalculator — `ownerBorneRecoverableCosts` (überarbeitet)

```
Inputs:
  - status: PropertyStatus
  - hoaUnitRecoverableMonthly: Double
  - hoaParkingRecoverableMonthly: Double      ← NEU, immer abziehen
  - propertyTaxUnitMonthly: Double
  - propertyTaxParkingMonthly: Double         ← NEU, immer abziehen

Logik:
  unitPart    = (status == .vermietet) ? 0 : hoaUnitRecoverable + propertyTaxUnit
  parkingPart = hoaParkingRecoverable + propertyTaxParking   ← immer
  return unitPart + parkingPart
```

### CashflowCalculator — `cashflowBeforeTax`

```
+ incomeActualMonthly
- monthlyMortgage                              (Zinsen + Tilgung, echter Abfluss)
- hoaUnitNonRecoverableMonthly                 (inkl. Rücklage — echter Abfluss)
- hoaParkingNonRecoverableMonthly              (immer)
- ownerBorneRecoverableCosts(...)              (status-abhängig)
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
  ↳ Kaufpreis Wohnung *: [___]
    Kaufpreis Stellplatz *: [___]
    Gesamtkaufpreis: [automatisch = Wohnung + Stellplatz]
```

Wenn kein Stellplatz: nur ein Kaufpreisfeld, kein Gesamtkaufpreis nötig.

### Wizard / Settings — Schritt "Kosten"

```
HAUSGELD WOHNUNG
  Hausgeld gesamt/Monat *: [___]
  [Aufteilen ▼]
    davon umlagefähig/Monat: [___]
    davon nicht umlagefähig/Monat: [___]  ← readonly: gesamt - umlagefähig - rücklage
    davon Instandhaltungsrücklage/Monat: [___]
  ⚠ Aufteilung unvollständig — Steuerberechnung ungenau  (wenn nicht vollständig)

HAUSGELD STELLPLATZ  (nur wenn hasParking)
  [gleiche Struktur wie Wohnung]

GRUNDSTEUER
  Grundsteuer Wohnung/Jahr *: [___]
  Grundsteuer Stellplatz/Jahr: [___]  (nur wenn hasParking)

Hausverwaltung/Jahr: [___]
Instandhaltungsrücklage/Monat (zusätzl.): [___]
Sonstige Kosten/Monat: [___]
```

### Steuer-Tab

```
IST — Laufendes Jahr YYYY
  Einnahmen (tatsächlich, aus Statushistorie)
  − Zinsen (ab Darlehensstart in YYYY)
  − AfA (anteilig ab Besitzübergang / voll in Folgejahren)
  − Nicht umlagefähige Kosten Wohnung
  − Nicht umlagefähige Kosten Stellplatz
  − Umlagefähige Kosten Wohnung (nur Leerstandsmonate: X von Y)
  − Grundsteuer Wohnung (nur Leerstandsmonate)
  − Umlagefähige Kosten Stellplatz
  − Grundsteuer Stellplatz
  − Hausverwaltung
  = Steuerliches Ergebnis
  × Grenzsteuersatz
  = Steuererstattung Jahr
  ÷ Eigentumsmonate
  = Steuereffekt ∅ monatlich

  ⚠ Hausgeld aufteilen für genaue Berechnung  (falls unvollständig)

SOLL — Prognose (Vollvermietung)
  [bestehender Block, unverändert]
```

### Cashflow-Tab

Tabellenstruktur unverändert. `afterTax` pro Monat verwendet jetzt den Ist-Steuereffekt (jährlicher Durchschnitt ÷ Eigentumsmonate). Kein Per-Monat-Status-Splitting des Steuereffekts.

---

## Warnung-Logik

| Zustand | Anzeige |
|---------|---------|
| `isHoaUnitSplit = false` | ⚠ Wohnung: Hausgeld aufteilen für genaue steuerliche Berechnung |
| `isHoaUnitSplit = true` aber Felder unvollständig (recoverable=0 oder rücklage=0) | ⚠ Wohnung: Aufteilung unvollständig |
| `hasParking && !isHoaParkingSplit` | ⚠ Stellplatz: Hausgeld aufteilen für genaue steuerliche Berechnung |
| `hasParking && isHoaParkingSplit` aber Felder unvollständig | ⚠ Stellplatz: Aufteilung unvollständig |
| Jede aktive Warnung | Steuer-Tab zeigt: "Für genaue Ist-Berechnung Hausgeld aufteilen (Einstellungen)" |

**Fallback-Berechnung bei fehlender Aufteilung:**
- Nicht umlagefähig Wohnung = `hoaFeeTotalMonthly - hoaFeeRecoverableMonthly` (enthält Rücklage → leichte Steuerüberoptimierung)
- Umlagefähig Wohnung = `hoaFeeRecoverableMonthly` (falls > 0, sonst 0)
- Stellplatz-Kosten = 0 wenn keine Aufteilung

---

## Tests

Bestehende Tests werden aktualisiert auf neue Signatur. Neue Tests:

- `test_annualTaxableIncome_acquisitionYear_prorated`
- `test_annualTaxableIncome_fullYear_noProration`
- `test_annualTaxableIncome_mixedStatus_leerstandAndVermietet`
- `test_interestMonths_loanStartedPriorYear`
- `test_interestMonths_loanStartedCurrentYear`
- `test_ownerBorneRecoverable_vermietet_parkingAlwaysIncluded`
- `test_ownerBorneRecoverable_leerstand_unitAndParkingIncluded`
- `test_taxEffectMonthly_divisorIsOwnershipMonths`

---

## Einnahmenlogik je Status

| Status | Einnahme kommt von |
|--------|-------------------|
| Vermietet | `coldRentMonthly + parkingRentMonthly` aus Einstellungen (automatisch) |
| Leerstand + Mietgarantie | Betrag aus `StatusEntry.incomeActualMonthly` (manuell beim Anlegen) |
| Leerstand | 0 (automatisch) |
| Eigennutzung | 0 (automatisch) |
| Renovierung | 0 (automatisch) |

`StatusEntry.incomeActualMonthly` wird nur noch für Mietgarantie-Einträge genutzt. Bei allen anderen Status wird das Feld ignoriert und die Einnahme automatisch abgeleitet.

---

## Mid-Month Status-Wechsel (Tagesgenau)

Wenn zwei StatusEntries in denselben Monat fallen (z.B. Mietgarantie bis 15. Juni, Vermietet ab 16. Juni), wird die Einnahme **tagesgenau anteilig** berechnet:

```
Für jeden StatusEntry-Abschnitt im Monat:
  anteil = anzahlTageInDiesemAbschnitt / gesamtTageImMonat
  einnahme += statusEinnahme × anteil
```

Beispiel Juni (30 Tage):
```
Mietgarantie 1.-15. (15 Tage): 999 × 15/30 = 499,50 €
Vermietet   16.-30. (15 Tage): 999 × 15/30 = 479,50 €  (959 Kaltmiete × 15/30)
Gesamt Juni:                                  979,00 €
```

Diese Logik gilt auch für die Kostenberechnung (umlagefähige Kosten, Grundsteuer) und die Steuerberechnung (Leerstandstage vs. Vermietungstage).

---

## Prognose-Parametrisierung

- **Basis**: aktuelle Einstellungswerte der Immobilie (Kaltmiete, Hausgeld, Kosten, Zinsen etc.)
- **Anpassung**: Regler / Eingabefelder direkt in der Prognose-Ansicht (nicht in den Einstellungen)
- **Speicherung**: In-Memory — Änderungen bleiben in der App-Session erhalten aber werden **nicht** in die Datenbank geschrieben
- **Zurücksetzen**: Button "Zurücksetzen" stellt alle Prognose-Parameter auf die aktuellen Einstellungswerte zurück
- **Anpassbare Parameter**: mindestens Kaltmiete, Parkingmiete, Hausgeld (erweiterbar)

---

## Nicht im Scope

- Eigennutzung steuerlich (kein V+V-Einkommen, eigene Regeln)
- Immobilienverkauf mid-year
- Mehrere Stellplätze
