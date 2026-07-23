# Tech-Stack-Wechsel: Native macOS-App → Web App mit Supabase

**Status:** Genehmigt
**Datum:** 2026-07-23

## Kontext

Volta ist aktuell eine native SwiftUI/SwiftData-App für macOS (Single-User, lokale SQLite-Persistenz, kein Backend). Das Produkt selbst (Features, Datenmodell, Berechnungslogik, Design-System) bleibt unverändert — es ist bereits vollständig in `immobilien_datenmodell_v2.md` und `docs/specs/*.md` beschrieben. Dieser Wechsel betrifft ausschließlich die technische Umsetzung: von nativer macOS-App zu einer Web-App mit Supabase als Backend.

Der bestehende Swift-Code (`Volta/`, `VoltaTests/`) bleibt unverändert im Repo liegen — als Referenz beim Portieren der Berechnungslogik, aber ohne weitere Entwicklung.

## Tech Stack (neu)

| Bereich | Technologie | Begründung |
|---|---|---|
| Frontend-Framework | Next.js (App Router, TypeScript) | Größtes Ökosystem, offizielle Supabase-Integration (Auth-Helpers, SSR) |
| Backend/DB | Supabase (Postgres + Auth) | Managed Postgres, Auth, Realtime falls später gebraucht |
| Auth | Supabase Auth, Single-User mit Login (Magic Link) | Schützt Finanzdaten im Web, kein Passwort-Management nötig |
| Styling | Tailwind CSS | Design-Tokens aus `spec-design-system.md` (Farben, Radien, Glass-Card-Werte) als Tailwind-Theme abgebildet |
| Datenzugriff | `supabase-js` Client direkt + generierte TS-Typen (`supabase gen types`) | Kein ORM-Overhead, passt zur bisherigen "dependency-free wo möglich"-Philosophie |
| Formulare | React Hook Form + Zod | Ersetzt custom Swift-Validierung; Zod-Schema für Pflichtfelder und Warnschwellen (z.B. `landValue + buildingValue` weicht >5% vom Kaufpreis ab) |
| Charts | Recharts | Ersetzt Swift Charts (LTV-Kurve, Tilgungsplan-Visualisierung) |
| Berechnungslogik | Reine TypeScript-Funktionen (`lib/calculations/`) | 1:1-Portierung von `KPICalculator`, `CashflowCalculator`, `DepreciationCalculator`, `AmortizationCalculator`, `TaxCalculator` — bleiben pure functions, unit-testbar |
| Testing | Vitest | Ersetzt XCTest; gleiche Test-Pyramide, Fokus auf `calculations/`, Dresdner ETW als Golden-Master-Fixture |
| Hosting | Vercel (Deploy als späterer Schritt, zunächst lokal via `pnpm dev`) | Standard-Hosting für Next.js |
| Package-Manager | pnpm | Schnellere Installs, spart Speicherplatz (content-addressable store), verhindert phantom dependencies |

## Datenmodell & Auth

Die Tabellen folgen 1:1 dem aktuellen Datenmodell aus `docs/specs/spec-data-model.md` (v2) — **nicht** dem älteren Modell, das noch in der alten `CLAUDEvolta.md` stand (das hatte ein 5-Werte-Status-Enum, eine separate `RentGuarantee`-Tabelle und kein Hausgeld-Split; alles davon ist in der aktuellen Spec überholt):

- `properties` — Haupt-Entity mit allen Feldern aus `spec-data-model.md` (Stammdaten, Objektdaten, Kauf, Einnahmen, Annahmen, Kosten Wohnung + Stellplatz mit Hausgeld-Split, Finanzierung, AfA), plus `user_id` (FK auf `auth.users`)
- `status_entries` — 1:n zu `properties`, Status-Enum hat 3 Werte (`vermietet` / `leerstand` / `mietgarantie`)
- `extraordinary_costs` — 1:n zu `properties`, freie Textbeschreibung statt Kategorie-Enum
- `property_photos` — 1:n zu `properties`, max. 15 pro Immobilie (App-seitig durchgesetzt)
- `investment_calculations` — eigenständig wie bisher (Promote-Flow kopiert Felder nach `properties`)

Keine `rent_guarantees`-Tabelle: Mietgarantie läuft über `status_entries` mit `status = 'mietgarantie'` und `income_actual_monthly`.

**Row-Level-Security:** Jede Tabelle bekommt eine RLS-Policy `user_id = auth.uid()` (bei Kind-Tabellen indirekt über `property_id`). Primär ein Sicherheitsnetz, da Daten jetzt im Web statt lokal liegen; offen für später mehr Nutzer falls gewünscht.

**Auth-Flow:** Supabase Magic Link (E-Mail) — kein Passwort zu verwalten.

**Enums** (`PropertyType`, `AcquisitionType`, `ParkingType`, `PropertyStatus`) werden als Postgres-`enum`-Typen abgebildet. `HeatingType`/`EnergyClass`/`PropertyCondition` bleiben vorerst `text`, da die konkreten Werte in keiner Spec-Datei aufgelistet sind (dort steht nur "unverändert").

## Doku-Änderungen (Scope dieses Umsetzungsschritts)

Alle Markdown-Dokumentation im Repo (außer `docs/superpowers/`-Plänen und dem Swift-Code selbst) wird durchgesehen und Swift/SwiftUI/SwiftData-spezifische Stellen werden auf die neuen Äquivalente umgeschrieben. Produktbeschreibung, Formeln, UX-Verhalten und fachliche Entscheidungen bleiben inhaltlich unverändert — nur die technische Repräsentation wechselt:

- **`CLAUDEvolta.md`** — komplett neu geschrieben: neue Projekt-Übersicht, neue Tech-Stack-Tabelle, neue Projektstruktur (Next.js App Router: `app/`, `lib/calculations/`, `lib/supabase/`, `components/`), neues Datenmodell-Kapitel (Postgres statt SwiftData), neue Testing-Strategie (Vitest statt XCTest), neue Konventionen (TS/React statt Swift). Berechnungsformeln-Kapitel bleibt inhaltlich identisch, nur TS- statt Swift-Syntax.
- **`README.md`** — Stack-Tabelle und Projektstruktur-Abschnitt aktualisiert, Feature-Liste bleibt unverändert (Produkt ändert sich nicht).
- **`immobilien_datenmodell_v2.md`** — Dateipfade (`*.swift` → neue `.ts`/`.tsx`-Pfade unter `app/`/`lib/`/`components/`), `@Model`/`@Observable`-Referenzen → Postgres-Tabellen/React-State, Code-Snippets Swift → TypeScript. Produktlogik (KPI-Freischaltung, Sensitivitätsanalyse, Promote-Flow) bleibt gleich.
- **`docs/specs/*.md`** (spec-data-model, spec-calculations, spec-design-system, spec-property-setup, spec-verlauf-tab, spec-immobiliendaten-tab, und weitere) — Swift-Code-Blöcke (`@Model class ...`) → TypeScript-Typen/Interfaces bzw. Postgres-Tabellendefinition, `.swift`-Dateipfade → neue Pfade, SwiftUI-Implementierungshinweise (z.B. `.background(.ultraThinMaterial)`) → CSS/Tailwind-Äquivalente. Fachliche Regeln, Layout-Beschreibungen, Feldlisten, Validierungslogik bleiben unverändert.
- **`docs/specs/volta-ios-design-specification/README.md`** — wird geprüft und ggf. an neue Struktur angepasst (kurze Datei, 22 Zeilen).
- Swift-Code (`Volta/`, `VoltaTests/`) bleibt unangetastet.

**Out of scope:** Das tatsächliche Next.js-Projekt-Scaffold, Supabase-Projekt-Setup und die Portierung von Komponenten/Berechnungslogik (echter Code) sind kein Teil dieses Schritts — das ist ein späterer, separater Implementierungsschritt, sobald die Doku als Entscheidungsgrundlage steht.

## Out of Scope / bewusst nicht entschieden

- Konkrete Postgres-Migration-SQL (kommt im Implementierungsplan für das eigentliche Scaffold)
- Multi-User-Erweiterung über RLS hinaus
- CI/CD-Pipeline-Details für Vercel-Deploy
