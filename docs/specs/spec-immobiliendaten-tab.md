# Immobiliendaten-Tab

Alle bearbeitbaren Felder einer Immobilie. Gleiche Felder, Validierung und UI-Struktur wie Property Setup — mit linker Navigation und identischen Abschnitten.

**Unterschiede zu Property Setup:**
- Abschnitte statt nummerierter Schritte — alle direkt anwählbar, kein Weiter/Zurück
- Kein Status-Onboarding (→ Verlauf-Tab)
- Zusätzlich: Abschnitt "Annahmen" (Leerstandsquote, Marktmiete)
- Zusätzlich: Abschnitt "Gefahrenzone" (Immobilie löschen)
- **Auto-save via `.onChange`** — bei jeder Feldänderung sofort persistiert, kein expliziter Speichern-Button

---

## Layout (`ImmobiliendatenView.swift`)

```
┌──────────────────┬──────────────────────────────┐
│  Stammdaten      │                              │
│  Objektdaten     │       Abschnitt-Inhalt        │
│    Fotos         │                              │
│  Kauf            │                              │
│  Einnahmen       │                              │
│  Annahmen        │                              │
│  Kosten          │                              │
│  Finanzierung    │                              │
│  AfA & Steuer    │                              │
│  Gefahrenzone    │                              │
└──────────────────┴──────────────────────────────┘
```

**Linke Navigation:**
- Alle Abschnitte direkt anklickbar
- Aktiver Abschnitt hervorgehoben (Akzentfarbe)
- Kein Blockieren — Nutzer kann frei springen

---

## Stammdaten

```
Name *:         [Textfeld]
Adresse *:      [Textfeld]
Stadt *:        [Textfeld]
PLZ:            [Textfeld]
Bundesland:     [Textfeld]
Typ:            [Picker]   Eigentumswohnung / Einfamilienhaus / Mehrfamilienhaus / Gewerbe / Grundstück / Sonstiges
Erwerb:         [Picker]   Kauf / Erbschaft / Schenkung
Baujahr:        [Textfeld]
Notizen:        [Textfeld, mehrzeilig]
```

---

## Objektdaten

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
- Keine Fotos → Placeholder mit Immobilientyp-Icon
```

`parkingType` ist non-optional — Default ist `.nichtVorhanden`. Alle Stellplatz-Felder erscheinen nur wenn `parkingType != .nichtVorhanden`.

---

## Kauf & Nebenkosten

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

## Einnahmen

```
Nettomiete/Monat *:       [Währungsfeld]   → coldRentMonthly
Bruttomiete/Monat:        [Währungsfeld]   → warmmieteMonthly (optional, vereinbarte Warmmiete inkl. NK)
Parkingmiete/Monat:       [Währungsfeld]   ← nur wenn parkingType != .nichtVorhanden
Sonstige Einnahmen/Monat: [Währungsfeld]

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
Nettomiete / Jahr:  XX.XXX €    ← coldRentMonthly × 12
Bruttomiete / Jahr: XX.XXX €    ← warmmieteMonthly × 12 (nur wenn gesetzt)
Bruttorendite:      X,XX%
```

---

## Annahmen

Felder die nicht zu den Kaufdaten gehören, aber KPI-Berechnungen und Vergleiche beeinflussen.

```
Leerstandsquote:  [Prozentfeld]   z.B. 3% — für NOI, Nettorendite
Marktmiete/m²:    [Währungsfeld]  informativ — Vergleich mit eigener Kaltmiete
  → readonly: "Deine Miete liegt X% über/unter Markt"

Aktueller Marktwert:
  [/m²]  [Gesamt]   ← kleiner Switcher
  Wenn /m²:    [Währungsfeld]  → wird intern als currentMarketValue = Wert × livingAreaSqm gespeichert
  Wenn Gesamt: [Währungsfeld]  → wird direkt als currentMarketValue gespeichert
  → readonly: "Wertsteigerung: +XX.XXX € (+X,X%) seit Kauf"
```

**Switcher-Logik:**
- Switcher-Zustand ist in-memory (kein persistierter Preference)
- Beide Modi zeigen denselben gespeicherten Wert (`currentMarketValue`) — nur Eingabe und Anzeige unterscheiden sich
- Bei Wechsel des Modus wird der angezeigte Wert automatisch umgerechnet

---

## Kosten

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

  ⚠ Info wenn nicht aufgeteilt: "Steuerliche Berechnung ungenau — Hausgeld wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung aufteilen."

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
  └─ Wenn aktiv:
       davon umlagefähig/Monat:             [Währungsfeld]  → hoaFeeParkingRecoverableMonthly
       davon Instandhaltungsrücklage/Monat: [Währungsfeld]  → hoaFeeParkingMaintenanceReserveMonthly
       davon nicht umlagefähig/Monat:       [readonly = gesamt − umlagef. − rücklage]

  ⚠ Info wenn nicht aufgeteilt: "Steuerliche Berechnung ungenau — Hausgeld Stellplatz wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung aufteilen."

Grundsteuer Stellplatz/Jahr: [Währungsfeld]
```

### Zusammenfassung (readonly)

```
Nicht umlagefähige Kosten Wohnung/Monat: XXX €  (fett)
```

---

## Finanzierung

```
Darlehensbetrag *:            [Währungsfeld]
Zinssatz *:                   [Prozentfeld]
Tilgungssatz *:               [Prozentfeld]
Zinsbindung (Jahre) *:        [Stepper 1–30]
Darlehensbeginn *:            [DatePicker]
Monatsrate:                   [Währungsfeld]  ← vorausgefüllt mit loanAmount × (zins + tilgung) / 12, editierbar

━━━━ EIGENKAPITAL ━━━━
Eigenkapital eingebracht:     [Währungsfeld]  → equityContributed
Eigenprovisions-Vereinbarung: [Währungsfeld]  → brokerCommissionAgreement
  ⓘ "Maklerkosten aus separater Vereinbarung — Anschaffungsnebenkosten, erhöht AfA-Basis"

━━━━ ZUSAMMENFASSUNG (readonly) ━━━━
Berechnete Monatsrate:  X.XXX €   (= loanAmount × (interestRate + amortizationRate) / 12)
Zinsen/Monat:           XXX €
Tilgung/Monat:          XXX €
Eigenkapital (genutzt): XX.XXX €  (= Gesamtinvestment − Darlehen)
Anfangs-LTV:            XX%       (mit Benchmark-Farbe)
```

---

## AfA & Steuer

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

## Gefahrenzone

```
[Button: Immobilie löschen]  → Confirmation Dialog
  "Diese Immobilie und alle zugehörigen Daten (Statusverlauf, außergewöhnliche Kosten)
   werden unwiderruflich gelöscht."
```
