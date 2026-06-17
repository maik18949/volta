# Verlauf-Tab

Verwaltet den Statusverlauf der Immobilie. Gemeinsame Datenquelle für Steuer-Tab und Cashflow-Tab.

---

## Zweck

Der Statusverlauf beschreibt wann die Immobilie in welchem Zustand war. Beide Tabs lesen daraus:

- **Steuer-Tab** → Leerstandstage für anteilige Absetzbarkeit umlagefähiger Kosten
- **Cashflow-Tab** → tatsächliche Einnahmen pro Monat (inkl. Mietgarantie-Beträge)

---

## Layout

Eine Glass-Card mit chronologisch sortierten StatusEntries (neueste oben).

```
STATUSVERLAUF

[+ Status hinzufügen]                          ← Button oben rechts

────────────────────────────────
● Vermietet                     seit 15.04.2025
────────────────────────────────
● Leerstand                     01.03.2025 – 14.04.2025   (45 Tage)
────────────────────────────────
● Vermietet                     01.01.2025 – 28.02.2025
────────────────────────────────
  ...
```

Jede Zeile zeigt:
- Status-Badge (farbig)
- Startdatum
- Enddatum (= Startdatum des nächsten Eintrags) und Dauer in Tagen
- Bei Mietgarantie: Garantiebetrag / Monat

---

## Status-Optionen

| Status | Badge-Farbe | Beschreibung |
|--------|-------------|--------------|
| Vermietet | Grün | Reguläre Vermietung |
| Leerstand | Orange | Keine Einnahmen, Owner trägt alle Kosten |
| Leerstand + Mietgarantie | Lila | Keine Mieter, aber Garantiezahlung |
| Eigennutzung | Blau | Selbst bewohnt |
| Renovierung | Grau | In Umbau / nicht vermietbar |

---

## Status hinzufügen / bearbeiten

Sheet von unten:

```
Datum *:        [DatePicker]
Status *:       [Picker]
Einnahme/Monat: [Währungsfeld]   ← NUR wenn Status = Mietgarantie
Notizen:        [Textfeld]
```

**Validierung:** Datum darf nicht vor `economicTransferDate` liegen.

---

## Datenmodell

```swift
@Model class StatusEntry {
    var date: Date                    // Startdatum dieses Status
    var status: PropertyStatus
    var incomeActualMonthly: Double?  // nur für .mietgarantie
    var notes: String
}
```

Enddatum wird immer aus dem Startdatum des nächsten Eintrags abgeleitet — nicht gespeichert.

---

## Details folgen

- Bearbeiten / Löschen einzelner Einträge
- Rückwirkende Korrekturen
- Navigation: Details noch offen
