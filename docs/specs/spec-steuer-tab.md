# Steuer-Tab

Zeigt steuerliches Ergebnis nach §21 EStG für das laufende Jahr (Ist + Projektion) und eine Prognose für ein wählbares Jahr.

Eine Glass-Card mit zwei Sektionen, getrennt durch blauen Gradient-Divider.

**Datenquelle Statusverlauf:** Steuer-Tab liest den Statusverlauf aus dem Verlauf-Tab. Statusverlauf wird dort verwaltet, nicht hier.

---

## Sektion 1 — Laufendes Jahr

```
LAUFENDES JAHR YYYY                        [Badge: Ist]

(Jan–[letzter abg. Monat] tatsächlich · [akt. Monat] anteilig · Rest projiziert)

Einnahmen                         [X.XXX €]
Zinsen                            [X.XXX €]   amortisierend, ab Darlehensstart
AfA                               [X.XXX €]   anteilig im Erwerbsjahr, sonst voll
Nicht umlagef. Kosten Wohnung     [X.XXX €]
Gebäudeversicherung               [X.XXX €]   nur wenn propertyInsuranceAnnual > 0
Hausverwaltung                    [X.XXX €]
Umlagef. Kosten Wohnung           [X.XXX €]   × Leerstand-Tagesanteil
Grundsteuer Wohnung               [X.XXX €]   × Leerstand-Tagesanteil
Nicht umlagef. Kosten Stellplatz  [X.XXX €]   nur wenn parkingType != .nichtVorhanden
Umlagef. Kosten Stellplatz        [X.XXX €]   immer, nur wenn parkingType != .nichtVorhanden
Grundsteuer Stellplatz            [X.XXX €]   immer, nur wenn parkingType != .nichtVorhanden
──────── Steuerliches Ergebnis ────────
Steuerliches Ergebnis             [−X.XXX €]  (fett)
Steuereffekt / Mon                [+XXX €]    (22px, fett, grün oder rot)
```

**Laufendes Jahr** = Hybrid:
- Vergangene Monate → vollständig Ist aus Statusverlauf
- Aktueller Monat → Ist bis heute, Projektion ab morgen
- Zukünftige Monate im Jahr → letzter bekannter Status wird fortgeschrieben

---

## Divider

```css
height: 1.5px;
background: linear-gradient(90deg, rgba(59,130,246,0.35), transparent);
```

---

## Sektion 2 — Prognose

```
PROGNOSE                                   [Badge: Prognose]

Jahr: [← 2026 →]   ← in-memory Picker, Standard = nächstes Kalenderjahr

Einnahmen                         [X.XXX €]   Vollvermietung, 12 Monate
Zinsen                            [X.XXX €]   amortisierend für gewähltes Jahr
AfA                               [X.XXX €]   voll (kein Erwerbsjahr-Abzug)
Nicht umlagef. Kosten Wohnung     [X.XXX €]
Gebäudeversicherung               [X.XXX €]   nur wenn propertyInsuranceAnnual > 0
Hausverwaltung                    [X.XXX €]
Nicht umlagef. Kosten Stellplatz  [X.XXX €]   nur wenn parkingType != .nichtVorhanden
Umlagef. Kosten Stellplatz        [X.XXX €]   immer, nur wenn parkingType != .nichtVorhanden
Grundsteuer Stellplatz            [X.XXX €]   immer, nur wenn parkingType != .nichtVorhanden
──────── Steuerliches Ergebnis (Prognose) ────
Steuerliches Ergebnis (Prog.)     [−X.XXX €]  (fett)
Steuereffekt / Mon                [+XXX €]    (22px, fett, grün oder rot)
```

**Prognose-Annahmen:**
- Vollvermietung (12 Monate, kein Leerstand)
- Alle Werte aus Einstellungen — keine Regler/Slider
- Umlagef. Kosten WE und Grundsteuer WE erscheinen NICHT — bei Vollvermietung zahlt der Mieter
- Jahr-Picker: in-memory, wird nicht gespeichert

---

## Berechnungsformel — Steuerliches Ergebnis

### Was ist wann absetzbar?

| Posten | Vermietet | Leerstand | Mietgarantie |
|--------|-----------|-----------|--------------|
| Einnahmen | + voll | 0 | + incomeActualMonthly |
| Zinsen | − immer | − immer | − immer |
| AfA | − immer | − immer | − immer |
| Nicht umlagef. Kosten WE | − immer | − immer | − immer |
| Gebäudeversicherung | − immer (wenn > 0) | − immer (wenn > 0) | − immer (wenn > 0) |
| Hausverwaltung | − immer | − immer | − immer |
| Umlagef. Kosten WE | **0** (Mieter zahlt) | − anteilig (Tagesanteil) | − anteilig (Tagesanteil) |
| Grundsteuer WE | **0** (Mieter zahlt) | − anteilig (Tagesanteil) | − anteilig (Tagesanteil) |
| Nicht umlagef. Kosten TE | − immer | − immer | − immer |
| Umlagef. Kosten TE | − immer | − immer | − immer |
| Grundsteuer TE | − immer | − immer | − immer |
| Instandhaltungsrücklage | **nie** | **nie** | **nie** |

**Mietgarantie** wird steuerlich wie Leerstand behandelt — der Owner trägt die umlagefähigen Kosten, erhält aber `incomeActualMonthly` als Einnahme.

### Leerstandstage aus Statusverlauf

```
1. StatusEntries nach date sortieren (ASC)
2. Für jedes Intervall [entry.date → nächster entry.date]:
   a. Auf Berechnungsjahr clippen [1. Jan → 31. Dez]
   b. Tage zählen
   c. Status == .leerstand ODER .mietgarantie → zählen zu leerstandsTage
3. leerstandsAnteil = leerstandsTage / 365 (bzw. 366)
```

Beispiel:
```
01.01.2025  Vermietet
01.03.2025  Leerstand     ← 45 Tage (März + 14 Tage April)
15.04.2025  Vermietet

leerstandsTage  = 45
leerstandsAnteil = 45 / 365 = 12,3%
```

### Vollständige Formel

```
steuerlichesErgebnis =
    einnahmen                                               // je Status: Kaltmiete / incomeActualMonthly / 0
  − interestAnnual(year)                                    // Σ AnnuityRow.interest für Jahr Y
  − depreciationYearly(year)                                // anteilig im Erwerbsjahr
  − hoaFeeNonRecoverableMonthly × 12
  − propertyInsuranceAnnual                                 // nur wenn > 0
  − propertyManagementAnnual
  − (hoaFeeRecoverableMonthly × 12) × leerstandsAnteil     // WE: nur Leerstandsanteil
  − propertyTaxAnnual × leerstandsAnteil                    // WE: nur Leerstandsanteil
  − hoaFeeParkingNonRecoverableMonthly × 12                 // TE: nur wenn Stellplatz
  − hoaFeeParkingRecoverableMonthly × 12                    // TE: nur wenn Stellplatz
  − propertyTaxParkingAnnual                                // TE: nur wenn Stellplatz
```

### Steuereffekt

```
steuererstattungJahr = max(0, −steuerlichesErgebnis) × marginalTaxRate
steuereffektMonat    = steuererstattungJahr / eigentumsMonate im Jahr
```

- Steuerliches Ergebnis **negativ** → Verlust → Steuererstattung (grün)
- Steuerliches Ergebnis **positiv** → Gewinn → Steuernachzahlung (rot)

---

## Warnungen

| Zustand | Anzeige |
|---------|---------|
| `isHoaUnitSplit = false` | ⚠ "Für genaue Berechnung Hausgeld Wohnung aufteilen (→ Einstellungen)" |
| `parkingType != .nichtVorhanden && !isHoaParkingSplit` | ⚠ "Für genaue Berechnung Hausgeld Stellplatz aufteilen (→ Einstellungen)" |

Warnungen erscheinen unterhalb der jeweiligen Steuer-Sektion.

---

## Steuerrechtliche Grundlagen (Referenz)

| Zeile | Rechtsgrundlage |
|-------|----------------|
| Einnahmen | §21 EStG (Vermietung und Verpachtung) |
| Zinsen | §9 Abs. 1 Nr. 1 EStG (auch vor Besitzübergang = vorweggenommene Werbungskosten) |
| AfA | §7 EStG (2% Altbau, 3% Neubau ab 2023) |
| Nicht umlagef. Kosten | §9 EStG Werbungskosten |
| Umlagef. Kosten (nur Leerstand/Mietgarantie) | §9 EStG — bei Vermietung zahlt Mieter via Betriebskostenabrechnung |
| Umlagef. Kosten TE (immer) | §9 EStG — Stellplatz-Mieter zahlt keine Nebenkosten |
| Instandhaltungsrücklage | NICHT sofort absetzbar — erst bei tatsächlicher Entnahme aus der WEG |
