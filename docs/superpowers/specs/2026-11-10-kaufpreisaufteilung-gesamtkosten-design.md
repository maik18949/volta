# Kaufpreisaufteilung auf Gesamtanschaffungskosten

**Problem:** Die AfA-Basis wurde als `Gebäudewert + Nebenkosten × Gebäudewert / Kaufpreis` berechnet. Das setzt voraus, dass Gebäude- und Grundstückswert zusammen den Kaufpreis ergeben. Der BMF-Rechner (Kaufpreisaufteilung) verteilt aber die Gesamtanschaffungskosten (Kaufpreis + Nebenkosten) auf Boden und Gebäude. Wer den BMF-Gebäudewert übernimmt, bekommt die Nebenkosten doppelt in der Basis.

**Beispiel Johann-Meyer-Straße 7b (Dresden):** Kaufpreis 278.600 €, Nebenkosten 20.134,96 €, Gesamtkosten 298.734,96 €. BMF: Boden 70.710 €, Gebäude 228.024 € (Anteil 76,33 %). Erfasst waren Boden 50.600 € und Gebäude 228.000 € (Summe = Kaufpreis, Anteil 81,84 %). Die alte Formel ergab 244.478 € Basis (9.388 € AfA/Jahr), richtig sind 228.024 € (8.756 € AfA/Jahr).

## Entscheidung

- `building_value` und `land_value` beziehen sich auf **Kaufpreis + Nebenkosten** (wie der BMF-Rechner). Ihre Summe soll dazu passen (Toleranz ±5 %).
- `afaBasis = building_value + renovation_afa_eligible`. Die Nebenkosten werden nicht mehr nochmals aufgeschlagen.
- %-Modus im Wizard: Gebäudewert = Anteil × (Kaufpreis + Nebenkosten), Grund = Rest.
- Die Anzeige weist den in der Basis enthaltenen Nebenkostenanteil nur als Info aus: `Nebenkosten × Gebäudewert / (Kaufpreis + Nebenkosten)`.
- Gespeichert werden weiterhin absolute Euro-Werte, kein Schema-Change.

## Folgen

- Bestehende Objekte, die mit der alten Konvention erfasst wurden (Summe = Kaufpreis), müssen auf BMF-Werte mit Nebenkosten umgestellt werden, sonst ist die Basis zu niedrig.
- Die iOS-App (`Volta/Volta/Calculations/DepreciationCalculator.swift`) nutzt noch die alte Formel und wird getrennt nachgezogen.
