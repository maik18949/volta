# Immobilien Portfolio Manager

Private Immobilienverwaltung als Web-App — Rendite, Cashflow, Steuer und Realität vs. Prognose auf einen Blick.

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

## Features

- **Portfolio-Übersicht** — alle Objekte auf einen Blick mit aggregierten KPIs
- **Rendite-KPIs** — Bruttorendite, Nettorendite, Cap Rate, Cash-on-Cash, DSCR, LTV
- **Cashflow Soll/Ist** — Prognose vs. tatsächliche Einnahmen mit Statushistorie
- **Steuer** — AfA-Berechnung, Werbungskosten, V+V-Ergebnis, Steuereffekt
- **Tilgungsplan** — dynamische Restschuld, LTV-Kurve über Zeit
- **Investment-Rechner** — Objekte vor dem Kauf durchrechnen, bei Kauf direkt übernehmen

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

## Datenspeicherung

Supabase (Postgres) mit Row-Level-Security pro Nutzer. Kein manuelles Speichern nötig, Schreiboperationen committen sofort über `supabase-js`. Backups übernimmt Supabase.

## Entwicklung

```bash
pnpm install
supabase start      # lokale Supabase-Instanz (Docker)
pnpm dev
```

Berechnungslogik liegt vollständig in `lib/calculations/` als reine TS-Funktionen — unabhängig von React testbar (Vitest). Testfixture: Dresdner ETW (alle Werte bekannt und verifiziert).

## Datenmodell

Siehe [`immobilien_datenmodell_v2.md`](immobilien_datenmodell_v2.md) für vollständige Felddefinitionen, Formeln und KPI-Berechnungen.

Technische Konventionen und Architekturentscheidungen: [`CLAUDEvolta.md`](CLAUDEvolta.md).
