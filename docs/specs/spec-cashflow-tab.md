# Cashflow-Tab

Zeigt monatlichen Cashflow: oben eine Kompaktkarte für den Prognose-Monat, darunter die vollständige Jahrestabelle.

---

## Card 1 — Prognose-Monat (kompakt)

Typischer Monat bei Vollvermietung. Werte direkt aus Einstellungen — kein Ist.

```
PROGNOSE / MONAT

Cashflow nach Steuern:   [−24 € / Mon]        ← 22px, fett, rot oder grün
Vor Steuer: [−424 €]    Steuereffekt: [+399 €]  ← kleiner, rechts
```

---

## Card 2 — Jahrestabelle

Monatliche Übersicht für das laufende Jahr. **Kein horizontaler Scroll** — alle Spalten passen in die Breite.

### Spalten

```
Position | Jan | Feb | Mär | Apr | Mai | Jun | Jul | Aug | Sep | Okt | Nov | Dez | Ø Mon | Total
```

**Spaltenheader:** Monat-Kürzel + Status-Tag darunter (z.B. "Feb / Mietgarantie", "Jun / Vermietet").

Vergangene Monate = Ist-Werte. Laufender + zukünftige Monate = Projektion (grau markieren oder kursiv).

### Zeilen (in dieser Reihenfolge)

```
Miete
Kreditrate
Nicht umlagef. Kosten WE
Nicht umlagef. Kosten TE      ← nur wenn hasParking
Umlagef. Kosten WE
Umlagef. Kosten TE            ← nur wenn hasParking
Hausverwaltung
Grundsteuer WE
Grundsteuer TE                ← nur wenn hasParking
Instandhaltungsrücklage WE+TE
──── Zusammenfassung ────      (blauer Gradient-Trennstrich)
Cashflow vor Steuern          (fett)
Steuererstattung Ø / Mon      (blau)
Cashflow nach Steuern         (fett, rot oder grün)
```

### Letzte zwei Spalten

- **Ø Monat:** Durchschnitt über alle Eigentumsmonate im Jahr (nicht immer 12)
- **Total:** Jahressumme über alle Eigentumsmonate

Beide Spalten: leicht blaues Hintergrund-Tinting (`rgba(239,246,255,0.5)`).

### Wert-Regeln

- Einnahmen: grün
- Ausgaben: rot (als negativer Wert dargestellt: −XXX €)
- Kein Sonder-Hintergrund für statusabhängige Zeilen — nur Wert-Farbe
- Zahlen: SF Mono, rechtsbündig

### Steuererstattung

Monats-Durchschnitt aus dem Ist-Steuereffekt des laufenden Jahres:
`jährlicherSteuereffekt ÷ Eigentumsmonate`

Gleicher Wert in allen Monatsspalten (nicht tagesgenau je Monat).

---

## Datenbasis

| Spalte | Datenbasis |
|--------|-----------|
| Vergangene Monate | Vollständig Ist aus Statushistorie |
| Laufender Monat | Ist bis heute + Projektion ab morgen |
| Zukünftige Monate | Vollständig projiziert mit aktuellem Status |

Projektion = letzter bekannter Status wird fortgeschrieben.

---

## Zeilen-Details

| Zeile | Vermietet | Leerstand / sonst |
|-------|-----------|-------------------|
| Miete | coldRent + parkingRent | 0 oder Mietgarantie-Betrag |
| Kreditrate | immer (Zinsen + Tilgung) | immer |
| Nicht umlagef. Kosten WE | immer | immer |
| Umlagef. Kosten WE | 0 (Mieter zahlt) | Eigentümer trägt |
| Nicht umlagef. Kosten TE | immer (wenn hasParking) | immer |
| Umlagef. Kosten TE | Eigentümer trägt immer | Eigentümer trägt immer |
| Grundsteuer WE | 0 (NK-Abrechnung) | Eigentümer trägt |
| Grundsteuer TE | immer (wenn hasParking) | immer |
| Instandhaltungsrücklage | echter Cashflow-Abfluss | echter Cashflow-Abfluss |
