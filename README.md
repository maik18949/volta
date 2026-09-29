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

## Roadmap

Der aktuelle Stand deckt Portfolio-Übersicht, Rendite-KPIs, Cashflow, Steuer und den Investment-Rechner ab. Geplante Ausbaustufen:

**Mieterverwaltung**
Mieter einer Immobilie zuordnen, Mieterdetails einsehen (Kontakt, Mietvertrag, Mietdauer) sowie Zählerstände (Wasser, Strom, Gas etc.) pro Mieter/Wohnung erfassen und im Verlauf einsehen.

**Dokumente & Automatisierung**
Zentrale Dokumentenverwaltung pro Immobilie — Kaufverträge, Mietverträge, Energieausweise, Rechnungen, Finanzierungs- und Steuerunterlagen, Gutachten — mit automatischer Kategorisierung. Perspektivisch: KI-Auswertung von Dokumenten, automatische Übernahme relevanter Daten (z. B. Kaufpreis, Mietbeginn) direkt ins Datenmodell.

**KI-Analyse**
Analyse einzelner Immobilien und des Gesamtportfolios — Auffälligkeiten, Kostenentwicklung, Mietsteigerungspotenzial, Renditeentwicklung, Objektvergleich. Fragen in natürlicher Sprache ("Welche Immobilie hat aktuell die beste Rendite?", "Wo verliere ich am meisten Cashflow?"). Perspektivisch: Investment-Simulationen.

**Reporting & Export**
PDF-Auswertungen (Portfolio- und Objektberichte), Excel/CSV-Export, automatisch generierte Jahresberichte.

**Benachrichtigungen**
Proaktive Hinweise zu auslaufenden Mietverträgen und Finanzierungen, lange nicht angepasster Miete, fehlenden Dokumenten, ungewöhnlichen Kosten- oder Einnahmenveränderungen, Fristen sowie Wartungs- und Versicherungsterminen.

**Markt & Bewertung**
Nebenkostenabrechnung, Einbindung von Verkaufs-/Marktdaten zur Wertermittlung, Unterstützung bei der Due Diligence vor dem Kauf.

**Mobile-Optimierung**
Responsive Umsetzung aller Ansichten (Portfolio, Objektdetail, Wizard, Rechner) für Smartphone und Tablet, damit sich die App unterwegs genauso gut bedienen lässt wie am Desktop.

**Vision: Makler-Portal**
Eigenes Portal, über das Makler ihre Objekte einpflegen und Interessenten diese direkt einsehen können — eine mögliche Erweiterung über die private Portfolioverwaltung hinaus.

**Degressive AfA**
Neben der linearen AfA optional degressive Abschreibung als Berechnungsvariante anbieten.

**Bundesland-Erkennung aus PLZ**
Bundesland automatisch aus der Postleitzahl der Immobilie ableiten statt manueller Auswahl.

**Grunderwerbsteuer automatisch nach Bundesland**
Grunderwerbsteuersatz automatisch anhand des (erkannten) Bundeslands vorschlagen statt manueller Eingabe.

**Gebäudeanteil prozentual auswählbar**
Neben der Eingabe von Grundstücks-/Gebäudewert in Euro einen Switcher übers Feld anbieten, um den Gebäudeanteil stattdessen direkt als Prozentsatz einzugeben — einfacher, wenn die genauen Werte aus der Kaufpreisaufteilung nicht bekannt sind.

**KI-Objekterfassung**
Immobilie automatisch anlegen lassen: Dokumente (Kaufvertrag, Exposé, Grundbuchauszug) hochladen, KI extrahiert die relevanten Stammdaten (Adresse, Kaufpreis, Wohnfläche, Baujahr etc.) und legt das Objekt vorausgefüllt an — Nutzer prüft und bestätigt nur noch.

**Bankanbindung**
Automatischer Kontoabgleich für die Ist-Werte im Cashflow (Mieteingänge, Nebenkosten, Kreditraten) statt manueller Erfassung — über eine PSD2-lizenzierte Kontoschnittstelle (z. B. GoCardless Bank Account Data, FinAPI, Tink) statt einer Eigenentwicklung der Bankanbindung.

**Investment-Rechner Neugestaltung**
Der Investment-Rechner muss grundlegend neu gemacht werden.

**Wizard: Summary/Zwischenwerte-Design überarbeiten**
Beim Anlegen einer Immobilie ist das Design der Summary/Zwischenwerte unten auf der Seite sowie am Rand überarbeitungsbedürftig.

### Offene Punkte

**Allgemeine Performance:** Die App könnte insgesamt spürbar schneller laden — kein akuter Einzelfehler, sondern über mehrere Bereiche hinweg spürbar. Noch nicht systematisch untersucht (grober Check: was lädt langsam, wo).

**URL-Race beim schnellen Tab-Wechsel (Leerstandsquote-Regler):** Der Reglerwert wird debounced (400ms) in die URL geschrieben. Wechselt man innerhalb dieser 400ms den Tab, greift der Sidebar-Link noch auf den alten, noch nicht committeten Wert zu — der frisch gesetzte Wert geht verloren. Mögliche Lösungen: Wert beim Verlassen der Seite sofort ohne Debounce committen, oder den letzten Live-Wert zusätzlich synchron (z. B. sessionStorage) verfügbar machen.

**Fixbetrag-Option fehlt im Property-Wizard:** Der "Satz pro Monat"/"Fixbetrag für diesen Zeitraum"-Umschalter für Mietgarantie existiert bisher nur im Verlauf-Tab (`StatusEntryModal.tsx`), nicht im Onboarding-Schritt beim Anlegen einer Immobilie (`StepStatusOnboarding.tsx`), der weiterhin nur ein einzelnes monatliches Einnahmefeld hat.

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
