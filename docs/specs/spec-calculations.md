# Berechnungslogik

---

## Einnahmenlogik je Status

| Status | Einnahme kommt von |
|--------|-------------------|
| Vermietet | `coldRentMonthly + parkingRentMonthly` aus Einstellungen |
| Leerstand + Mietgarantie | `StatusEntry.incomeActualMonthly` (manuell eingetragen) |
| Leerstand | 0 |
| Eigennutzung | 0 |
| Renovierung | 0 |

---

## Status-Logik: Kostenträger

| Kostenart | Vermietet | Leerstand / Mietgarantie / Eigennutzung / Renovierung |
|-----------|-----------|------------------------------------------------------|
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
| Vergangene Monate | Vollständig Ist aus Statushistorie |
| Aktueller Monat: 1. bis heute | Ist aus Statushistorie |
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
  monatliche_rate     = loanAmount × (interestRate + amortizationRate) / 12
  zins_m              = restschuld × interestRate / 12
  tilgung_m           = monatliche_rate - zins_m
  restschuld_nächster = restschuld - tilgung_m
```

Nutzt `AmortizationCalculator` (bereits vorhanden).

---

## TaxCalculator — `annualTaxableIncome(year:)`

```
Inputs:
  year, economicTransferDate, loanStartDate, loanAmount, interestRate, monthlyPayment
  afaBasis (= buildingValue + renovationAfaEligible), depreciationRate
  hoaUnitNonRecoverableMonthly, hoaUnitRecoverableMonthly, isHoaUnitSplitComplete
  hoaParkingNonRecoverableMonthly, hoaParkingRecoverableMonthly
  propertyTaxUnitMonthly, propertyTaxParkingMonthly
  propertyManagementMonthly, otherCostsMonthly
  coldRentMonthly, parkingRentMonthly, statusHistory

Berechnung:
  1. eigentumsMonateImJahr  = Monate in Jahr Y ab economicTransferDate
  2. zinsenJahr             = Σ interestForMonth(m) für m in [max(loanStart, 1.Jan Y) .. 31.Dez Y]
  3. afaJahr                = isErwerbsjahr(Y)
                              ? afaBasis × depreciationRate / 12 × eigentumsMonateAnzahl
                              : afaBasis × depreciationRate
  4. Für jeden Eigentumsmonat (tagesgenau):
       einnahmen            += incomeForMonth(m, statusHistory, coldRent, parkingRent)
       leerstandTageAnteil  += leerstandTage(m) / tageImMonat(m)
  5. Abzüge:
       immer (× eigentumsMonateAnzahl):
         hoaUnitNonRecoverableMonthly
         hoaParkingNonRecoverableMonthly
         propertyManagementMonthly
         propertyTaxParkingMonthly
         otherCostsMonthly
       nur Leerstand-Anteil (× leerstandTageAnteil):
         hoaUnitRecoverableMonthly
         propertyTaxUnitMonthly
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
+ incomeForMonth(...)
- monthlyMortgage                    (Zinsen + Tilgung)
- hoaUnitNonRecoverableMonthly       (inkl. Rücklage — echter Cashflow-Abfluss)
- hoaParkingNonRecoverableMonthly    (immer wenn hasParking, tagesanteilig bei mid-month)
- ownerBorneRecoverableCosts(...)    (status-abhängig, tagesanteilig)
- propertyManagementMonthly
- maintenanceReserveMonthly          (externe Rücklage außerh. WEG)
- extraordinaryCosts
```

**`ownerBorneRecoverableCosts(status:)`:**
```
unitPart    = (status == .vermietet) ? 0 : hoaUnitRecoverable + propertyTaxUnit
parkingPart = hoaParkingRecoverable + propertyTaxParking    // immer
return unitPart + parkingPart
```

---

## Abgeleitete Feldwerte

```swift
hoaFeeNonRecoverableUnitMonthly =
    hoaFeeTotalMonthly - hoaFeeRecoverableMonthly - maintenanceReserveMonthly

hoaFeeParkingNonRecoverableMonthly =
    hoaFeeParkingTotalMonthly - hoaFeeParkingRecoverableMonthly
    - hoaFeeParkingMaintenanceReserveMonthly

monthlyMortgageCalc =
    loanAmount × (interestRate + amortizationRate) / 12

equityUsed =
    totalInvestment - loanAmount
```

---

## Warnungen bei fehlender Aufteilung

**Fallback (wenn `isHoaUnitSplit = false`):**
- Nicht umlagef. WE ≈ `hoaFeeTotalMonthly - hoaFeeRecoverableMonthly` (Rücklage geht in Abzug — leichte Überoptimierung)
- Umlagef. WE = `hoaFeeRecoverableMonthly`

**Fallback (wenn `isHoaParkingSplit = false`):**
- Stellplatz-Kosten = 0 in Steuerberechnung

**Validierung Aufteilung:** `umlagefähig + rücklage ≤ gesamt` — Fehler wenn überschritten, Speichern blockiert.

---

## Rendite-KPIs

```
bruttorendite       = (coldRentMonthly + parkingRentMonthly) × 12
                      / (purchasePriceUnit + purchasePriceParking)

nettorendite        = netOperatingIncomeYearly / totalInvestment

kaufpreisfaktor     = totalPurchasePrice / ((coldRentMonthly + parkingRentMonthly) × 12)

cashOnCashReturn    = (cashflowBeforeTaxYearly) / equityUsed

dscr                = netOperatingIncomeYearly / (monthlyMortgage × 12)

ltv                 = loanAmount / totalPurchasePrice

breakEvenRent       = (laufende Kosten + Kreditzinsen) / 12

capRate             = netOperatingIncomeYearly / totalPurchasePrice

noi                 = (einnahmen - betriebskosten ohne Kredit) / Jahr
```
