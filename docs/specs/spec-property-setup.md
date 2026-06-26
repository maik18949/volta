# Property Setup — Immobilie anlegen

**Schritt-Anzahl:** 7 Schritte (+ optionaler Schritt 8 wenn Besitzübergang in der Vergangenheit liegt)

**Darstellung:** Eigene Seite (NavigationStack), kein Modal. Der Setup-Flow ist zu umfangreich für ein Sheet — 7–8 Schritte mit Seitennavigation brauchen den vollen Bildschirm.

---

## Schritte im Überblick

| # | Name | Pflicht-Felder | Konditionell |
|---|------|----------------|--------------|
| 1 | Stammdaten | Name, Adresse, Stadt | — |
| 2 | Objektdaten | Wohnfläche | — |
| 3 | Kauf & Nebenkosten | Kaufpreis WE, Wirtschaftlicher Übergang | Kaufpreis TE wenn parkingType != .nichtVorhanden |
| 4 | Einnahmen | Kaltmiete | Parkingmiete wenn parkingType != .nichtVorhanden |
| 5 | Kosten | Hausgeld WE, Grundsteuer WE | Stellplatz-Felder wenn parkingType != .nichtVorhanden |
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

Stellplatz: [Picker]
  Nicht vorhanden   ← Default (.nichtVorhanden)
  Tiefgarage
  Außenstellplatz
  Garage

Heizung:            [Picker, optional]
Energieklasse:      [Picker, optional]
Zustand:            [Picker, optional]
Letzte Renovierung: [Textfeld Jahr, optional]

━━━━ FOTOS ━━━━
[Foto-Grid: 3 Spalten, quadratische Thumbnails]
  + Foto hinzufügen   ← iOS PHPicker / Kamera
  Max. 15 Fotos

Regeln:
- Erstes Foto wird automatisch Titelbild (Cover-Icon ⭐)
- Tippen auf Foto: Optionen "Titelbild setzen" / "Löschen"
- Titelbild wird in Immobilienliste und Übersicht-Tab angezeigt
- Keine Fotos → kein Foto-Bereich sichtbar (nur "+ Foto hinzufügen" Button)
```

`parkingType` ist non-optional — Default ist `.nichtVorhanden`. Alle Stellplatz-Felder in späteren Schritten erscheinen nur wenn `parkingType != .nichtVorhanden`.

---

## Schritt 3 — Kauf & Nebenkosten

```
Kaufdatum:                   [DatePicker]
Wirtschaftlicher Übergang *: [DatePicker]  ← Besitzübergang, AfA-Startpunkt

━━━━ KAUFPREIS ━━━━

Wenn parkingType == .nichtVorhanden:
  Kaufpreis *: [Währungsfeld]  → purchasePriceUnit

Wenn parkingType != .nichtVorhanden:
  Kaufpreis Wohnung *:    [Währungsfeld]  → purchasePriceUnit
  Kaufpreis Stellplatz *: [Währungsfeld]  → purchasePriceParking
  Gesamtkaufpreis:        [readonly = WE + TE]

━━━━ KAUFNEBENKOSTEN ━━━━
Grunderwerbsteuer:           [Währungsfeld]
Notarkosten:                 [Währungsfeld]
Grundbuchkosten:             [Währungsfeld]
Maklerprovision:             [Währungsfeld]  → agentFee
Gutachterkosten:             [Währungsfeld]
Renovierung gesamt:          [Währungsfeld]
davon aktivierungspflichtig: [Währungsfeld]  → renovationAfaEligible

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
Kaufpreis:          XXX.XXX €
+ Kaufnebenkosten:  XX.XXX €
+ Renovierung:      XX.XXX €
= Gesamtinvestment: XXX.XXX €  (fett)
```

---

## Schritt 4 — Einnahmen

```
Nettomiete/Monat *:       [Währungsfeld]   → coldRentMonthly
Bruttomiete/Monat:        [Währungsfeld]   → warmmieteMonthly (optional, vereinbarte Warmmiete inkl. NK)
Parkingmiete/Monat:       [Währungsfeld]   ← nur wenn parkingType != .nichtVorhanden
Sonstige Einnahmen/Monat: [Währungsfeld]

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
Nettomiete / Jahr:        XX.XXX €         ← coldRentMonthly × 12
Bruttomiete / Jahr:       XX.XXX €         ← warmmieteMonthly × 12 (nur wenn gesetzt)

[Wenn Kaufpreis + Miete bekannt: live Bruttorendite-Anzeige mit Benchmark]
```

**Leerstandsquote** und **Marktmiete/m²** sind keine Property-Setup-Eingaben — werden als Annahmen im Immobiliendaten-Tab gepflegt.

---

## Schritt 5 — Kosten

### Wohnung

```
HAUSGELD WOHNUNG
  Hausgeld gesamt/Monat *: [Währungsfeld]

  [Toggle] Aufteilen
  └─ Wenn aktiv:
       davon umlagefähig/Monat *:            [Währungsfeld]  → hoaFeeRecoverableMonthly
       davon Instandhaltungsrücklage/Monat:  [Währungsfeld]  → hoaFeeMaintenanceReserveMonthly
       davon nicht umlagefähig/Monat:        [readonly = gesamt − umlagef. − rücklage]
       ⚠ Validierung: umlagefähig + rücklage ≤ gesamt

  ⚠ Info wenn nicht aufgeteilt: "Hausgeld aufteilen für genaue steuerliche Berechnung"

Grundsteuer Wohnung/Jahr *:      [Währungsfeld]
Verwaltung/Jahr:                 [Währungsfeld]  → propertyManagementAnnual
Gebäudeversicherung/Jahr (sep.): [Währungsfeld]  → propertyInsuranceAnnual
Sonstige Kosten/Monat:           [Währungsfeld]
```

### Stellplatz (nur wenn parkingType != .nichtVorhanden)

```
HAUSGELD STELLPLATZ
  Hausgeld Stellplatz gesamt/Monat: [Währungsfeld]

  [Toggle] Aufteilen
  ⓘ "Hausgeld aufteilen, wenn der Mietvertrag eine Nebenkostenvereinbarung für den Stellplatz enthält."
  └─ Wenn aktiv:
       davon umlagefähig/Monat:            [Währungsfeld]  → hoaFeeParkingRecoverableMonthly
       davon Instandhaltungsrücklage/Monat: [Währungsfeld] → hoaFeeParkingMaintenanceReserveMonthly
       davon nicht umlagefähig/Monat:      [readonly = gesamt − umlagef. − rücklage]

Grundsteuer Stellplatz/Jahr: [Währungsfeld]
```

### Zusammenfassung (readonly)

```
Nicht umlagefähige Kosten Wohnung/Monat: XXX €  (fett)
```

---

## Schritt 6 — Finanzierung

```
Darlehensbetrag *:          [Währungsfeld]
Zinssatz *:                 [Prozentfeld]
Tilgungssatz *:             [Prozentfeld]
Zinsbindung (Jahre) *:      [Stepper 1–30]
Darlehensbeginn *:          [DatePicker]
Monatsrate:                 [Währungsfeld]  ← vorausgefüllt mit loanAmount × (zins + tilgung) / 12, editierbar

━━━━ EIGENKAPITAL ━━━━
Eigenkapital eingebracht *: [Währungsfeld]  → equityContributed
Eigenprovisions-Vereinbarung: [Währungsfeld] → brokerCommissionAgreement
  ⓘ "Maklerkosten aus separater Vereinbarung — Anschaffungsnebenkosten, erhöht AfA-Basis"

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
Berechnete Monatsrate:  X.XXX €   (= loanAmount × (interestRate + amortizationRate) / 12)
Zinsen/Monat:           XXX €
Tilgung/Monat:          XXX €
Eigenkapital (genutzt): XX.XXX €  (= Gesamtinvestment − Darlehen)
Anfangs-LTV:            XX%       (mit Benchmark-Farbe)
```

**Hinweis `equityContributed`:** Eigenkapital das der Nutzer selbst eingebracht hat. `equityUsed` (berechnet = Gesamtinvestment − Darlehen) sollte `equityContributed + brokerCommissionAgreement` ergeben.

---

## Schritt 7 — AfA & Steuer

```
Gebäudewert (aus Regierungs-Excel) *:     [Währungsfeld]
Grundstückswert (aus Regierungs-Excel) *: [Währungsfeld]
AfA-Satz *:        [Prozentfeld]  z.B. 2% (Altbau) oder 3% (Neubau ab 2023)
Grenzsteuersatz *: [Prozentfeld]

⚠ Warnung wenn |Gebäude + Grund − Kaufpreis| > 5%: "Werte aus dem Regierungs-Excel prüfen"

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
AfA-Bemessungsgrundlage: XXX.XXX €
  = Gebäudewert + (Nebenkosten × Gebäudewert / Kaufpreis) + aktivierungspfl. Renovierung
AfA / Jahr:              XX.XXX €
AfA / Monat:             X.XXX €
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

## Property Setup Container (`PropertySetupView.swift`)

**Layout (eigene Seite, NavigationStack):**
```
┌─────────────────┬──────────────────────────────┐
│  1  Stammdaten  │                              │
│  2  Objektdaten │       Schritt-Inhalt          │
│  3  Kauf        │                              │
│  4  Einnahmen   │                              │
│  5  Kosten      │                              │
│  6  Finanzierung│                              │
│  7  AfA & Steuer│                              │
│  8  Status      │  [Zurück]        [Weiter]    │
└─────────────────┴──────────────────────────────┘
```

Aufruf: Vom Hauptscreen über einen "+" Button → pusht `PropertySetupView` auf den NavigationStack. Kein `.sheet` / kein `.fullScreenCover`.

**Linke Navigation:**
- Alle Schritte sind direkt anklickbar
- Aktiver Schritt hervorgehoben (Akzentfarbe)
- Bereits besuchte Schritte: normal anklickbar
- Noch nicht besuchte Schritte: anklickbar aber visuell gedimmt
- Kein Blockieren — Nutzer kann frei springen

**Buttons (unten rechts im Schritt-Inhalt):**
- "Zurück" → vorheriger Schritt
- "Weiter" → nächster Schritt
- "Fertigstellen" nur im letzten Schritt, aktiviert wenn `state.canFinish = true`

**`canFinish` Bedingungen:**
```swift
!name.isEmpty && !address.isEmpty && !city.isEmpty
&& purchasePriceUnit > 0 && economicTransferDate != nil
&& coldRentMonthly > 0
&& loanAmount > 0 && interestRate > 0 && amortizationRate > 0
&& buildingValue > 0 && landValue > 0
```

**`saveProperty()`** — Mapping `PropertySetupState` → `Property`:
- Alle Felder direkt übernehmen
- `monthlyMortgage` direkt speichern (vorausgefüllter oder manuell eingegebener Wert)
- Wenn `firstStatus` gesetzt: StatusEntry mit `firstStatusDate` anlegen
