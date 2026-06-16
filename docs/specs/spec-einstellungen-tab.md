# Einstellungen-Tab (SettingsTab)

Alle bearbeitbaren Felder einer Immobilie. Identische Felder und Logik wie im Wizard — kein Unterschied in Feldstruktur oder Hausgeld-Split-Logik.

---

## Abschnitte

### Stammdaten

```
Name *:             [Textfeld]
Adresse *:          [Textfeld]
Stadt *:            [Textfeld]
PLZ:                [Textfeld]
Bundesland:         [Textfeld]
Typ:                [Picker]
```

---

### Kauf & Nebenkosten

```
Kaufpreis Wohnung *:         [Währungsfeld]
Kaufpreis Stellplatz:        [Währungsfeld]   nur wenn hasParking
Grunderwerbsteuer:           [Währungsfeld]
Notarkosten:                 [Währungsfeld]
Grundbuchkosten:             [Währungsfeld]
Maklerprovision:             [Währungsfeld]
Gutachterkosten:             [Währungsfeld]
Renovierung gesamt:          [Währungsfeld]
davon aktivierungspflichtig: [Währungsfeld]
Wirtschaftlicher Übergang *: [DatePicker]
```

---

### Einnahmen (Prognose)

```
Kaltmiete/Monat *:              [Währungsfeld]
Parkingmiete/Monat:             [Währungsfeld]   nur wenn hasParking
Sonstige Einnahmen/Monat:       [Währungsfeld]
Leerstandsquote (Annahme):      [Prozentfeld]
```

---

### Laufende Kosten

#### Wohnung

```
Hausgeld gesamt/Monat *:                    [Währungsfeld]

[Toggle] Aufteilen
└─ Wenn aktiv:
     davon umlagefähig/Monat *:             [Währungsfeld]
     davon Instandhaltungsrücklage/Monat:   [Währungsfeld]
     davon nicht umlagefähig/Monat:         [readonly = gesamt - umlagef. - rücklage]
     ⚠ Validierung: umlagefähig + rücklage ≤ gesamt

Grundsteuer Wohnung/Jahr *:                 [Währungsfeld]
Hausverwaltung/Jahr:                        [Währungsfeld]
Gebäudeversicherung/Jahr:                   [Währungsfeld]
Sonstige Kosten/Monat:                      [Währungsfeld]
Instandhaltungsrücklage/Monat (sep., außerh. WEG): [Währungsfeld]
```

#### Stellplatz (nur wenn hasParking = true)

```
[Toggle] Stellplatz vorhanden   ← Master-Toggle, setzt hasParking

Wenn hasParking:
  Hausgeld Stellplatz gesamt/Monat:         [Währungsfeld]

  [Toggle] Aufteilen
  └─ Wenn aktiv:
       davon umlagefähig/Monat:             [Währungsfeld]
       davon Instandhaltungsrücklage/Monat: [Währungsfeld]
       davon nicht umlagefähig/Monat:       [readonly]

  Grundsteuer Stellplatz/Jahr:              [Währungsfeld]
```

---

### Finanzierung

```
Darlehensbetrag *:       [Währungsfeld]
Zinssatz *:              [Prozentfeld]
Tilgungssatz *:          [Prozentfeld]
Zinsbindung (Jahre) *:   [Stepper 1–30]
Darlehensbeginn *:       [DatePicker]
Tatsächliche Rate (optional): [Währungsfeld]
```

---

### AfA & Steuer

```
Gebäudewert (Excel) *:   [Währungsfeld]
Grundstückswert (Excel) *: [Währungsfeld]
AfA-Satz *:              [Prozentfeld]
Grenzsteuersatz *:       [Prozentfeld]
```

---

### Hinweise (automatisch)

Erscheinen nur wenn Bedingung erfüllt:

```
⚠ Gebäudewert + Grundstückswert weicht um X% vom Kaufpreis ab (Toleranz: 5%).
⚠ Darlehensbetrag übersteigt den Kaufpreis (Vollfinanzierung inkl. Nebenkosten).
```

---

### Gefahr

```
[Button: Immobilie löschen]  → Confirmation Dialog
```

---

## Unterschiede zu Wizard

| Aspekt | Wizard | Einstellungen |
|--------|--------|---------------|
| Stellplatz-Toggle | Schritt 3 (Kauf) | Abschnitt "Laufende Kosten" |
| Hausgeld-Split | Schritt 5 | Abschnitt "Laufende Kosten" |
| Status-Onboarding | Schritt 8 | nicht vorhanden (→ StatusHistory-Tab) |
| Zusammenfassungen | je Schritt | nicht vorhanden |
| Löschen | nicht möglich | vorhanden |

**Felder und Validierungslogik sind identisch.** Was der Nutzer im Wizard eingibt, ist in den Einstellungen exakt so wiederzufinden und bearbeitbar.
