# Verlauf-Tab

Verwaltet den Statusverlauf und außergewöhnliche Kosten der Immobilie. Gemeinsame Datenquelle für Steuer-Tab und Cashflow-Tab.

---

## Zweck

| Datenquelle | Wer liest |
|-------------|-----------|
| Statusverlauf (StatusEntry[]) | Steuer-Tab → Leerstandstage; Cashflow-Tab → tatsächliche Einnahmen |
| Außergewöhnliche Kosten (ExtraordinaryCost[]) | Cashflow-Tab → Abfluss; Steuer-Tab → wenn isDeductible |

---

## Layout — gemeinsamer Feed

Alle Einträge (Status + Kosten) chronologisch sortiert in einem Feed, neueste oben. Zwei separate Buttons zum Hinzufügen.

```
VERLAUF

[+ Status]  [+ Kosten]                         ← Buttons oben rechts

────────────────────────────────
● Vermietet                     seit 15.04.2025
────────────────────────────────
€ Vermietungsprovision          15.03.2025   −2.100 €   [absetzbar]
────────────────────────────────
● Leerstand                     01.03.2025 – 14.04.2025   (45 Tage)
────────────────────────────────
€ WEG Sonderumlage Dach         15.02.2025   −4.500 €   [nicht absetzbar]
────────────────────────────────
● Vermietet                     01.01.2025 – 28.02.2025
────────────────────────────────
```

StatusEntry und ExtraordinaryCost können dasselbe Datum haben — das ist erlaubt.

**Sortierung:** Alle Einträge (Status + Kosten) absteigend nach Datum (neueste oben). Bei gleichem Datum: Sortierung nach Erfassungszeitpunkt (`createdAt`) — zuletzt erfasster Eintrag erscheint zuerst.

---

## Status-Eintrag

### Anzeige im Feed

- Status-Badge (farbig)
- Startdatum
- Enddatum (= Startdatum des nächsten StatusEntry) + Dauer in Tagen
- Bei Mietgarantie: Garantiebetrag / Monat

### Status-Optionen

| Status | Badge-Farbe | Beschreibung |
|--------|-------------|--------------|
| Vermietet | Grün | Reguläre Vermietung |
| Leerstand | Orange | Keine Einnahmen, Owner trägt alle Kosten |
| Leerstand + Mietgarantie | Lila | Keine Mieter, aber Garantiezahlung |

### Hinzufügen / Bearbeiten

Sheet von unten:

```
Datum *:        [DatePicker]
Status *:       [Picker]
Einnahme/Monat: [Währungsfeld]   ← NUR wenn Status = Mietgarantie
Notizen:        [Textfeld]
```

### Validierung

- Zwei StatusEntries dürfen nicht dasselbe Datum haben → Fehlermeldung beim Speichern
- Datum darf nicht vor `economicTransferDate` liegen

### Empty State

Wenn keine StatusEntries vorhanden:

```
Noch kein Statusverlauf.
[+ Ersten Status hinzufügen]   ← Button
```

### Bearbeiten / Löschen

- Jeder Eintrag kann bearbeitet oder gelöscht werden (Fehleingabe möglich)
- Nach Änderung werden Steuer- und Cashflow-Berechnungen automatisch neu durchgeführt
- Beim Löschen des letzten Eintrags: Feed wird leer → Empty State erscheint

---

## Außergewöhnliche Kosten

### Anzeige im Feed

- €-Icon + Beschreibung
- Datum + Betrag (rot)
- Badge: "absetzbar" oder "nicht absetzbar"

### Hinzufügen / Bearbeiten

Sheet von unten:

```
Datum *:                  [DatePicker]
Beschreibung *:           [Textfeld]   z.B. "Vermietungsprovision", "WEG Sonderumlage"
Betrag *:                 [Währungsfeld]
Steuerlich absetzbar:     [Toggle]     Default = ein
Notizen:                  [Textfeld, optional]
```

### Steuerliche Absetzbarkeit

| Kosten | Absetzbar |
|--------|-----------|
| Vermietungsprovision | Ja — §9 EStG |
| Reparatur (nicht aktivierungspflichtig) | Ja — §9 EStG |
| Rechtskosten (Mietstreit) | Ja — §9 EStG |
| WEG Sonderumlage für Reparatur | Ja — §9 EStG |
| WEG Sonderumlage für Modernisierung | Nein — aktivierungspflichtig |

**Wirkung:**
- Immer: Cashflow-Abfluss im jeweiligen Monat
- Nur wenn `isDeductible = true`: reduziert steuerliches Ergebnis → erhöht Steuererstattung

### Bearbeiten / Löschen

- Jeder Eintrag kann bearbeitet oder gelöscht werden
- Kosten und StatusEntries können dasselbe Datum haben — erlaubt

---

## Datenmodelle

```swift
@Model class StatusEntry {
    var date: Date                    // Startdatum dieses Status
    var status: PropertyStatus
    var incomeActualMonthly: Double?  // nur für .mietgarantie
    var notes: String
}

@Model class ExtraordinaryCost {
    var date: Date
    var description: String
    var amount: Double
    var isDeductible: Bool            // steuerlich absetzbar (§9 EStG)?
    var notes: String?
}
```

Enddatum eines StatusEntry = Startdatum des nächsten Eintrags — nicht gespeichert.
