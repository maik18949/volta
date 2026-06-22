# Cashflow-Tab

Zeigt monatlichen Cashflow: oben eine Kompaktkarte für den Prognose-Monat, darunter die vollständige Jahrestabelle.

**Datenquellen:** Cashflow-Tab liest Statusverlauf und außergewöhnliche Kosten aus dem Verlauf-Tab. Diese werden dort verwaltet, nicht hier.

---

## Card 1 — Prognose-Monat (kompakt)

Typischer Monat bei wählbarem Szenario. Werte direkt aus Einstellungen — kein Ist.

```
PROGNOSE / MONAT

[Vollvermietung]  [Leerstand]                  ← Segmented Control / Toggle, Standard = Vollvermietung

Cashflow nach Steuern:   [−24 € / Mon]        ← 22px, fett, rot oder grün
Vor Steuer: [−424 €]    Steuereffekt: [+399 €]  ← kleiner, rechts
```

**Toggle-Logik:**
- `Vollvermietung`: Einnahmen = coldRentMonthly + parkingRentMonthly + otherIncomeMonthly; umlagef. Kosten WE/Grundsteuer WE = 0 (Mieter zahlt)
- `Leerstand`: Einnahmen = 0; umlagef. Kosten WE + Grundsteuer WE trägt der Owner (voll)

Toggle-Zustand bleibt dauerhaft erhalten — kein Reset beim Tab-Wechsel.

---

## Card 2 — Jahrestabelle

Monatliche Übersicht für ein wählbares Jahr. Standard = laufendes Jahr. Kein horizontaler Scroll — alle Spalten passen in die Breite.

```
[← 2024]  2025  [2026 →]    ← Jahr-Picker oben in Card 2
```

Nur Jahre ab `economicTransferDate.year` bis zum laufenden Jahr + 1 wählbar.

### Spalten

```
Position | Jan | Feb | Mär | Apr | Mai | Jun | Jul | Aug | Sep | Okt | Nov | Dez | Ø Mon | Total
```

**Spaltenheader:** Monat-Kürzel + Status-Badge darunter (z.B. "Feb / Mietgarantie", "Jun / Vermietet").

Vergangene Monate = Ist-Werte. Laufender + zukünftige Monate = Projektion (grau oder kursiv).

### Zeilen (in dieser Reihenfolge)

```
Einnahmen                          ← coldRentMonthly + parkingRentMonthly + otherIncomeMonthly
Kreditrate
──── Kosten Wohnung ────
Nicht umlagef. Kosten WE
Instandhaltungsrücklage WE
Gebäudeversicherung                ← nur wenn propertyInsuranceAnnual > 0
Verwaltung
Sonstige Kosten                    ← nur wenn otherCostsMonthly > 0
Umlagef. Kosten WE                 ← nur bei Leerstand / Mietgarantie
Grundsteuer WE                     ← nur bei Leerstand / Mietgarantie
──── Kosten Stellplatz ────         ← nur wenn parkingType != .nichtVorhanden
Nicht umlagef. Kosten TE
Instandhaltungsrücklage TE
Umlagef. Kosten TE
Grundsteuer TE
──── Außergewöhnliche Kosten ────   ← nur wenn im jeweiligen Monat vorhanden
[Beschreibung]                     ← je Eintrag eine Zeile, Betrag rot
──── Zusammenfassung ────           (blauer Gradient-Trennstrich)
Cashflow vor Steuern               (fett)
Steuererstattung Ø / Mon           (blau)
Cashflow nach Steuern              (fett, rot oder grün)
```

### Letzte zwei Spalten

- **Ø Monat:** Durchschnitt über alle Eigentumsmonate im Jahr
- **Total:** Jahressumme über alle Eigentumsmonate

**Außergewöhnliche Kosten in Ø Monat / Total:**
- Zeile "Total" für außergewöhnliche Kosten: immer anzeigen, sobald ≥ 1 Eintrag im Jahr
- Zeile "Ø Monat" für außergewöhnliche Kosten: nur anzeigen, wenn ≥ 2 Einträge im Jahr (sonst wäre Durchschnitt = Einzelwert und damit wenig aussagekräftig)

Beide Spalten: leicht blaues Hintergrund-Tinting (`rgba(239,246,255,0.5)`).

### Wert-Regeln

- Einnahmen: grün
- Ausgaben: rot (als negativer Wert: −XXX €)
- Zahlen: SF Mono, rechtsbündig

---

## Berechnungsformel — Cashflow

### Unterschied Cashflow vs Steuerliches Ergebnis

| Posten | Cashflow | Steuerliches Ergebnis |
|--------|----------|----------------------|
| Einnahmen | + | + |
| Zinsen | − | − (§9 EStG) |
| **Tilgung** | **−** | **Nein** — kein Werbungskosten |
| **Instandhaltungsrücklage** | **−** | **Nein** — erst bei WEG-Entnahme |
| Nicht umlagef. Kosten | − | − |
| **AfA** | **Nein** — kein Geldabfluss | **−** (§7 EStG) |
| Außergewöhnl. Kosten (absetzbar) | − | − |
| Außergewöhnl. Kosten (nicht absetzbar) | − | Nein |

### Was fließt wann?

| Zeile | Vermietet | Leerstand | Mietgarantie |
|-------|-----------|-----------|--------------|
| Einnahmen | coldRent + parkingRent + otherIncome | 0 | incomeActualMonthly |
| Kreditrate | − immer | − immer | − immer |
| Nicht umlagef. Kosten WE | − immer | − immer | − immer |
| Instandhaltungsrücklage WE | − immer | − immer | − immer |
| Gebäudeversicherung | − immer (wenn > 0) | − immer (wenn > 0) | − immer (wenn > 0) |
| Verwaltung | − immer | − immer | − immer |
| Sonstige Kosten | − immer (wenn > 0) | − immer (wenn > 0) | − immer (wenn > 0) |
| Umlagef. Kosten WE | **0** (Mieter zahlt) | − voll | − voll |
| Grundsteuer WE | **0** (Mieter zahlt) | − voll | − voll |
| Nicht umlagef. Kosten TE | − immer | − immer | − immer |
| Instandhaltungsrücklage TE | − immer | − immer | − immer |
| Umlagef. Kosten TE | − immer | − immer | − immer |
| Grundsteuer TE | − immer | − immer | − immer |
| Außergewöhnliche Kosten | − im jeweiligen Monat | − im jeweiligen Monat | − im jeweiligen Monat |

### Vollständige Formel

```
cashflowVorSteuerMonatlich =
    einnahmen                               // je Status (siehe Tabelle oben)
  − monthlyMortgage                         // Zinsen + Tilgung
  − hoaFeeNonRecoverableMonthly             // WE
  − hoaFeeMaintenanceReserveMonthly         // WE Rücklage
  − (propertyInsuranceAnnual / 12)          // nur wenn > 0
  − (propertyManagementAnnual / 12)
  − otherCostsMonthly                       // nur wenn > 0
  − hoaFeeRecoverableMonthly                // WE: nur bei Leerstand / Mietgarantie
  − (propertyTaxAnnual / 12)                // WE: nur bei Leerstand / Mietgarantie
  − hoaFeeParkingNonRecoverableMonthly      // TE: nur wenn Stellplatz
  − hoaFeeParkingMaintenanceReserveMonthly  // TE: nur wenn Stellplatz
  − hoaFeeParkingRecoverableMonthly         // TE: nur wenn Stellplatz
  − (propertyTaxParkingAnnual / 12)         // TE: nur wenn Stellplatz
  − extraordinaryCosts(month)               // Summe aller Einträge im Monat

cashflowNachSteuerMonatlich =
    cashflowVorSteuerMonatlich
  + monthlyTaxRefund
```

### Steuererstattung / Monat

```
monthlyTaxRefund = steuererstattungJahr / eigentumsMonate im Jahr
```

Gleicher Wert in allen Monatsspalten — kommt aus Steuer-Tab Berechnung für das **laufende Jahr**.

Prognose-Card (Card 1): Steuereffekt = ebenfalls aus laufendem Jahr — konsistent mit der Jahrestabelle.

---

### Kein StatusEntry vorhanden

Wenn noch kein StatusEntry existiert, zeigt Card 2 die **Prognose** (identisch zu Card 1 — Vollvermietung-Szenario aus den Einstellungen). Alle 12 Spalten zeigen denselben Prognosewert, grau/kursiv markiert als Projektion. Keine Ist-Werte.

---

## Datenbasis je Spalte

| Spalte | Einnahmen | Kosten |
|--------|-----------|--------|
| Vergangene Monate | Ist aus Statusverlauf | aktuelle Einstellungswerte |
| Laufender Monat | Ist bis heute + Projektion Rest | aktuelle Einstellungswerte |
| Zukünftige Monate | letzter bekannter Status fortgeschrieben | aktuelle Einstellungswerte |

Kosten kommen immer aus aktuellen Einstellungen — Hausgeld, Grundsteuer etc. ändern sich typischerweise nur zum Jahreswechsel.

---

## Warnungen

| Zustand | Anzeige |
|---------|---------|
| `isHoaUnitSplit = false` | ⚠ "Steuerliche Berechnung ungenau — Hausgeld wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung Hausgeld aufteilen (→ Einstellungen)" |
| `parkingType != .nichtVorhanden && !isHoaParkingSplit` | ⚠ "Steuerliche Berechnung ungenau — Hausgeld Stellplatz wird vollständig als Werbungskosten angesetzt. Für genaue Berechnung aufteilen (→ Einstellungen)" |
