# Stellplatz: unabhängiger Status

## Problem

`status_entries` hält genau einen Status (vermietet/leerstand/mietgarantie) pro
Property und Datum. Besitzt eine Property einen Stellplatz, wird dessen
Vermietungsstatus faktisch an den der Wohnung gekoppelt — es gibt keine
Möglichkeit abzubilden, dass die Wohnung vermietet ist, während der Stellplatz
leersteht (oder umgekehrt), obwohl das in der Praxis vorkommt.

Konkret bedeutet das heute in `statusPeriodCalculator.ts` (`incomeForMonth`,
Zeile 118): `parkingRentMonthly` fließt nur, solange der gemeinsame Status
`vermietet` ist, und fällt während einer Wohnung-Mietgarantie komplett weg
(nur der manuell eingetragene Garantiebetrag zählt). Die Stellplatz-*Kosten*
sind dagegen bereits vollständig WE/TE-getrennt und immer eigentümergetragen,
unabhängig vom Status (`cashflowCalculator.ts`, Kommentar Zeile 227f.) — nur
Status/Einnahmen wurden nie getrennt.

## Lösung

`status_entries` bekommt eine `unit`-Spalte (`wohnung` | `stellplatz`).
Wohnung und Stellplatz führen ab sofort jeweils ihre eigene, unabhängige
Statushistorie mit vollem Funktionsumfang (inkl. eigener Mietgarantie mit
eigenem Betrag). Bestehende Properties mit Stellplatz erhalten per Migration
eine 1:1-Kopie ihrer bisherigen Historie als Stellplatz-Historie, sodass sich
an den heute berechneten Werten nichts ändert, bis jemand eine der beiden
Historien aktiv bearbeitet.

Die "Tatsächliche Leerstandsquote"-KPI bleibt bewusst auf die
Wohnung-Historie beschränkt (keine Verhaltensänderung dieser Kennzahl) — der
Stellplatz-Status wirkt sich nur auf die Cashflow-Einnahmen aus.

## Datenmodell

Neue Migration:

```sql
create type property_unit as enum ('wohnung', 'stellplatz');

alter table status_entries
  add column unit property_unit not null default 'wohnung';

insert into status_entries (property_id, date, status, income_actual_monthly,
  income_is_fixed_amount, income_period_end_date, notes, unit)
select property_id, date, status, income_actual_monthly,
  income_is_fixed_amount, income_period_end_date, notes, 'stellplatz'
from status_entries se
where se.unit = 'wohnung'
  and exists (
    select 1 from properties p
    where p.id = se.property_id and p.parking_type <> 'nicht_vorhanden'
  );
```

Der `default 'wohnung'` macht die Spalte für alle bestehenden Zeilen
rückwirkend korrekt; das nachgelagerte `insert...select` dupliziert diese
Zeilen zusätzlich als `stellplatz`-Historie für jede Property mit Stellplatz
(Duplizierung *vor* dem `insert`, damit die neu eingefügten Zeilen nicht
erneut mitselektiert werden).

`Database['public']['Tables']['status_entries']['Row']` (generierte Typen,
`lib/supabase/types.ts`) bekommt automatisch das neue `unit`-Feld beim
nächsten Type-Regenerate.

## Berechnungslogik (`statusPeriodCalculator.ts`)

- `incomeForMonth` (nimmt heute `coldRentMonthly`, `parkingRentMonthly`,
  `otherIncomeMonthly` zusammen mit einer Historie) wird ersetzt durch eine
  schlankere `incomeForUnit(month, history, today, monthlyAmount)`: zahlt
  `monthlyAmount * dayFraction` während `vermietet`, den
  Mietgarantie-Betrag (bestehende Fixbetrag-/Rate-Logik unverändert) während
  `mietgarantie`, `0` während `leerstand`.
- Aufrufer (`cashflowCalculator.ts`, `propertyCashflow.ts`) rufen sie zweimal
  auf: einmal mit Wohnung-Historie × `(coldRentMonthly + otherIncomeMonthly)`,
  einmal mit Stellplatz-Historie × `parkingRentMonthly` (nur wenn
  `parkingType != 'nicht_vorhanden'`, sonst `0` ohne Aufruf).
  `otherIncomeMonthly` bleibt bei der Wohnung — kein Stellplatz-Bezug.
- `leerstandDayFraction`, `genuineVacancyDayFraction`,
  `ownerBorneRecoverableWEBreakdown`, `ownershipAndVacancyDaysSinceTransfer`
  bleiben inhaltlich unverändert, bekommen aber ab jetzt ausschließlich die
  Wohnung-Historie übergeben (vorher: die einzige, gemeinsame Historie).
- `statusesForMonth` wird pro Monat zweimal aufgerufen (einmal je Einheit)
  und liefert zwei unabhängige Badge-Listen statt einer gemeinsamen.
- TE-Kosten-Berechnung bleibt unverändert (immer eigentümergetragen,
  unabhängig von jedem Status).

## Validierung (`statusEntryActions.ts`)

`assertNoDuplicateDate` und `assertFixedAmountPeriodConsistency` filtern ihre
Abfragen zusätzlich mit `.eq('unit', unit)` — Datums-Eindeutigkeit und die
Fixbetrag-Zeitraum-Konsistenz (siehe
`2026-09-14-mietgarantie-fixbetrag-design.md`) gelten pro Einheit
unabhängig, nicht property-weit. `createStatusEntry`/`updateStatusEntry`
nehmen `unit` als zusätzliches Pflichtfeld im Insert/Patch entgegen.

## UI

**Verlauf-Tab** (`VerlaufFeed.tsx`): Ein Segmented-Control "Wohnung" /
"Stellplatz" oberhalb des Feeds, nur sichtbar wenn `parkingType !=
'nicht_vorhanden'`. Jede Ansicht zeigt die für diese Einheit gefilterten
Statuseinträge, interleaved mit den (weiterhin ungefilterten,
einheitenunabhängigen) außergewöhnlichen Kosten — an deren Darstellung
ändert sich nichts. Der "+ Status hinzufügen"-Button erzeugt einen Eintrag
für die gerade aktive Einheit. `StatusEntryModal.tsx` bekommt `unit` als
Prop von `VerlaufFeed` durchgereicht (kein neues Formularfeld — die Einheit
ergibt sich aus dem aktiven Tab); alle bestehenden Modal-Funktionen
(Mietgarantie, Fixbetrag) funktionieren pro Einheit identisch.

**Wizard-Onboarding** (`StepStatusOnboarding.tsx` / `wizardLogic.ts`):
`mapToStatusEntryInsert` (liefert aktuell 0 oder 1 Zeile) wird zu
`mapToStatusEntryInserts` (liefert ein Array von 0, 1 oder 2 Zeilen): die
Wohnung-Zeile wie bisher, plus — falls `parkingType != 'nicht_vorhanden'` —
eine identische Zeile mit `unit: 'stellplatz'`. Das spiegelt exakt das
Backfill-Verhalten der Migration für neu angelegte Properties. Der Aufrufer
in `PropertyWizard.tsx` fügt statt einer einzelnen Zeile das ganze Array ein.

**Cashflow-Jahrestabelle** (`CashflowYearTable.tsx`,
`cashflowCalculator.ts`): `CashflowLineItems.income` wird durch `incomeWE`
und `incomeTE` ersetzt (Summe beider ergibt den bisherigen Gesamtwert für
"Cashflow vor Steuern" und alle nachgelagerten Verbraucher wie
`propertyTax.ts`). In der Tabelle wandert die "Einnahmen"-Zeile aus der
generischen Top-Gruppe in die jeweilige Gruppe: "Kosten Wohnung" →
**"Wohnung"** mit "Einnahmen" als erster Zeile, "Kosten Stellplatz" →
**"Stellplatz"** ebenso. Jede der beiden Einnahmen-Zeilen bekommt pro Monat
ihr eigenes Status-Badge direkt an der Zeile (ersetzt die bisherigen,
kombinierten Badges im Tabellenkopf). Ohne Stellplatz sieht die Tabelle
optisch fast identisch zu heute aus — nur die Badge-Position wandert vom
Spaltenkopf in die Einnahmen-Zeile.

## Tests

- `statusPeriodCalculator.test.ts`: neue Tests für `incomeForUnit`
  (Ersatz/Ergänzung der bisherigen `incomeForMonth`-Tests), inkl.
  divergierender Wohnung-/Stellplatz-Status im selben Monat.
- `cashflowCalculator.test.ts` / `propertyCashflow.test.ts`: Szenario mit
  Wohnung `vermietet` + Stellplatz `leerstand` (und umgekehrt) — geteilte
  `incomeWE`/`incomeTE`, geteilte Status-Badges.
- `wizardLogic.test.ts`: `mapToStatusEntryInserts` liefert zwei Zeilen bei
  Stellplatz, eine bei `nicht_vorhanden`.
- `statusEntryActions`-Verhalten (Validierung pro Einheit): manuell
  verifizieren oder Test ergänzen, falls vorhandene Tests diese Funktionen
  abdecken.
- `web/scripts/seed.ts`: Demo-Property mit Stellplatz bekommt eine
  abweichende Stellplatz-Historie, um den Split in der UI sichtbar zu
  demonstrieren.
