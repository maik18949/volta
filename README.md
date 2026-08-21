# Volta — Immobilien Portfolio Manager

Web-App zur Verwaltung vermieteter Immobilien: Rendite-KPIs, Cashflow Soll/Ist und steuerliche Auswirkungen auf einen Blick — statt verstreuter Excel-Tabellen.

🚧 **Aktiv in Entwicklung seit Juni 2026** — Solo-Projekt, laufend um weitere Features ergänzt.

## Was die App kann

- **Portfolio-Übersicht** — alle Objekte auf einen Blick mit aggregierten KPIs
- **Rendite-KPIs** — Bruttorendite, Nettorendite, Cap Rate, Cash-on-Cash, DSCR, LTV
- **Cashflow Soll/Ist** — Prognose vs. tatsächliche Einnahmen mit Statushistorie
- **Steuer** — AfA-Berechnung, Werbungskosten, V+V-Ergebnis, Steuereffekt
- **Tilgungsplan** — dynamische Restschuld, LTV-Kurve über Zeit
- **Investment-Rechner** — Objekte vor dem Kauf durchrechnen, bei Kauf direkt übernehmen

https://volta-jade.vercel.app/

## Vorgehen

Volta ist ein Solo-Projekt. Architektur, Datenmodell und Produktentscheidungen werden selbst getätigt und durch Claude validiert. Implementierung liegt komplett bei Claude.

- **Pivot statt Sunk-Cost** — ursprünglich als native SwiftUI-App gestartet; nach der ersten Iteration auf Next.js + Supabase umgestellt, um schneller iterieren zu können und die App geräteunabhängig per Browser nutzbar zu machen
- **Spec-first** — jedes größere Feature (Property-Wizard, Investment-Rechner, Foto-Upload …) startet mit einem kurzen Plan-Dokument, bevor Code geschrieben wird — hält Scope pro PR klein und überprüfbar
- **Feature-Branches + PR-Review** — jede Änderung läuft über eine eigene Branch und einen Pull Request gegen `main` (bislang 20+ gemergte PRs), mit Conventional-Commits (`feat`, `fix`, `refactor`, `docs`, `test`)
- **Test-getriebene Berechnungslogik** — KPI-, Steuer- und Tilgungsformeln sind der Teil, der tatsächlich stimmen muss; sie liegen deshalb als reine TypeScript-Funktionen ohne UI-Abhängigkeit vor und sind vollständig mit Vitest abgedeckt

## Stack

| Bereich | Technologie |
|---|---|
| Frontend | Next.js (App Router, TypeScript) |
| Backend | Supabase (Postgres + Auth) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Formulare | React Hook Form + Zod |
| Hosting | Vercel |
| Package-Manager | pnpm |

## Architektur-Highlights

- **Row-Level-Security pro Nutzer** — jede Tabelle in Postgres/Supabase erzwingt `user_id = auth.uid()`, kein Datenzugriff über die API-Ebene nötig
- **Reine Berechnungslogik** — KPI- und Steuerformeln liegen als framework-unabhängige TS-Funktionen in `lib/calculations/`, vollständig unit-getestet (Vitest)
- **Sofort konsistent** — Schreiboperationen committen direkt über `supabase-js`, kein manuelles Speichern

## Projektstruktur

```
web/
├── app/               # Next.js App Router: Routen + Layouts
│   ├── login/
│   └── (app)/
│       ├── properties/       # Property Setup + Detail-Tabs (Übersicht, Cashflow, Steuer, Finanzierung, Verlauf, Einstellungen)
│       └── investment-calculator/
├── components/        # Wiederverwendbare UI-Bausteine
├── lib/
│   ├── calculations/  # Reine TS-Funktionen, kein React — unit-testbar
│   └── supabase/      # Client, generierte Typen
└── tests/
```

## Entwicklung

```bash
pnpm install
supabase start      # lokale Supabase-Instanz (Docker)
pnpm dev
```

## Datenmodell

Siehe [`immobilien_datenmodell_v2.md`](immobilien_datenmodell_v2.md) für vollständige Felddefinitionen, Formeln und KPI-Berechnungen.

Technische Konventionen und Architekturentscheidungen: [`CLAUDEvolta.md`](CLAUDEvolta.md).
