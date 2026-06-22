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
| Umlagef. Kosten Wohnung | Mieter zahlt → 0 | Eigentümer trägt → steuerlich absetzbar |
| Grundsteuer Wohnung | Mieter (NK-Abrechnung) → 0 | Eigentümer → steuerlich absetzbar |
| Umlagef. Kosten Stellplatz | **Eigentümer trägt immer** | **Eigentümer trägt immer** |
| Grundsteuer Stellplatz | **Eigentümer trägt immer** | **Eigentümer trägt immer** |
| Nicht umlagef. Kosten (W+S) | Eigentümer trägt immer, absetzbar | Eigentümer trägt immer, absetzbar |
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
Startwert: restschuld = loanAmount (zum Zeitpunkt loanStartDate)

interestForMonth(month M):
  restschuld_zum_monatsbeginn × jahreszinssatz / 12

restschuld wird Monat für Monat akkumuliert:
  monatliche_rate     = monthlyMortgage    // direkt gespeichert, im Wizard vorausgefüllt
  zins_m              = restschuld × interestRate / 12
  tilgung_m           = monatliche_rate − zins_m
  restschuld_nächster = restschuld − tilgung_m
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
    // closingCostsTotal = landTransferTax + notaryCosts + landRegistryCosts
    //                   + agentFee + appraisalCosts + brokerCommissionAgreement
  hoaFeeNonRecoverableMonthly         // WE: total − recoverable − reserve
  hoaFeeRecoverableMonthly            // WE: umlagefähig
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
                              // angefangene Monate zählen voll (§7 EStG)
  2. zinsenJahr             = Σ interestForMonth(m) für m in [max(loanStart, 1.Jan Y)..31.Dez Y]
  3. afaJahr                = isErwerbsjahr(Y)
                              ? afaBemessungsgrundlage × depreciationRate / 12 × eigentumsMonateAnzahl
                              : afaBemessungsgrundlage × depreciationRate
  4. leerstandsTage         = Σ Tage mit status == .leerstand ODER .mietgarantie im Jahr Y
     leerstandsAnteil       = leerstandsTage / tageImJahr(Y)   // 365 oder 366
  5. Für jeden Eigentumsmonat:
       einnahmen            += incomeForMonth(m, statusHistory)
  6. Abzüge:
       immer (× eigentumsMonateAnzahl):
         hoaFeeNonRecoverableMonthly
         hoaFeeParkingNonRecoverableMonthly   // nur wenn Stellplatz
         hoaFeeParkingRecoverableMonthly      // TE trägt immer Eigentümer
         propertyManagementAnnual / 12
         propertyInsuranceAnnual / 12         // nur wenn > 0
         otherCostsMonthly                   // §9 EStG Werbungskosten, nur wenn > 0
         propertyTaxParkingAnnual / 12        // nur wenn Stellplatz
       nur Leerstand-Anteil:
         hoaFeeRecoverableMonthly × 12 × leerstandsAnteil
         propertyTaxAnnual × leerstandsAnteil
       außergewöhnliche Kosten:
         Σ extraordinaryCosts(year Y, isDeductible: true)
  7. return einnahmen − zinsenJahr − afaJahr − summeAbzüge
```

**Steuereffekt:**
```
taxEffectYearly  = max(0, −annualTaxableIncome) × marginalTaxRate
taxEffectMonthly = taxEffectYearly ÷ eigentumsMonateAnzahlImJahr
```

---

## CashflowCalculator — `cashflowBeforeTax(month:)`

```
+ incomeForMonth(month, statusHistory)
    // Vermietet: coldRentMonthly + parkingRentMonthly + otherIncomeMonthly
    // Mietgarantie: StatusEntry.incomeActualMonthly
    // Leerstand: 0
− monthlyMortgage                          // Zinsen + Tilgung
− hoaFeeNonRecoverableMonthly              // WE: nicht umlagefähig
− hoaFeeMaintenanceReserveMonthly          // WE: Rücklage (Cashflow-Abfluss, nicht steuerlich)
− (propertyInsuranceAnnual / 12)           // nur wenn > 0
− (propertyManagementAnnual / 12)
− otherCostsMonthly                        // nur wenn > 0
− ownerBorneRecoverableCosts(month)        // status-abhängig, tagesanteilig
− hoaFeeParkingNonRecoverableMonthly       // TE: nur wenn Stellplatz
− hoaFeeParkingMaintenanceReserveMonthly   // TE: Rücklage, nur wenn Stellplatz
− hoaFeeParkingRecoverableMonthly          // TE: immer Eigentümer
− (propertyTaxParkingAnnual / 12)          // TE: nur wenn Stellplatz
− extraordinaryCosts(month)                // alle Einträge im Monat (unabhängig von isDeductible)
```

**`ownerBorneRecoverableCosts(month:)`** — tagesanteilig bei Status-Wechsel mid-month:
```
Für jeden Status-Abschnitt im Monat:
  tagesanteil = anzahlTageInAbschnitt / gesamtTageImMonat
  if status == .vermietet:
    anteil += 0    // Mieter zahlt
  else:            // leerstand oder mietgarantie
    anteil += (hoaFeeRecoverableMonthly + propertyTaxAnnual / 12) × tagesanteil
return anteil
```

---

## Abgeleitete Feldwerte

```swift
closingCostsTotal =
    landTransferTax + notaryCosts + landRegistryCosts
    + agentFee + appraisalCosts + brokerCommissionAgreement
    // brokerCommissionAgreement = Maklerkosten aus Eigenprovisions-Vereinbarung
    // → Anschaffungsnebenkosten → erhöht afaBemessungsgrundlage

totalPurchasePrice    = purchasePriceUnit + purchasePriceParking
totalInvestment       = totalPurchasePrice + closingCostsTotal + renovationModernizationCosts
equityUsed            = totalInvestment − loanAmount

hoaFeeNonRecoverableMonthly =
    hoaFeeTotalMonthly − hoaFeeRecoverableMonthly − hoaFeeMaintenanceReserveMonthly

hoaFeeParkingNonRecoverableMonthly =
    hoaFeeParkingTotalMonthly − hoaFeeParkingRecoverableMonthly − hoaFeeParkingMaintenanceReserveMonthly

afaBemessungsgrundlage =
    buildingValue
    + (closingCostsTotal × buildingValue / totalPurchasePrice)
    + renovationAfaEligible
```

**`monthlyMortgage`** wird direkt gespeichert — im Wizard vorausgefüllt mit:
```
loanAmount × (interestRate + amortizationRate) / 12
```
Nutzer kann es überschreiben (z.B. bei Sondertilgungen oder Bankabweichung).

---

## Fallbacks bei fehlender Hausgeld-Aufteilung

### Wohnung (`isHoaUnitSplit = false`)

`hoaFeeRecoverableMonthly` und `hoaFeeMaintenanceReserveMonthly` sind nicht befüllt (= 0).

**Folge:** `hoaFeeNonRecoverableMonthly = hoaFeeTotalMonthly` — gesamtes Hausgeld wird als Werbungskosten abgesetzt, auch der umlagefähige Anteil. Das **überschätzt die steuerliche Absetzbarkeit** bei Vermietung.

**Warnung im UI:** ⚠ "Steuerliche Berechnung ungenau — Hausgeld wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung Hausgeld aufteilen (→ Einstellungen)"

### Stellplatz (`isHoaParkingSplit = false`)

`hoaFeeParkingRecoverableMonthly` und `hoaFeeParkingMaintenanceReserveMonthly` sind nicht befüllt (= 0).

**Folge:** `hoaFeeParkingNonRecoverableMonthly = hoaFeeParkingTotalMonthly` — gesamtes Stellplatz-Hausgeld wird abgesetzt (leicht zu hoch, da Rücklage nicht absetzbar wäre).

**Warnung im UI:** ⚠ "Steuerliche Berechnung ungenau — Hausgeld Stellplatz wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung aufteilen (→ Einstellungen)"

**Validierung Aufteilung:** `umlagefähig + rücklage ≤ gesamt` — Fehler beim Speichern wenn überschritten.

---

## Rendite-KPIs

```swift
totalColdRentMonthly  = coldRentMonthly + parkingRentMonthly + otherIncomeMonthly

effectiveGrossIncomeYearly = totalColdRentMonthly × 12 × (1 − vacancyRateAssumption)

operatingCostsNonRecoverableYearly =
    (hoaFeeNonRecoverableMonthly + hoaFeeMaintenanceReserveMonthly) × 12
    + hoaFeeParkingNonRecoverableMonthly × 12        // TE: nur wenn Stellplatz
    + hoaFeeParkingRecoverableMonthly × 12           // TE: immer Eigentümer
    + hoaFeeParkingMaintenanceReserveMonthly × 12    // TE: nur wenn Stellplatz
    + propertyTaxParkingAnnual                       // TE: immer Eigentümer
    + propertyManagementAnnual
    + propertyInsuranceAnnual
    + otherCostsMonthly × 12
    // NICHT: propertyTaxAnnual (WE) — Mieter zahlt via Warmmiete bei Vermietung
    // NICHT: hoaFeeRecoverableMonthly (WE) — Mieter zahlt via Betriebskosten

NOI = effectiveGrossIncomeYearly − operatingCostsNonRecoverableYearly

cashflowAfterTaxYearly = Σ cashflowNachSteuerMonatlich für alle Eigentumsmonate im Jahr

mietpreisAbweichung =
    (coldRentMonthly / livingAreaSqm - rentMarketSqm) / rentMarketSqm
    // positiv = über Markt, negativ = unter Markt
    // nur berechnen wenn rentMarketSqm != nil && > 0

wertsteigerung =
    currentMarketValue - totalPurchasePrice
    // absolut in €
wertsteigerungProzent =
    (currentMarketValue - totalPurchasePrice) / totalPurchasePrice
    // nur berechnen wenn currentMarketValue != nil
    // Anzeige im Übersicht-Tab

tatsächlicheLeerstandsquote =
    leerstandsTageGesamt / gesamtEigentumstage
    // leerstandsTageGesamt = Tage mit status == .leerstand ODER .mietgarantie
    //                        ab economicTransferDate bis heute
    // gesamtEigentumstage  = ab economicTransferDate bis heute
    // Anzeige im Übersicht-Tab als Ist-Wert neben vacancyRateAssumption

bruttorendite    = (coldRentMonthly + parkingRentMonthly) × 12
                   / (purchasePriceUnit + purchasePriceParking)

nettorendite     = NOI / totalInvestment

capRate          = NOI / totalPurchasePrice

kaufpreisfaktor  = totalPurchasePrice / ((coldRentMonthly + parkingRentMonthly) × 12)

cashOnCashReturn = cashflowAfterTaxYearly / equityContributed
                   // Fallback: equityUsed wenn equityContributed = 0

dscr             = NOI / (monthlyMortgage × 12)

ltv              = remainingDebtNow / totalInvestment

breakEvenRent    = hoaFeeNonRecoverableMonthly              // WE: immer Eigentümer
                   + hoaFeeMaintenanceReserveMonthly         // WE: Rücklage, immer
                   + hoaFeeParkingNonRecoverableMonthly      // TE: nur wenn Stellplatz
                   + hoaFeeParkingRecoverableMonthly         // TE: immer Eigentümer
                   + hoaFeeParkingMaintenanceReserveMonthly  // TE: nur wenn Stellplatz
                   + (propertyTaxParkingAnnual / 12)         // TE: immer Eigentümer
                   + (propertyManagementAnnual / 12)
                   + (propertyInsuranceAnnual / 12)
                   + otherCostsMonthly
                   + monthlyMortgage
                   // NICHT: propertyTaxAnnual (WE) — Mieter zahlt via Warmmiete
                   // NICHT: hoaFeeRecoverableMonthly (WE) — Mieter zahlt via Betriebskosten
                   // Annahme: Vermietet-Szenario (Kaltmiete-Breakeven)
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

Toggle-Zustand bleibt dauerhaft erhalten — kein Reset beim Tab-Wechsel.
