# Design System

**Status:** Aktiv  
**Light Mode only — kein Dark Mode**

---

## Hintergrund

```
App-Hintergrund: linear-gradient(145deg, #dce8f8 0%, #e8f0fb 100%)
```

## Glass Cards

Alle Content-Karten:

```
background:     rgba(255,255,255,0.80)
backdrop-filter: blur(24px)
border:         1px solid rgba(255,255,255,0.95)
border-radius:  18px
box-shadow:     0 4px 16px rgba(0,0,0,0.06)
```

SwiftUI: `.background(.ultraThinMaterial)` + `.clipShape(RoundedRectangle(cornerRadius: 18))`

## Section-Labels (Abschnittstitel innerhalb Karten)

```
Farbe:          #1d4ed8
Schrift:        11px, weight 700, UPPERCASE, letter-spacing 0.5px
```

Beispiel: `STEUERLICHES ERGEBNIS`, `CASHFLOW`, `LAUFENDES JAHR`

## Abschnittstrennlinie (innerhalb Karte)

```css
height: 1.5px;
background: linear-gradient(90deg, rgba(59,130,246,0.35), transparent);
border-radius: 2px;
```

Trennt zwei Sektionen innerhalb einer Card (z.B. Ist / Prognose im Steuer-Tab).

## Badges

```
Ist-Badge:      Vollblau  #3b82f6, weißer Text, border-radius 6px, 10px 4px padding
Prognose-Badge: Outline   border #3b82f6, blauer Text
Status-Tags:    farbig je Status (grün=Vermietet, lila=Mietgarantie, orange=Leerstand, etc.)
```

## Ergebnis-Zahlen (große Anzeigewerte)

```
font-size:   18–22px, weight 800, letter-spacing -0.5px
Positiv:     #15803d
Negativ:     #dc2626
```

## Zeilen-Werte (Tabellen, Listen)

```
Label:   12px, color #475569
Wert:    12px, weight 600, font-variant-numeric: tabular-nums
Negativ: #dc2626
Positiv: #059669
Neutral: #0f172a
```

## Farben

| Rolle | Hex |
|---|---|
| App-Akzent Blau | `#3b82f6` |
| Section-Label Blau | `#1d4ed8` |
| Positiv (groß) | `#15803d` |
| Positiv (Zeile) | `#059669` |
| Negativ | `#dc2626` |
| Primärtext | `#0f172a` |
| Sekundärtext | `#475569` |
| Dimmer Text | `#94a3b8` |
| Hintergrund von | `#dce8f8` |
| Hintergrund bis | `#e8f0fb` |
| Card Hintergrund | `rgba(255,255,255,0.80)` |
| Summenzeilen-Tint | `rgba(239,246,255,0.5)` |
| Warnung | `#D97706` |

## Typografie

SF Pro (System). Zahlen: SF Mono (tabular-nums).

| Rolle | Größe | Gewicht | Verwendung |
|---|---|---|---|
| Tab-Titel | 17–22px | 700 | "Cashflow", "Steuer" |
| Section-Label | 11px | 700 UPPERCASE | "STEUERLICHES ERGEBNIS" |
| Ergebnis-Zahl | 18–22px | 800 | Cashflow nach Steuer |
| Zeilen-Label | 12px | 500 | "Einnahmen", "Zinsen" |
| Zeilen-Wert | 12px | 600 | Beträge |
| Spaltenheader | 10px | 700 UPPERCASE | Monats-Header in Tabellen |

## Spacing

- Card-Padding: 16px horizontal, 6px vertikal pro Zeile
- Zeilen-Padding: 8–10px vertikal
- Gap zwischen Karten: 10–12px
- Section-Label Abstand oben: 10–12px

## Navigation

```
Tab-Leiste: Übersicht | Cashflow | Steuer | Verlauf | Finanzierung | Einstellungen
```

## Tabellen

- Keine Zebra-Stripes
- Zahlenkolumnen rechtsbündig, SF Mono
- Keine Sonder-Hintergründe je Zeile (nur Wert-Farbe signalisiert Bedeutung)
- Trennlinien: 1px `rgba(0,0,0,0.05)`

## Icons

SF Symbols — keine eigenen Icons.

## Animationen

Subtile Übergänge — max. 200ms.
