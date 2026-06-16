# Wizard — Immobilie anlegen

**Schritt-Anzahl:** 7 Schritte (+ optionaler Schritt 8 wenn Besitzübergang in der Vergangenheit liegt)

---

## Schritte im Überblick

| # | Name | Pflicht-Felder | Konditionell |
|---|------|----------------|--------------|
| 1 | Stammdaten | Name, Adresse, Stadt | — |
| 2 | Objektdaten | Wohnfläche | — |
| 3 | Kauf & Nebenkosten | Kaufpreis WE, Wirtschaftlicher Übergang | Kaufpreis TE wenn hasParking |
| 4 | Einnahmen | Kaltmiete | Parkingmiete wenn hasParking |
| 5 | Kosten | Hausgeld WE, Grundsteuer WE | Stellplatz-Felder wenn hasParking |
| 6 | Finanzierung | Darlehensbetrag, Zinssatz, Tilgung | — |
| 7 | AfA & Steuer | Gebäudewert, Grundstückswert, AfA-Satz, Grenzsteuersatz | — |
| 8 | Status-Onboarding | Datum, Status | Einnahme wenn Mietgarantie |

**Schritt 8** erscheint nur wenn `economicTransferDate` ≤ Heute (Besitzübergang liegt in der Vergangenheit). `requiresStatusOnboarding = economicTransferDate.firstDayOfMonth <= Date().firstDayOfMonth`

---

## Schritt 1 — Stammdaten

```
Name *:         [Textfeld]                z.B. "ETW Dresden Neustadt"
Adresse *:      [Textfeld]
Stadt *:        [Textfeld]
PLZ:            [Textfeld]
Bundesland:     [Textfeld]
Typ:            [Picker] Apartment / Haus / Mehrfamilienhaus / ...
Erwerb:         [Picker] Kauf / Erbschaft / Schenkung
Baujahr:        [Textfeld]
Notizen:        [Textfeld, mehrzeilig]
```

---

## Schritt 2 — Objektdaten

```
Wohnfläche (m²) *:  [Zahlenfeld]
Nutzfläche (m²):    [Zahlenfeld]
Zimmer:             [Zahlenfeld]

Ausstattung (Toggles):
  Balkon | Terrasse | Garten | Keller | Einbauküche

Stellplatz: [Picker]    ← WICHTIG: Optional<ParkingType>
  Keiner (= .none)      ← nur diese Option ist "Keiner" — nicht doppelt!
  Tiefgarage
  Carport
  Außenstellplatz
  Garage

Heizung:      [Picker, optional]
Energieklasse: [Picker, optional]
Zustand:      [Picker, optional]
Letzte Renovierung: [Textfeld Jahr, optional]
```

**Bug-Fix (aktuell falsch):** Picker hat `Text("Keiner").tag(.none)` UND `ForEach(ParkingType.allCases)` — das ergibt zwei "Keiner"-Einträge wenn `.none` auch in `allCases` wäre. Korrekte Implementierung:

```swift
Picker("Stellplatz", selection: $state.parkingType) {
    Text("Keiner").tag(Optional<ParkingType>.none)
    ForEach(ParkingType.allCases, id: \.self) { t in
        Text(t.rawValue).tag(Optional(t))
    }
}
```

`ParkingType.allCases` darf kein `.keiner` Case enthalten.

**Kein Zusammenhang zwischen `parkingType` (Objektdaten) und `hasParking` (finanzielle Felder):** Der Nutzer wählt hier nur die Art des Stellplatzes informativ. `hasParking` wird separat in Schritt 3/5 als Toggle gesetzt.

---

## Schritt 3 — Kauf & Nebenkosten

```
Kaufdatum:                  [DatePicker]
Wirtschaftlicher Übergang *:[DatePicker]  ← Besitzübergang, AfA-Startpunkt

━━━━ KAUFPREIS ━━━━
[Toggle] Stellplatz vorhanden → setzt state.hasParking

Wenn hasParking = false:
  Kaufpreis *: [Währungsfeld]  → schreibt nach purchasePriceUnit

Wenn hasParking = true:
  Kaufpreis Wohnung *:    [Währungsfeld]  → purchasePriceUnit
  Kaufpreis Stellplatz *: [Währungsfeld]  → purchasePriceParking
  Gesamtkaufpreis:        [readonly = WE + TE]

━━━━ KAUFNEBENKOSTEN ━━━━
Grunderwerbsteuer:      [Währungsfeld]
Notarkosten:            [Währungsfeld]
Grundbuchkosten:        [Währungsfeld]
Maklerprovision:        [Währungsfeld]
Gutachterkosten:        [Währungsfeld]
Renovierung gesamt:     [Währungsfeld]
davon aktivierungspflichtig: [Währungsfeld]

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
Kaufpreis:              XXX.XXX €
+ Kaufnebenkosten:      XX.XXX €
+ Renovierung:          XX.XXX €
= Gesamtinvestment:     XXX.XXX €  (fett)
```

---

## Schritt 4 — Einnahmen

```
Kaltmiete/Monat *:      [Währungsfeld]
Parkingmiete/Monat:     [Währungsfeld]  ← nur anzeigen wenn hasParking = true
Sonstige Einnahmen/Monat: [Währungsfeld]
Leerstandsquote (Annahme): [Prozentfeld]  z.B. 3%
Marktmiete/m² (informativ): [Währungsfeld]

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
Bruttomiete/Monat:          XXX €
Leerstand (X%):            -XX €
Effektives Bruttoeinkommen: XXX €  (fett)

[Wenn Kaufpreis + Miete bekannt: live Bruttorendite-Anzeige mit Benchmark]
```

---

## Schritt 5 — Kosten

### Wohnung

```
HAUSGELD WOHNUNG
  Hausgeld gesamt/Monat *: [Währungsfeld]

  [Toggle] Aufteilen
  └─ Wenn aktiv:
       davon umlagefähig/Monat *:         [Währungsfeld]
       davon Instandhaltungsrücklage/Monat: [Währungsfeld]
       davon nicht umlagefähig/Monat:     [readonly = gesamt - umlagef. - rücklage]
       ⚠ Validierung: umlagefähig + rücklage ≤ gesamt

  ⚠ Info wenn nicht aufgeteilt: "Hausgeld aufteilen für genaue steuerliche Berechnung"

Grundsteuer Wohnung/Jahr *: [Währungsfeld]
Hausverwaltung/Jahr:        [Währungsfeld]
Gebäudeversicherung/Jahr (sep.): [Währungsfeld]
Sonstige Kosten/Monat:      [Währungsfeld]
```

### Stellplatz (nur wenn hasParking = true)

```
HAUSGELD STELLPLATZ
  Hausgeld Stellplatz gesamt/Monat: [Währungsfeld]

  [Toggle] Aufteilen
  └─ Wenn aktiv:
       davon umlagefähig/Monat:         [Währungsfeld]
       davon Instandhaltungsrücklage/Monat: [Währungsfeld]
       davon nicht umlagefähig/Monat:   [readonly = gesamt - umlagef. - rücklage]

Grundsteuer Stellplatz/Jahr: [Währungsfeld]
```

### Zusammenfassung (readonly)

```
Nicht umlagefähige Kosten Wohnung/Monat: XXX €  (fett)
```

---

## Schritt 6 — Finanzierung

```
Darlehensbetrag *:      [Währungsfeld]
Zinssatz *:             [Prozentfeld]
Tilgungssatz *:         [Prozentfeld]
Zinsbindung (Jahre) *:  [Stepper 1–30]
Darlehensbeginn *:      [DatePicker]
Tatsächliche Rate (optional): [Währungsfeld]

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
Berechnete Monatsrate:  X.XXX €
Zinsen/Monat:           XXX €
Tilgung/Monat:          XXX €
Anfangs-LTV:            XX%  (mit Benchmark-Farbe)
```

---

## Schritt 7 — AfA & Steuer

```
Gebäudewert (aus Regierungs-Excel) *: [Währungsfeld]
Grundstückswert (aus Regierungs-Excel) *: [Währungsfeld]
AfA-Satz *:             [Prozentfeld]  z.B. 2% (Altbau) oder 3% (Neubau ab 2023)
Grenzsteuersatz *:      [Prozentfeld]

⚠ Warnung wenn |Gebäude + Grund - Kaufpreis| > 5%: "Werte aus dem Regierungs-Excel prüfen"

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
AfA-Basis:              XXX.XXX €  (= Gebäudewert + renovationAfaEligible)
AfA / Jahr:             XX.XXX €
AfA / Monat:            X.XXX €
```

---

## Schritt 8 — Status-Onboarding (konditionell)

Erscheint wenn `economicTransferDate.firstDayOfMonth <= Date().firstDayOfMonth`.

```
"Seit wann ist die Immobilie in deinem Besitz? Gib den ersten Status ein."

Datum *:    [DatePicker]  (Standardwert = economicTransferDate)
Status *:   [Picker]
  Vermietet
  Leerstand
  Leerstand + Mietgarantie
  Eigennutzung
  Renovierung

Einnahme/Monat: [Währungsfeld]   ← NUR anzeigen wenn Status = Mietgarantie
Notizen:        [Textfeld]
```

---

## Wizard-Container (`AddPropertyWizard.swift`)

**Navigation:**
- "Weiter" → nächster Schritt
- "Zurück" → vorheriger Schritt
- "Fertigstellen" nur im letzten Schritt, aktiviert wenn `state.canFinish = true`
- Fortschrittsbalken (X / N Schritte)

**`canFinish` Bedingungen:**
```swift
!name.isEmpty && !address.isEmpty && !city.isEmpty
&& purchasePriceUnit > 0 && coldRentMonthly > 0
&& loanAmount > 0 && interestRate > 0 && amortizationRate > 0
&& buildingValue > 0 && landValue > 0
```

**`saveProperty()`** — Mapping WizardState → Property:
- Alle Felder direkt übernehmen
- Wenn `firstStatus` gesetzt: StatusEntry mit `firstStatusDate` anlegen
- `monthlyMortgageActual` nur setzen wenn `> 0`, sonst `nil`
