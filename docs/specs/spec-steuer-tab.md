# Steuer-Tab

Zeigt steuerliches Ergebnis nach §21 EStG für das laufende Jahr (Ist + Projektion) und eine Prognose für ein wählbares Jahr.

Eine Glass-Card mit zwei Sektionen, getrennt durch blauen Gradient-Divider.

---

## Sektion 1 — Laufendes Jahr

```
LAUFENDES JAHR YYYY                        [Badge: Ist]

(Jan–[letzter abg. Monat] tatsächlich · [akt. Monat] anteilig · Rest projiziert)

Einnahmen                         [X.XXX €]
Zinsen                            [X.XXX €]   amortisierend, ab Darlehensstart
AfA                               [X.XXX €]   anteilig im Erwerbsjahr, sonst voll
Nicht umlagef. Kosten Wohnung     [X.XXX €]
Nicht umlagef. Kosten Stellplatz  [X.XXX €]   nur wenn hasParking
Umlagef. Kosten Wohnung           [X.XXX €]   × Leerstand-Tagesanteil
Grundsteuer Wohnung               [X.XXX €]   × Leerstand-Tagesanteil
Umlagef. Kosten Stellplatz        [X.XXX €]   immer, nur wenn hasParking
Grundsteuer Stellplatz            [X.XXX €]   immer, nur wenn hasParking
Hausverwaltung                    [X.XXX €]
──────── Steuerliches Ergebnis ────────
Steuerliches Ergebnis             [−X.XXX €]  (fett)
Steuereffekt / Mon                [+XXX €]    (22px, fett, grün oder rot)
```

**Laufendes Jahr** = Hybrid:
- Vergangene Monate → vollständig Ist aus Statushistorie
- Aktueller Monat → Ist bis heute, Projektion ab morgen
- Zukünftige Monate im Jahr → Projektion mit aktuellem Status

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
Nicht umlagef. Kosten Stellplatz  [X.XXX €]   nur wenn hasParking
Umlagef. Kosten Stellplatz        [X.XXX €]   immer, nur wenn hasParking
Grundsteuer Stellplatz            [X.XXX €]   immer, nur wenn hasParking
Hausverwaltung                    [X.XXX €]
──────── Steuerliches Ergebnis (Prognose) ────
Steuerliches Ergebnis (Prog.)     [−X.XXX €]  (fett)
Steuereffekt / Mon                [+XXX €]    (22px, fett, grün oder rot)
```

**Prognose-Annahmen:**
- Vollvermietung (12 Monate, kein Leerstand)
- Alle Werte aus Einstellungen — keine Regler/Slider
- Umlagef. Kosten WE und Grundsteuer WE erscheinen NICHT (Vermietet-Annahme → Mieter zahlt)
- Jahr-Picker: in-memory, wird nicht gespeichert

---

## Warnungen

| Zustand | Anzeige |
|---------|---------|
| `isHoaUnitSplit = false` | ⚠ "Für genaue Berechnung Hausgeld Wohnung aufteilen (→ Einstellungen)" |
| `hasParking && !isHoaParkingSplit` | ⚠ "Für genaue Berechnung Hausgeld Stellplatz aufteilen (→ Einstellungen)" |

Warnungen erscheinen unterhalb der jeweiligen Steuer-Sektion.

---

## Steuerrechtliche Grundlagen (Referenz)

| Zeile | Rechtsgrundlage |
|-------|----------------|
| Einnahmen | §21 EStG (Vermietung und Verpachtung) |
| Zinsen | §9 Abs. 1 Nr. 1 EStG (auch vor Besitzübergang = vorweggen. Werbungskosten) |
| AfA | §7 EStG (2% Altbau, 3% Neubau ab 2023) |
| Nicht umlagef. Kosten | §9 EStG Werbungskosten |
| Umlagef. Kosten (nur Leerstand) | §9 EStG — bei Vermietung zahlt Mieter |
| Instandhaltungsrücklage | NICHT sofort absetzbar (erst bei Entnahme aus WEG) |
