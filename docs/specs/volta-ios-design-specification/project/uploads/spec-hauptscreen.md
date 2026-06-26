# Hauptscreen — Immobilienliste

Einstiegsscreen der App. Zeigt Portfolio-Zusammenfassung und Liste aller Immobilien.

---

## Layout

```
┌─────────────────────────────────────────┐
│  Volta                          [+ ] [⋮]│  ← NavigationBar
├─────────────────────────────────────────┤
│                                         │
│  ┌─ Portfolio-Karte ─────────────────┐  │
│  │  3 Immobilien                     │  │
│  │  Cashflow/Mon    Gesamtinvestment  │  │
│  │     −24 €          892.000 €      │  │
│  │  Ø Nettorendite   Restschuld      │  │
│  │     3,8%          612.000 €       │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [Datum ▾]  ← Sortierung               │
│                                         │
│  ┌─ Property Card ───────────────────┐  │
│  │  [Titelbild ~160pt]               │  │
│  │  ETW Dresden Neustadt [Vermietet] │  │
│  │  Dresdner Str. 12, Dresden        │  │
│  │  ─────────────────────────────── │  │
│  │  Cashflow/Mon     Nettorendite    │  │
│  │     −24 €            3,8%        │  │
│  │  Kaufpreis/m²     Restschuld      │  │
│  │   2.800 €/m²      210.000 €      │  │
│  │  ─────────────────────────────── │  │
│  │  68 m²  ·  3 Zi  ·  seit 03/24  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ┌─ Property Card ───────────────────┐  │
│  │  ...                              │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Portfolio-Karte (Glass Card)

Immer ganz oben. Aggregiert alle Immobilien.

```
[Anzahl] Immobilien                        ← als Titel der Karte

Cashflow/Mon        Gesamtinvestment
[±X.XXX €]          [XXX.XXX €]

Ø Nettorendite      Restschuld
[X,X%]              [XXX.XXX €]
```

**Berechnungen:**
```
Cashflow/Mon       = Σ cashflowNachSteuerMonatlich aller Immobilien (laufender Monat)
Gesamtinvestment   = Σ totalInvestment aller Immobilien
Ø Nettorendite     = Σ NOI aller Immobilien / Σ totalInvestment (gewichtet)
Restschuld         = Σ remainingDebtNow aller Immobilien
```

**Farbe Cashflow:** grün wenn positiv, rot wenn negativ.

---

## Property Card

Jede Immobilie = eine Card. Tippen → öffnet Property Detail (Tab-Ansicht).

### Titelbild

- Höhe: ~160pt, vollbreite Card, `contentMode: .fill`
- Quelle: `PropertyPhoto.isCoverPhoto = true` → fallback erstes Foto → Placeholder-Gradient mit Immobilientyp-Icon

### Inhalt

```
[Name]                              [Status-Badge]
[Straße, Stadt]

──────────────────────────────────
Cashflow/Mon        Nettorendite
[±XXX €]            [X,X%]

Kaufpreis/m²        Restschuld
[X.XXX €/m²]        [XXX.XXX €]
──────────────────────────────────
[Wohnfläche] m²  ·  [X Zi]  ·  seit [MM/YY]
```

**Felder:**
| Feld | Quelle |
|------|--------|
| Name | `property.name` |
| Status-Badge | letzter StatusEntry |
| Adresse | `property.address + ", " + property.city` |
| Cashflow/Mon | `cashflowNachSteuerMonatlich` (laufender Monat) |
| Nettorendite | `NOI / totalInvestment` |
| Kaufpreis/m² | `totalPurchasePrice / livingAreaSqm` |
| Restschuld | `remainingDebtNow` (0 wenn kein Kredit) |
| Wohnfläche | `property.livingAreaSqm` |
| Zimmer | `property.rooms` |
| seit | `property.economicTransferDate` (MM/YY) |

**Restschuld = 0:** zeigt "–" statt "0 €".

---

## Sortierung

Picker neben der Liste (Segmented Control oder Dropdown):

| Option | Beschreibung |
|--------|-------------|
| Datum | Nach `economicTransferDate`, neueste zuerst (Standard) |
| A–Z | Alphabetisch nach `property.name` |
| Manuell | Drag & Drop Reihenfolge, persistent gespeichert |

---

## Aktionen

**NavigationBar rechts:**
- **[+]** → öffnet `PropertySetupView` (NavigationStack push)
- **[⋮]** → Optionsmenü (z.B. Sortierung, später erweiterbar)

**Swipe-Aktionen auf Property Card:**
- Swipe links → [Löschen] mit Confirmation Dialog

**Confirmation Dialog beim Löschen:**
```
"[Name] löschen?"
"Diese Immobilie und alle zugehörigen Daten werden unwiderruflich gelöscht."
[Abbrechen]  [Löschen]
```

---

## Empty State (keine Immobilien)

```
[Haus-Icon]

Noch keine Immobilie.
Füge deine erste Immobilie hinzu.

[+ Immobilie hinzufügen]
```

Portfolio-Karte wird ausgeblendet wenn keine Immobilien vorhanden.

---

## Navigation

```
Hauptscreen
    ↓ Tippen auf Property Card
Property Detail
    └── Tab-Leiste: Übersicht | Cashflow | Steuer | Verlauf | Finanzierung | Immobiliendaten

Hauptscreen
    ↓ [+] Button
PropertySetupView (NavigationStack)
    └── Nach Fertigstellen: zurück zu Hauptscreen, neue Card erscheint
```
