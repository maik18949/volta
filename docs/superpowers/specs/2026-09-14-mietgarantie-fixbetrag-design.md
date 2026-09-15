# Mietgarantie-Fixbetrag

## Problem

Bei Mietgarantie-Statuseinträgen wird das Feld "Einnahme/Monat" bei jedem
Statuswechsel automatisch nach Tagen anteilig gekürzt (Tagesanteil am
Kalendermonat). Trägt man dort aber den tatsächlich erhaltenen, bereits
anteiligen Betrag für einen Teilzeitraum ein (z. B. 511,20 € für 16.–30.06.),
wird dieser Betrag ein zweites Mal gekürzt — das Ergebnis in der
Cashflow-Tabelle stimmt nicht mit dem real erhaltenen Betrag überein.

## Lösung

Zusätzlich zur bestehenden "Satz pro Monat"-Eingabe (unverändertes Verhalten,
Tagesanteil-Kürzung wie bisher) gibt es für Mietgarantie-Einträge eine zweite
Option: "Fixbetrag für diesen Zeitraum" mit explizitem Enddatum. Der Betrag
wird dann als Gesamtsumme für `[date, income_period_end_date]` behandelt statt
als Monatsrate.

## Datenmodell

Neue Migration auf `status_entries`:

- `income_is_fixed_amount boolean not null default false`
- `income_period_end_date date` (nullable; gesetzt nur wenn
  `income_is_fixed_amount = true`)

Bestehende Zeilen erhalten automatisch `false` / `null` → keine
Verhaltensänderung für existierende Daten. `income_actual_monthly` bleibt die
Spalte für den Betrag, wird bei `income_is_fixed_amount = true` aber als
Gesamtsumme des Zeitraums interpretiert statt als Monatsrate.

## Berechnungslogik (`statusPeriodCalculator.ts`)

Für Segmente mit `income_is_fixed_amount = true`:

- Gesamtlänge des Zeitraums `P` = Tage von `date` bis `income_period_end_date`
  (inklusive).
- Anteil pro Kalendermonats-Segment = `Fixbetrag × (Tage dieses
  Monats-Segments / Gesamttage von P)`.
- Liegt der gesamte Zeitraum in einem Monat, ergibt das automatisch genau den
  vollen eingetragenen Betrag ohne Kürzung.
- Erstreckt sich der Zeitraum über mehrere Monate, wird proportional nach
  Tagen verteilt.
- Tage außerhalb `[date, income_period_end_date]`, die noch zum
  Mietgarantie-Status gehören (kein nächster Eintrag vorhanden), zählen mit
  0 € bis ein neuer Eintrag angelegt wird.

Für `income_is_fixed_amount = false` bleibt die bisherige Logik
(`incomeActualMonthly * dayFraction` relativ zum Kalendermonat) unverändert.

## Validierung (`statusEntryActions.ts`)

Beim Erstellen/Aktualisieren eines Fixbetrag-Eintrags (`income_is_fixed_amount
= true`):

- `income_period_end_date >= date` (Pflichtfeld, muss nach oder gleich dem
  Startdatum liegen).
- **Existiert bereits ein späterer Statuswechsel-Eintrag** für dieselbe
  Property: `income_period_end_date` muss exakt der Tag vor dessen Datum
  sein — sonst wird das Speichern mit Fehlermeldung abgelehnt.
- **Kein späterer Eintrag vorhanden:** Enddatum frei wählbar, keine Blockade.

Umgekehrte Prüfung beim Erstellen/Aktualisieren eines *beliebigen* neuen
Eintrags: wenn der unmittelbar vorherige Eintrag ein Fixbetrag-Eintrag ist,
dessen `income_period_end_date` nicht exakt der Tag vor dem neuen
Eintragsdatum ist → ebenfalls blockiert.

Kein Löschschutz nötig: Löschen eines nachfolgenden Eintrags erzeugt
höchstens den bereits akzeptierten "offenen Rest ohne nächsten Eintrag"-Fall
(0 € bis zum nächsten, später angelegten Eintrag).

## UI

- `StatusEntryModal.tsx`: Bei Status "Mietgarantie" zusätzlicher Umschalter
  "Satz pro Monat" / "Fixbetrag für diesen Zeitraum". Bei Fixbetrag erscheint
  ein zusätzliches Enddatum-Feld; Label des Betragsfelds wechselt zu
  "Fixbetrag für diesen Zeitraum".
- `StepStatusOnboarding.tsx` (Wizard): gleiche Option nutzbar für den ersten
  Status überhaupt (kein "nächster Eintrag" nötig, da Enddatum jetzt explizit
  ist).
- `VerlaufFeed.tsx`: zeigt bei Fixbetrag-Einträgen Zeitraum + Gesamtbetrag an
  (z. B. "Fixbetrag: 511,20 € (16.–30.06.)").

## Tests

- `statusPeriodCalculator.test.ts`: Fixbetrag innerhalb eines Monats,
  Fixbetrag über mehrere Monate, Regressionstest für den konkreten Juni-Fall
  aus dem Bug-Report (511,20 € statt fälschlich 771,36 €).
- `cashflowCalculator.test.ts`: Fixbetrag-Segment in der Jahres-Cashflow-Tabelle.
- `statusEntryActions` (falls vorhandene Tests existieren) bzw. manuelle
  Verifikation: Validierung der Enddatum-Konsistenz in beide Richtungen.
