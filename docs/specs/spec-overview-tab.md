# Übersicht-Tab (OverviewTab)

Zeigt auf einen Blick: aktueller Status, Cashflow, Renditekennzahlen, Finanzierung, Objektdaten.

---

## Layout — 4 Glass-Cards von oben nach unten

### Card 1 — Aktueller Stand

Aktuelle Situation der Immobilie. Die wichtigste Karte — immer ganz oben.

```
AKTUELLER STAND

[Status-Badge: Vermietet / Leerstand / Mietgarantie / ...]   seit [Datum des letzten StatusEntry]

──── Cashflow / Monat ────
Einnahmen                     [+X.XXX €]
Kreditrate                    [−X.XXX €]
Laufende Kosten               [−XXX €]
Cashflow vor Steuern          [−XXX €]  (fett)
Steuereffekt (Ø monatl.)      [+XXX €]  (blau)
Cashflow nach Steuern         [−XXX €]  (fett, 22px, rot oder grün)
```

**Datenbasis:** Werte aus aktuellem Monat (Ist + Projektion). Steuereffekt = jährlicher Steuereffekt laufendes Jahr ÷ Eigentumsmonate.

---

### Card 2 — Rendite & Investment

```
RENDITE & INVESTMENT

Bruttorendite        X,X%      [Benchmark-Chip]
Nettorendite         X,X%      [Benchmark-Chip]
Cash-on-Cash         X,X%      [Benchmark-Chip]
Kaufpreisfaktor      XX,X×     [Benchmark-Chip]
DSCR (NOI)           X,XX      [Benchmark-Chip]
LTV                  XX,X%     [Benchmark-Chip]

──── Investment ────
Gesamtinvestment     XXX.XXX €
Eigenkapital         XXX.XXX €
NOI / Jahr           XX.XXX €
Break-Even-Miete     XXX €
```

**Layout:** 2-spaltige KPI-Zeilen (Label links, Wert + Benchmark rechts), dann Investment-Zeilen darunter.

---

### Card 3 — Finanzierung

```
FINANZIERUNG

Darlehensbetrag      XXX.XXX €
Restschuld (heute)   XXX.XXX €
Monatliche Rate      X.XXX €
Zinssatz             X,XX%
Tilgungssatz         X,XX%
Zinsbindung bis      MM/YYYY   (noch X Jahre)
```

**Restschuld** wird aus dem AmortizationCalculator für den aktuellen Monat gelesen.

---

### Card 4 — Objekt

```
OBJEKT

[Adresse vollständig, 2 Zeilen wenn nötig]

Typ              [PropertyType]       Baujahr     [Jahr oder –]
Wohnfläche       [XX,X m²]            Zimmer      [X,X]
Kaltmiete/m²     [X,XX €/m²]          Kaufpreis/m² [X.XXX €/m²]
Energieklasse    [A+ / B / ...]       Zustand     [...]
Heizung          [...]                Stellplatz  [Tiefgarage / –]

[Notizen — nur anzeigen wenn nicht leer]
```

---

## Vollständige Felder-Liste nach Priorität

| Priorität | Feld | Wo |
|-----------|------|----|
| 1 | Aktueller Status + Datum | Card 1 |
| 1 | Cashflow nach Steuern / Monat | Card 1 |
| 1 | Cashflow vor Steuern / Monat | Card 1 |
| 1 | Steuereffekt / Monat | Card 1 |
| 2 | Bruttorendite | Card 2 |
| 2 | Nettorendite | Card 2 |
| 2 | Kaufpreisfaktor | Card 2 |
| 2 | Cash-on-Cash | Card 2 |
| 2 | DSCR | Card 2 |
| 2 | LTV | Card 2 |
| 2 | Gesamtinvestment | Card 2 |
| 2 | Eigenkapital | Card 2 |
| 3 | Restschuld | Card 3 |
| 3 | Monatliche Rate | Card 3 |
| 3 | Zinsbindungsende | Card 3 |
| 4 | Adresse | Card 4 |
| 4 | Wohnfläche, Zimmer | Card 4 |
| 4 | Kaltmiete/m², Kaufpreis/m² | Card 4 |

---

## Benchmark-Chips

Kleine farbige Tags rechts neben KPI-Wert: grün (gut) / gelb (ok) / rot (schlecht).  
Bestehende `BenchmarkContext`-Logik bleibt unverändert.

---

## Was NICHT im Overview-Tab ist

- Steuerberechnung (→ Steuer-Tab)
- Cashflow-Tabelle monatlich (→ Cashflow-Tab)
- Alle bearbeitbaren Felder (→ Einstellungen-Tab)
- Tilgungsplan (→ Finanzierung-Tab)
