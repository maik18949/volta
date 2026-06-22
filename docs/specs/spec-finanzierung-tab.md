# Finanzierung-Tab

Zeigt den vollständigen Tilgungsplan und eine Übersicht der Finanzierungsstruktur.

---

## Layout — 2 Sektionen

### Sektion 1 — Finanzierungsübersicht

```
FINANZIERUNG

Darlehensbetrag       XXX.XXX €
Restschuld (heute)    XXX.XXX €
Monatliche Rate       X.XXX €
Zinssatz              X,XX%
Tilgungssatz          X,XX%
Zinsbindung bis       MM/YYYY   (noch X Jahre)
Restschuld Zinsbindungsende  XXX.XXX €
```

---

### Sektion 2 — Tilgungsplan

Jahresweise Übersicht des Amortisierungsverlaufs.

```
Jahr | Restschuld Anfang | Zinsen | Tilgung | Rate | Restschuld Ende
──────────────────────────────────────────────────────────────────
2025 |   280.000 €       | 9.520 €| 4.880 € |14.400€|  275.120 €
2026 |   275.120 €       | 9.354 €| 5.046 € |14.400€|  270.074 €
...
```

- Zinsen und Tilgung pro Jahr: Σ der monatlichen AmortizationRows
- Laufendes Jahr: Ist bis heute + Projektion ab heute
- Zinsbindungsende hervorgehoben (farbige Zeile oder Badge)

---

## Datenbasis

Alle Werte aus `AmortizationCalculator` — kein separater Speicher.

| Wert | Quelle |
|------|--------|
| Restschuld | `AmortizationCalculator.remainingDebt(atMonth:)` |
| Zinsen je Monat | `AnnuityRow.interest` |
| Tilgung je Monat | `AnnuityRow.principal` |
| Zinsbindungsende | `loanStartDate + fixedInterestPeriodYears` |
