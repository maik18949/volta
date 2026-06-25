# Übersicht-Tab (OverviewTab)

Zeigt auf einen Blick: aktueller Status, Cashflow, Renditekennzahlen, Finanzierung, Objektdaten.

---

## Fixe KPI-Leiste (oberhalb der Cards)

Immer sichtbar, auch beim Scrollen. 4 kompakte Kennzahlen nebeneinander.

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ CF NACH      │ NETTO-       │ CASH-ON-     │ DSCR         │
│ STEUERN      │ RENDITE      │ CASH         │              │
│ +215 €       │ 3,8 %        │ 3,2 %        │ 0,97         │
│ vor St.: +8€ │ Brutto: 4,9% │              │ [Schlecht]   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

| Slot | KPI | Warum |
|------|-----|-------|
| 1 | CF nach Steuern / Monat | Operativ wichtigste Zahl — wie viel bleibt wirklich übrig |
| 2 | Nettorendite | Beste Vergleichskennzahl für Performance |
| 3 | Cash-on-Cash | Wie gut arbeitet das eingesetzte Eigenkapital — wichtigster Vergleich zu anderen Anlageformen |
| 4 | DSCR | Risiko-Indikator — unter 1,0 trägt die Immobilie sich nicht selbst |

**Subtext je Slot:**
- CF nach Steuern: "vor St.: [±X €]"
- Nettorendite: "Brutto: X,X%"
- Cash-on-Cash: kein Subtext
- DSCR: Benchmark-Chip (gut/ok/schlecht) statt Subtext

**Styling:**
- Hintergrund: weiße Leiste, kein Glass-Effekt, leichter Schatten unten
- Label: 10px 700 UPPERCASE `#475569`
- Wert: 18px 800, grün/rot je nach Vorzeichen (CF) oder neutral
- Subtext: 11px `#94a3b8`

---

## Header — Titelbild

Über den Cards: vollbreites Titelbild der Immobilie.

```
┌─────────────────────────────────────────────────┐
│                                                 │
│           [Titelbild — PropertyPhoto            │
│            mit isCoverPhoto = true]             │
│           Höhe: ~200pt, edge-to-edge            │
│                                                 │
└─────────────────────────────────────────────────┘
```

- Kein Titelbild gesetzt → erstes Foto der Immobilie
- Keine Fotos → Placeholder-Gradient mit Immobilientyp-Icon (zentriert)
- Bild lädt aus dem App-Dokumentenordner (filePath)

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

**Empty State (kein StatusEntry vorhanden):**
```
AKTUELLER STAND

Noch kein Status vorhanden.
[+ Ersten Status hinzufügen]   ← führt zum Verlauf-Tab
```
Cashflow-Zeilen werden ausgeblendet bis mindestens ein StatusEntry existiert.

---

### Card 2 — Rendite & Investment

```
RENDITE & INVESTMENT

Bruttorendite        X,X%      [●]   ← farbiger KPI-Chip
Nettorendite         X,X%      [●]
Cash-on-Cash         X,X%      [●]
Kaufpreisfaktor      XX,X×     [●]
DSCR (NOI)           X,XX      [●]
LTV                  XX,X%     [●]
Tats. Leerstandsquote X,X%     [●]

──── Investment ────
Gesamtinvestment     XXX.XXX €
Eigenkapital         XXX.XXX €
NOI / Jahr           XX.XXX €
Break-Even-Miete     XXX €

──── Marktwert ────
Aktueller Marktwert  XXX.XXX €   (nur anzeigen wenn currentMarketValue gesetzt)
Wertsteigerung       +XX.XXX €   (+X,X%) seit Kauf
```

**Layout:** 2-spaltige KPI-Zeilen (Label links, Wert + Chip + ⓘ rechts). Das ⓘ-Icon steht pro KPI-Zeile — Tippen öffnet ein Bottom Sheet mit Name, Formel, Bedeutung und Benchmark-Tabelle für genau diesen KPI.

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

**Kein Kredit (`loanAmount = 0`):**
```
FINANZIERUNG

Keine Finanzierung erfasst.
```
Card wird angezeigt aber mit Hinweistext — nicht ausgeblendet.

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

## KPI-Chips — rot/orange/grün

Jeder KPI-Wert hat einen farbigen Punkt ● rechts daneben. Tippen auf den ⓘ Info-Icon öffnet ein Bottom Sheet mit:
- Name + Formel
- Was der Wert bedeutet
- Benchmark-Tabelle (grün / orange / rot)

### Benchmark-Tabelle

| KPI | Grün (gut) | Orange (ok) | Rot (schlecht) |
|-----|-----------|-------------|----------------|
| Bruttorendite | ≥ 5% | 3–5% | < 3% |
| Nettorendite | ≥ 4% | 2–4% | < 2% |
| Cash-on-Cash | ≥ 6% | 3–6% | < 3% |
| Kaufpreisfaktor | ≤ 20× | 20–25× | > 25× |
| DSCR (NOI) | ≥ 1,25 | 1,0–1,25 | < 1,0 |
| LTV | ≤ 70% | 70–80% | > 80% |
| Tats. Leerstandsquote | ≤ 3% | 3–8% | > 8% |

**Chip-Farben:**
- Grün: `Color.green` (systemGreen)
- Orange: `Color.orange` (systemOrange)
- Rot: `Color.red` (systemRed)

---

## Vollständige Felder-Liste nach Priorität

| Priorität | Feld | Wo |
|-----------|------|----|
| 0 | Titelbild | Header |
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
| 2 | Tats. Leerstandsquote | Card 2 |
| 2 | Gesamtinvestment | Card 2 |
| 2 | Eigenkapital | Card 2 |
| 2 | NOI / Jahr | Card 2 |
| 2 | Break-Even-Miete | Card 2 |
| 2 | Aktueller Marktwert + Wertsteigerung | Card 2 (wenn gesetzt) |
| 3 | Restschuld | Card 3 |
| 3 | Monatliche Rate | Card 3 |
| 3 | Zinsbindungsende | Card 3 |
| 4 | Adresse | Card 4 |
| 4 | Wohnfläche, Zimmer | Card 4 |
| 4 | Kaltmiete/m², Kaufpreis/m² | Card 4 |

---

## Was NICHT im Overview-Tab ist

- Steuerberechnung (→ Steuer-Tab)
- Cashflow-Tabelle monatlich (→ Cashflow-Tab)
- Alle bearbeitbaren Felder (→ Immobiliendaten-Tab)
- Tilgungsplan (→ Finanzierung-Tab)
