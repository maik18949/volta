# Datenmodell

**Datei:** `web/lib/supabase/types.ts` (generiert) — Tabelle `properties`  
**PropertySetupState:** `web/app/(app)/properties/new/page.tsx` (React-Hook-Form-State)

---

## Enums

### AcquisitionType

```typescript
type AcquisitionType = 'kauf' | 'erbschaft' | 'schenkung';
// Anzeige-Labels: "Kauf" / "Erbschaft" / "Schenkung"
// ENTFERNT: kaufUndRenovierung, neubau
```

### ParkingType

```typescript
type ParkingType = 'nicht_vorhanden' | 'tiefgarage' | 'aussenstellplatz' | 'garage';
// Anzeige-Labels: "Nicht vorhanden" / "Tiefgarage" / "Außenstellplatz" / "Garage"
// ENTFERNT: keiner, carport, doppelparker
```

**Wichtig:** `parkingType` ist nicht optional — Default ist `.nichtVorhanden`. Alle Stellplatz-Felder (Einnahmen, Kosten, Kauf) erscheinen nur wenn `parkingType != .nichtVorhanden`. Kein separates `hasParking`-Feld.

### PropertyType

```typescript
type PropertyType = 'apartment' | 'einfamilienhaus' | 'mehrfamilienhaus' | 'gewerbe' | 'grundstuck' | 'sonstiges';
// Anzeige-Labels: "Eigentumswohnung" / "Einfamilienhaus" / "Mehrfamilienhaus" / "Gewerbe" / "Grundstück" / "Sonstiges"
```

### PropertyStatus

```typescript
type PropertyStatus = 'vermietet' | 'leerstand' | 'mietgarantie';    // mietgarantie = Leerstand mit Mietgarantie-Zahlung
```

### HeatingType, EnergyClass, PropertyCondition

— unverändert.

---

## Property — Gespeicherte Felder

### Stammdaten

```typescript
name: string;
address: string;
city: string;
state: string;
postalCode: string;
propertyType: PropertyType;
acquisitionType: AcquisitionType;      // Kauf / Erbschaft / Schenkung
yearBuilt: number | null;
notes: string;
```

### Objektdaten

```typescript
livingAreaSqm: number;
usableAreaSqm: number | null;
landAreaSqm: number | null;
rooms: number | null;
bedrooms: number | null;
bathrooms: number | null;
floorLevel: number | null;
hasBalcony: boolean;
hasTerrace: boolean;
hasGarden: boolean;
hasBasement: boolean;
basementSizeSqm: number | null;
hasFittedKitchen: boolean;
parkingType: ParkingType;      // nicht optional, Default = 'nicht_vorhanden'
parkingCount: number;          // nur relevant wenn != 'nicht_vorhanden'
heatingType: HeatingType | null;
energyEfficiencyClass: EnergyClass | null;
condition: PropertyCondition | null;
lastRenovationYear: number | null;
```

### Kauf & Nebenkosten

```typescript
purchaseDate: string;                    // Kaufdatum / Datum Erbschaft / Schenkung (Label je acquisitionType)
economicTransferDate: string;            // Wirtschaftlicher Übergang — AfA-Startpunkt
purchasePriceUnit: number;                // Kaufpreis Wohnung
purchasePriceParking: number;             // Kaufpreis Stellplatz (nur wenn parkingType != 'nicht_vorhanden')
landTransferTax: number;                  // Grunderwerbsteuer
notaryCosts: number;
landRegistryCosts: number;
agentFee: number;                         // Maklerprovision
appraisalCosts: number;                   // Gutachterkosten
renovationModernizationCosts: number;      // Renovierung gesamt
renovationAfaEligible: number;             // davon aktivierungspflichtig (erhöht AfA-Bemessungsgrundlage)
```

### Einnahmen

```typescript
coldRentMonthly: number;               // Nettomiete / Monat (Kaltmiete ohne NK) — UI-Label: "Nettomiete"
warmmieteMonthly: number | null;       // Bruttomiete / Monat (vereinbarte Warmmiete inkl. NK-Vorauszahlung) — optional, rein informativ
parkingRentMonthly: number;            // Stellplatzmiete / Monat (nur wenn parkingType != 'nicht_vorhanden')
otherIncomeMonthly: number;            // Sonstige Einnahmen / Monat
```

### Annahmen

```typescript
vacancyRateAssumption: number;         // Angenommene Leerstandsquote, z.B. 3%
rentMarketSqm: number | null;          // Marktmiete / m² (informativ, Vergleich mit eigener Miete)
currentMarketValue: number | null;     // Aktueller Marktwert gesamt (Schätzung, manuell eingetragen)
```

### Kosten — Wohnung

```typescript
hoaFeeTotalMonthly: number;                   // Hausgeld Wohnung gesamt / Monat
isHoaUnitSplit: boolean;                      // Toggle: Hausgeld aufteilen
hoaFeeRecoverableMonthly: number;             // davon umlagefähig / Monat (nur wenn isHoaUnitSplit)
hoaFeeMaintenanceReserveMonthly: number;      // davon Instandhaltungsrücklage / Monat (nur wenn isHoaUnitSplit)
// hoaFeeNonRecoverableMonthly — abgeleitet: total - recoverable - reserve (siehe Berechnete Werte)
propertyTaxAnnual: number;                    // Grundsteuer Wohnung / Jahr
propertyManagementAnnual: number;             // Hausverwaltung / Jahr
propertyInsuranceAnnual: number;              // Gebäudeversicherung / Jahr (nur wenn nicht im Hausgeld enthalten)
otherCostsMonthly: number;                    // Sonstige Kosten / Monat
```

### Kosten — Stellplatz (nur wenn parkingType != .nichtVorhanden)

```typescript
hoaFeeParkingTotalMonthly: number;                    // Hausgeld Stellplatz gesamt / Monat
isHoaParkingSplit: boolean;                           // Toggle: Hausgeld Stellplatz aufteilen
hoaFeeParkingRecoverableMonthly: number;              // davon umlagefähig / Monat (nur wenn isHoaParkingSplit)
hoaFeeParkingMaintenanceReserveMonthly: number;       // davon Rücklage / Monat (nur wenn isHoaParkingSplit)
// hoaFeeParkingNonRecoverableMonthly — abgeleitet: total - recoverable - reserve (siehe Berechnete Werte)
propertyTaxParkingAnnual: number;                     // Grundsteuer Stellplatz / Jahr
```

### Finanzierung

```typescript
loanAmount: number;                    // Darlehensbetrag (Anfangsbetrag)
interestRate: number;                  // Zinssatz jährl., z.B. 3,50%
amortizationRate: number;              // Tilgungssatz jährl., z.B. 2,00%
fixedInterestPeriodYears: number;      // Zinsbindung in Jahren
loanStartDate: string;                 // Darlehensbeginn
monthlyMortgage: number;               // Monatsrate — im Wizard vorausgefüllt mit loanAmount × (rate + tilgung) / 12, direkt editierbar
equityContributed: number;             // Eigenkapital selbst eingebracht
brokerCommissionAgreement: number;     // Anteil aus Eigenprovisions-Vereinbarung (nicht Teil des Kaufpreises)
```

**Hinweis equityContributed vs equityUsed:**
- `equityContributed` (gespeichert) = was der Nutzer selbst eingebracht hat
- `equityUsed` (berechnet) = `totalInvestment − loanAmount`
- `equityContributed + brokerCommissionAgreement` sollte `equityUsed` ergeben

### AfA & Steuer

```typescript
landValue: number;                     // Grundstückswert (aus Regierungs-Excel)
buildingValue: number;                 // Gebäudewert (aus Regierungs-Excel)
depreciationRate: number;              // AfA-Satz, z.B. 2% (Altbau) oder 3% (Neubau ab 2023)
marginalTaxRate: number;               // Persönlicher Grenzsteuersatz, z.B. 42%
```

---

## Berechnete Werte (nicht persistiert)

### Kosten — abgeleitete Felder

```typescript
hoaFeeNonRecoverableMonthly        = hoaFeeTotalMonthly − hoaFeeRecoverableMonthly − hoaFeeMaintenanceReserveMonthly
hoaFeeParkingNonRecoverableMonthly = hoaFeeParkingTotalMonthly − hoaFeeParkingRecoverableMonthly − hoaFeeParkingMaintenanceReserveMonthly
```

### Investment

```typescript
totalPurchasePrice    = purchasePriceUnit + purchasePriceParking
closingCostsTotal     = landTransferTax + notaryCosts + landRegistryCosts + agentFee + appraisalCosts
closingCostsRatio     = closingCostsTotal / totalPurchasePrice
totalInvestment       = totalPurchasePrice + closingCostsTotal + renovationModernizationCosts
equityUsed            = totalInvestment − loanAmount
purchasePricePerSqm   = totalPurchasePrice / livingAreaSqm
totalInvestmentPerSqm = totalInvestment / livingAreaSqm
```

### Einnahmen & Leerstand

```typescript
totalColdRentMonthly       = coldRentMonthly + parkingRentMonthly + otherIncomeMonthly
rentPerSqm                 = coldRentMonthly / livingAreaSqm
vacancyLossAnnual          = totalColdRentMonthly × 12 × vacancyRateAssumption
effectiveGrossIncomeYearly = totalColdRentMonthly × 12 − vacancyLossAnnual
```

### Finanzierung

```typescript
remainingDebtNow              = AmortizationCalculator.remainingDebt(atMonth: monthsElapsed)
monthlyInterestPayment(m)     = AnnuityRow.interest für Monat m (aus Tilgungsplan)
monthlyAmortizationPayment(m) = AnnuityRow.principal für Monat m (aus Tilgungsplan)
fixedRateEndDate              = loanStartDate + fixedInterestPeriodYears Jahre
remainingDebtAtFixedRateEnd   = remainingDebt(atMonth: fixedRateEndDate)
interestAnnual(year)          = Σ AnnuityRow.interest für alle Monate in Jahr Y
// BUG: PropertyViewModel nutzt aktuell remainingDebtNow × interestRate (Näherung) — muss auf Tilgungsplan umgestellt werden
```

### AfA

```typescript
afaBemessungsgrundlage = buildingValue + (closingCostsTotal × buildingValue / totalPurchasePrice) + renovationAfaEligible
depreciationYearly     = afaBemessungsgrundlage × depreciationRate  // anteilig im Erwerbsjahr
```

### KPIs

```typescript
grossYield            = (coldRentMonthly + parkingRentMonthly) × 12 / totalPurchasePrice
netYield              = NOI / totalInvestment
capRate               = NOI / totalPurchasePrice
cashOnCashReturn      = cashflowAfterDebtYearly / equityContributed  // fallback: equityUsed wenn equityContributed = 0
dscrNOI               = NOI / (monthlyMortgage × 12)
ltvRatio              = remainingDebtNow / totalInvestment
mietmultiplikator     = totalPurchasePrice / ((coldRentMonthly + parkingRentMonthly) × 12)
NOI                   = effectiveGrossIncomeYearly − operatingCostsNonRecoverableYearly  // ohne Kredit
breakEvenRentMonthly  = operatingCostsNonRecoverableMonthly + monthlyMortgage
operatingExpenseRatio = (nonRecoverableYearly + recoverableYearly) / (totalColdRentMonthly × 12)
```

**Steuerliches Ergebnis & Cashflow** — vollständige Formeln mit Vermietet/Leerstand-Logik in `spec-steuer-tab.md` und `spec-cashflow-tab.md`.

---

## Felder entfernt (vs. vorherige Version)

| Feld | Grund |
|------|-------|
| `hasParking` | Ersetzt durch `parkingType != .nichtVorhanden` |
| `serviceChargeRecoverableMonthly` | In Hausgeld-Aufteilung integriert |
| `maintenanceReserveMonthly` | Umbenannt zu `hoaFeeMaintenanceReserveMonthly` (Teil des Hausgelds) |
| `landGuidelineValueSqm` | Nicht benötigt |
| `monthlyMortgageActual` | Ersetzt durch `monthlyMortgage` (direkt gespeichert, im Wizard editierbar) |
| `AcquisitionType.kaufUndRenovierung` | Entfernt |
| `AcquisitionType.neubau` | Entfernt |
| `ParkingType.keiner` | Ersetzt durch `.nichtVorhanden` als Default |
| `ParkingType.carport` | Entfernt |
| `ParkingType.doppelparker` | Entfernt |

---

## PropertyPhoto

Fotos einer Immobilie. Max. 15 Stück. Verwaltet in Immobiliendaten-Tab und Property Setup.

```typescript
// Postgres table: property_photos
interface PropertyPhoto {
  filePath: string;        // Pfad im Supabase Storage Bucket
  isCoverPhoto: boolean;   // Titelbild — wird in Übersicht + Immobilienliste angezeigt
  sortOrder: number;       // Reihenfolge in der Galerie
  createdAt: string;
  propertyId: string;      // FK auf properties.id
}
```

**Regeln:**
- Max. 15 Fotos pro Immobilie
- Genau ein Foto kann `isCoverPhoto = true` sein
- Kein Titelbild gesetzt → erstes Foto wird als Titelbild verwendet
- Keine Fotos → Placeholder mit Immobilientyp-Icon

---

## StatusEntry

```typescript
// Postgres table: status_entries
interface StatusEntry {
  date: string;                          // Beginn dieses Status
  status: PropertyStatus;
  incomeActualMonthly: number | null;    // nur für 'mietgarantie' befüllt
  notes: string;
  propertyId: string;                    // FK auf properties.id
}
```

---

## ExtraordinaryCost

Einmalige Ausgaben in einem bestimmten Monat. Verwaltet im Verlauf-Tab.

```typescript
// Postgres table: extraordinary_costs
interface ExtraordinaryCost {
  date: string;                        // Datum der Ausgabe
  description: string;                 // z.B. "Vermietungsprovision", "WEG Sonderumlage"
  amount: number;                      // Betrag (positiv gespeichert, als Ausgabe behandelt)
  isDeductible: boolean;               // steuerlich absetzbar (§9 EStG)?
  notes: string | null;
  propertyId: string;                  // FK auf properties.id
}
```

**Wirkung:**
- Immer: Cashflow-Abfluss im jeweiligen Monat
- Nur wenn `isDeductible = true`: reduziert steuerliches Ergebnis → erhöht Steuererstattung

---

## PropertySetupState

Transienter React-Hook-Form-State für die Route `properties/new` (eigene Seite, kein Modal). Spiegelt alle `properties`-Felder exakt. Mapping passiert beim Submit-Handler in `web/app/(app)/properties/new/page.tsx`.

Zusatzfelder nur in `PropertySetupState`:
```typescript
firstStatusDate: string;
firstStatus: PropertyStatus;
firstStatusIncome: number;    // nur für 'mietgarantie'
firstStatusNotes: string;
```

---

## Migration

Alle neuen Spalten: `default 0` / `default false` in der Postgres-Migration — bestehende Zeilen bleiben intakt (siehe `CLAUDEvolta.md` → Postgres-Migrationen).

**Manuelle Nacharbeit durch Nutzer:**
- `propertyTaxAnnual` auf Wohnung-only-Anteil korrigieren
- `propertyTaxParkingAnnual` nachtragen wenn Stellplatz vorhanden
- Hausgeld-Aufteilung ergänzen wenn steuerlich relevant
- `equityContributed` nachtragen
