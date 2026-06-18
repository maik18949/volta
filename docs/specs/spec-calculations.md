# Berechnungslogik

Technische Referenz für TaxCalculator, CashflowCalculator, Rendite-KPIs und Proration.

---

## Einnahmenlogik je Status

| Status | Einnahme kommt von |
|--------|-------------------|
| Vermietet | `coldRentMonthly + parkingRentMonthly + otherIncomeMonthly` |
| Leerstand + Mietgarantie | `StatusEntry.incomeActualMonthly` (manuell eingetragen) |
| Leerstand | 0 |

---

## Status-Logik: Kostenträger

| Kostenart | Vermietet | Leerstand / Mietgarantie |
|-----------|-----------|--------------------------|
| Umlagef. Kosten Wohnung | Mieter zahlt → 0 | Eigentümer trägt → absetzbar |
| Grundsteuer Wohnung | Mieter (NK-Abrechnung) → 0 | Eigentümer → absetzbar |
| Umlagef. Kosten Stellplatz | **Eigentümer trägt immer** | **Eigentümer trägt immer** |
| Grundsteuer Stellplatz | **Eigentümer trägt immer** | **Eigentümer trägt immer** |
| Nicht umlagef. Kosten (W+S) | Eigentümer trägt immer | Eigentümer trägt immer |
| Instandhaltungsrücklage | Cashflow-Abfluss, **nicht steuerlich** | Cashflow-Abfluss, **nicht steuerlich** |
| Hausverwaltung | Immer absetzbar | Immer absetzbar |

---

## Tagesgenaue Proration

**Gilt für alle Berechnungen:** Einnahmen, steuerliche Abzüge, Cashflow-Kosten.

Wenn zwei StatusEntries in denselben Monat fallen:

```
Für jeden Status-Abschnitt im Monat:
  tagesanteil = anzahlTageInDiesemAbschnitt / gesamtTageImMonat
  einnahme   += statusEinnahme × tagesanteil
  abzüge     += statusAbhängigeKosten × tagesanteil
```

**Beispiel** — Juni (30 Tage), Mietgarantie 1.–15., Vermietet 16.–30.:
```
Einnahmen:
  Mietgarantie (15 Tage): 999 × 15/30 = 499,50 €
  Vermietet    (15 Tage): 959 × 15/30 = 479,50 €
  Gesamt:                               979,00 €

Umlagef. Kosten Wohnung (steuerlich):
  Mietgarantie (15 Tage): 225,60 × 15/30 = 112,80 €  (absetzbar)
  Vermietet    (15 Tage): 225,60 × 15/30 =   0,00 €  (Mieter zahlt)
  Gesamt absetzbar:                          112,80 €
```

---

## Laufendes Jahr — Hybrid-Berechnung

| Zeitraum | Datenbasis |
|----------|-----------|
| Vergangene Monate | Vollständig Ist aus Statusverlauf |
| Aktueller Monat: 1. bis heute | Ist aus Statusverlauf |
| Aktueller Monat: morgen bis Monatsende | Projektion mit aktuellem Status |
| Zukünftige Monate im laufenden Jahr | Vollständig projiziert mit aktuellem Status |

**Projektion:** Letzter bekannter Status (letzter StatusEntry) wird für alle zukünftigen Tage/Monate fortgeschrieben.

---

## Zeitliche Abgrenzung im Steuerjahr Y

| Posten | Zeitraum |
|--------|---------|
| Zinsen | `max(loanStartDate, 1. Jan Y)` bis `31. Dez Y`, amortisierend je Monat |
| AfA | Erwerbsjahr: anteilig ab `economicTransferDate`; Folgejahre: voll |
| Einnahmen | Ab `economicTransferDate` in Jahr Y |
| Alle anderen Kosten | Ab `economicTransferDate` in Jahr Y |

**Zinsen vor Besitzübergang** = vorweggenommene Werbungskosten absetzbar (§9 EStG), solange Darlehen nachweislich für Erwerb verwendet.

---

## Zinsberechnung (amortisierend)

```
interestForMonth(month M):
  restschuld_zum_monatsbeginn × jahreszinssatz / 12

restschuld wird Monat für Monat akkumuliert:
  monatliche_rate     = monthlyMortgage    // direkt gespeichert, im Wizard vorausgefüllt
  zins_m              = restschuld × interestRate / 12
  tilgung_m           = monatliche_rate - zins_m
  restschuld_nächster = restschuld - tilgung_m
```

Nutzt `AmortizationCalculator` (bereits vorhanden).

---

## TaxCalculator — `annualTaxableIncome(year:)`

```
Inputs:
  year, economicTransferDate, loanStartDate
  loanAmount, interestRate, monthlyMortgage
  afaBemessungsgrundlage, depreciationRate
    // afaBemessungsgrundlage = buildingValue
    //   + (closingCostsTotal × buildingValue / totalPurchasePrice)
    //   + renovationAfaEligible
  hoaFeeNonRecoverableMonthly         // WE: total - recoverable - reserve
  hoaFeeRecoverableMonthly            // WE: umlagefähig
  hoaFeeMaintenanceReserveMonthly     // WE: Rücklage (NICHT steuerlich)
  hoaFeeParkingNonRecoverableMonthly  // TE: nur wenn Stellplatz
  hoaFeeParkingRecoverableMonthly     // TE: nur wenn Stellplatz
  propertyTaxAnnual                   // WE Grundsteuer
  propertyTaxParkingAnnual            // TE Grundsteuer (nur wenn Stellplatz)
  propertyManagementAnnual
  propertyInsuranceAnnual             // nur wenn > 0
  coldRentMonthly, parkingRentMonthly, otherIncomeMonthly
  statusHistory: [StatusEntry]
  extraordinaryCosts: [ExtraordinaryCost]

Berechnung:
  1. eigentumsMonateImJahr  = Monate in Jahr Y ab economicTransferDate
  2. zinsenJahr             = Σ interestForMonth(m) für m in [max(loanStart, 1.Jan Y)..31.Dez Y]
  3. afaJahr                = isErwerbsjahr(Y)
                              ? afaBemessungsgrundlage × depreciationRate / 12 × eigentumsMonateAnzahl
                              : afaBemessungsgrundlage × depreciationRate
  4. Für jeden Eigentumsmonat (tagesgenau):
       einnahmen            += incomeForMonth(m, statusHistory)
       leerstandTageAnteil  += leerstandTage(m) / tageImMonat(m)
         // leerstand = .leerstand ODER .mietgarantie
  5. Abzüge:
       immer (× eigentumsMonateAnzahl):
         hoaFeeNonRecoverableMonthly
         hoaFeeParkingNonRecoverableMonthly   // nur wenn Stellplatz
         hoaFeeParkingRecoverableMonthly      // TE trägt immer Eigentümer
         propertyManagementAnnual / 12
         propertyInsuranceAnnual / 12         // nur wenn > 0
         propertyTaxParkingAnnual / 12        // nur wenn Stellplatz
       nur Leerstand-Anteil:
         hoaFeeRecoverableMonthly × leerstandTageAnteil
         propertyTaxAnnual × leerstandTageAnteil
       außergewöhnliche Kosten:
         Σ extraordinaryCosts(year Y, isDeductible: true)
  6. return einnahmen - zinsenJahr - afaJahr - summeAbzüge
```

**Steuereffekt:**
```
taxEffectYearly  = max(0, -annualTaxableIncome) × marginalTaxRate
taxEffectMonthly = taxEffectYearly ÷ eigentumsMonateAnzahlImJahr
```

---

## CashflowCalculator — `cashflowBeforeTax(month:)`

```
+ incomeForMonth(month, statusHistory)
    // Vermietet: coldRentMonthly + parkingRentMonthly + otherIncomeMonthly
    // Mietgarantie: StatusEntry.incomeActualMonthly
    // Leerstand: 0
- monthlyMortgage                          // Zinsen + Tilgung
- hoaFeeNonRecoverableMonthly              // WE: nicht umlagefähig
- hoaFeeMaintenanceReserveMonthly          // WE: Rücklage (Cashflow-Abfluss, nicht steuerlich)
- (propertyInsuranceAnnual / 12)           // nur wenn > 0
- (propertyManagementAnnual / 12)
- otherCostsMonthly                        // nur wenn > 0
- ownerBorneRecoverableCosts(month)        // status-abhängig, tagesanteilig
- hoaFeeParkingNonRecoverableMonthly       // TE: nur wenn Stellplatz
- hoaFeeParkingMaintenanceReserveMonthly   // TE: Rücklage, nur wenn Stellplatz
- hoaFeeParkingRecoverableMonthly          // TE: immer Eigentümer
- (propertyTaxParkingAnnual / 12)          // TE: nur wenn Stellplatz
- extraordinaryCosts(month)                // alle Einträge im Monat (unabhängig von isDeductible)
```

**`ownerBorneRecoverableCosts(month:)`** — tagesanteilig bei Status-Wechsel mid-month:
```
unitPart = (status == .vermietet) ? 0 : hoaFeeRecoverableMonthly + (propertyTaxAnnual / 12)
return unitPart    // Stellplatz-Anteil separat (immer oben erfasst)
```

---

## Abgeleitete Feldwerte

```swift
hoaFeeNonRecoverableMonthly =
    hoaFeeTotalMonthly - hoaFeeRecoverableMonthly - hoaFeeMaintenanceReserveMonthly

hoaFeeParkingNonRecoverableMonthly =
    hoaFeeParkingTotalMonthly - hoaFeeParkingRecoverableMonthly - hoaFeeParkingMaintenanceReserveMonthly

afaBemessungsgrundlage =
    buildingValue
    + (closingCostsTotal × buildingValue / totalPurchasePrice)
    + renovationAfaEligible

equityUsed   = totalInvestment - loanAmount
equityContributed = gespeichert (vom Nutzer eingetragen)
```

**`monthlyMortgage`** wird direkt gespeichert — im Wizard vorausgefüllt mit:
```
loanAmount × (interestRate + amortizationRate) / 12
```
Nutzer kann es überschreiben (z.B. bei Sondertilgungen).

---

## Warnungen bei fehlender Aufteilung

**Fallback (wenn `isHoaUnitSplit = false`):**
- Nicht umlagef. WE ≈ `hoaFeeTotalMonthly - hoaFeeRecoverableMonthly`
- Rücklage = 0 (nicht bekannt)
- Umlagef. WE = `hoaFeeRecoverableMonthly`

**Fallback (wenn `isHoaParkingSplit = false`):**
- Stellplatz-Hausgeld wird in Steuerberechnung als 0 angesetzt

**Validierung Aufteilung:** `umlagefähig + rücklage ≤ gesamt` — Fehler wenn überschritten, Speichern blockiert.

---

## Rendite-KPIs

```swift
bruttorendite    = (coldRentMonthly + parkingRentMonthly) × 12
                   / (purchasePriceUnit + purchasePriceParking)

nettorendite     = NOI / totalInvestment

capRate          = NOI / totalPurchasePrice

kaufpreisfaktor  = totalPurchasePrice / ((coldRentMonthly + parkingRentMonthly) × 12)

cashOnCashReturn = cashflowBeforeTaxYearly / equityContributed
                   // Fallback: equityUsed wenn equityContributed = 0

dscr             = NOI / (monthlyMortgage × 12)

ltv              = remainingDebtNow / totalInvestment

breakEvenRent    = (laufende Kosten nicht-umlagefähig + monthlyMortgage) / 1 Monat

NOI              = effectiveGrossIncomeYearly - operatingCostsNonRecoverableYearly
                   // ohne Kredit, ohne AfA, ohne Tilgung

effectiveGrossIncomeYearly = totalColdRentMonthly × 12 × (1 - vacancyRateAssumption)
```

---

## Prognose-Szenarien (in-memory)

Beide Tabs (Cashflow, Steuer) haben einen Toggle `[Vollvermietung] [Leerstand]`.

| | Vollvermietung | Leerstand |
|--|----------------|-----------|
| Einnahmen | coldRent + parkingRent + otherIncome | 0 |
| Umlagef. Kosten WE | 0 (Mieter zahlt) | voll (Owner trägt) |
| Grundsteuer WE | 0 (Mieter zahlt) | voll (Owner trägt) |
| Alle anderen Kosten | unverändert | unverändert |

Toggle-Zustand wird nicht gespeichert — reset bei Tab-Wechsel.
