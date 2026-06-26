# Physio App — Design System

Klinische Dokumentationssoftware für selbstständige Physiotherapeut:innen im
orthopädisch-muskuloskelettalen Bereich. Dieses Design System ist die
verbindliche Grundlage für alle UI-Komponenten und Oberflächen der App.

> **Tonalität in einem Satz:** Modern-professionell, werkzeughaft, klinisch
> präzise — *Gesundheit ohne generisches Medizin-Blau, Dichte ohne Unordnung.*

---

## 1. Produkt-Kontext

Die App unterstützt den vollständigen Dokumentationsworkflow eines
Behandlungsfalls:

1. **Befundaufnahme** — strukturiert, hohe Datendichte, einmalig pro Fall.
2. **Verlaufsdokumentation** — bis zu 15× täglich, max. 3 Minuten pro Eintrag.
3. **Return-to-Sport-Bewertung** — Checkliste mit klinischen Cut-off-Werten.

**Nutzer:** Einzelne:r Physiotherapeut:in mit klinischer Fachkompetenz. Kein
technischer Laie, aber auch kein Power-User. Erwartet professionelle Software —
keine Consumer-App.

**Nutzungskontext:** Desktop **und** Tablet gleichwertig. Am Schreibtisch
zwischen Behandlungen sowie direkt am Behandlungsplatz, unter wechselnden
Lichtverhältnissen und teils unter Zeitdruck.

### Design-Prinzipien

- **Informationsdichte ist eine Anforderung, kein Problem.** Kompakte Layouts
  sind erlaubt und erwünscht — keine künstliche Vereinfachung.
- **Farbe ist funktional.** Jede semantische Farbe hat genau eine Bedeutung
  (Phasen, Teststatus, Schmerzgrad, Flags). Niemals dekorativ. Siehe
  Kollisionsmatrix unten.
- **Geschwindigkeit vor Eleganz auf Pflichtabläufen.** Animationen nur auf
  nicht-kritischen Pfaden.
- **Light Theme** ist das einzige Theme im MVP. Off-White als Base, kein reines
  Weiß (ermüdet bei langer Bildschirmarbeit).

### Quellen

| Quelle | Beschreibung |
|--------|--------------|
| `uploads/Physio_App_DesignSystem.md` | Kontext- & Spezifikationsdokument v1.0 (Juni 2026), Grundlage dieses Systems. |
| Komponentenbibliothek | **Shadcn/ui**-Konvention (CSS-Custom-Properties als HSL-Tripel, Radius 0.5rem). |
| Icons | **Lucide** (Shadcn-Standard) — siehe Abschnitt *Iconographie*. |

> Kein Figma-File, kein Code-Repository und keine fertigen Logo-Assets wurden
> bereitgestellt. Die Wortmarke „Klinova" im UI-Kit ist als schlichter
> Text-Logotype (Indigo-Glyph „K" + Wortmarke) gesetzt — ein echtes Logo kann
> jederzeit nachgereicht werden (siehe *Caveats*).

---

## 2. Content Fundamentals

Wie Texte in der App geschrieben werden.

- **Sprache:** Deutsch. Klinische Fachterminologie wird vorausgesetzt und
  verwendet (z.B. *Lachman-Test*, *Limb-Symmetry-Index*, *Red Flags*) — nicht
  vereinfacht oder „übersetzt".
- **Anrede:** Neutral und sachlich. Die App spricht den Nutzer **nicht** direkt
  an („du"/„Sie"). Stattdessen objekt- und aufgabenbezogene Labels:
  *„Phase abschließen"*, *„Eintrag speichern"*, *„Bericht exportieren"*.
- **Casing:** Sätze und Labels in normaler Groß-/Kleinschreibung (Deutsch).
  Sektions-Overlines in UPPERCASE mit Sperrung (`--tracking-wide`), z.B.
  *„PHASE 2 · OBJEKTIV"*. Keine durchgehende Versalschrift in Fließtext.
- **Zahlen & Werte:** Immer präzise und in `--font-mono` gesetzt. Cut-offs mit
  Vergleichsoperator: `LSI ≥ 90%`, `NRS = 0`, `Einheit 14`. Einheiten klein und
  gedämpft hinter dem Wert.
- **Ton:** Knapp, befundend, ohne Marketing-Sprache. Keine Ausrufezeichen, keine
  Superlative. Statusmeldungen sind faktisch: *„Gespeichert"*, *„3 von 5
  Kriterien erreichen den Cut-off"*, *„Noch nicht freigegeben"*.
- **Emoji:** Werden **nicht** verwendet. Statuszeichen sind ausschließlich das
  Häkchen (✓) für Abschluss und farbcodierte Punkte/Chips.
- **Fehler & Warnungen:** Sachlich und handlungsorientiert. „positiv" meint stets
  *pathologischer Befund*, nie „gut" — diese Mehrdeutigkeit wird im UI durch
  Farbe (Rot) und Kontext aufgelöst.

**Beispiele guter Microcopy**

> „Schmerz heute · Pflichteingabe"
> „Red & Yellow Flags — vor Belastungsaufbau prüfen"
> „2 von 5 Phasen abgeschlossen"
> „Volle, seitengleiche Beweglichkeit (ROM)"

---

## 3. Visual Foundations

### Farbe

- **Primary — Indigo `#4F46E5`.** Trägt die Assoziation *Gesundheit* ohne
  generisches Medizin-Blau. Ausschließlich für interaktive Elemente,
  Primäraktionen und Fokus. Indigo ist **gesperrt** für Phasen und Status.
- **Background — Off-White `#F4F5F8`.** Base-Fläche. Cards heben sich in reinem
  Weiß (`#FFFFFF`) per 1px-Border + weichem Schatten ab.
- **Funktionale Farben** kodieren klinische Bedeutung und sind eindeutig belegt:
  - *Test-Status:* Rot `#DC2626` = positiv/pathologisch, Grün `#16A34A` =
    negativ/unauffällig, Grau `#9CA3AF` = nicht durchgeführt.
  - *NRS-Skala:* Gradient Grün → Orange → Dunkelrot (0–10).
  - *Phasen:* Cyan (Anamnese), Teal (Objektiv), Violet (Gelenke), Purple
    (Befund), Slate-Blue (Planung).
  - *Flags:* Red Flag `#DC2626`, Yellow Flag `#F59E0B`.

#### Kollisionsmatrix (verbindlich)

| Farbraum | Belegt durch | Gesperrt für |
|----------|--------------|--------------|
| Rot | `status-pos`, `flag-red`, `destructive` | Phasen, Primary |
| Grün | `status-neg` | Phasen, Primary |
| Gelb/Amber | `flag-yellow`, NRS-Mitte | Phasen, Primary |
| Indigo | `primary`, `ring` | Phasen, Status |
| Cyan / Teal / Violet / Purple / Slate-Blue | je eine Phase | Status, Primary |

> Änderungen an semantischen Farben erfordern eine erneute Prüfung dieser Matrix.

### Typografie

- **DM Sans** — Primärschrift (UI & Fließtext). Gewichte 400/500/600/700.
  Lesbar, neutral-professionell, funktioniert klein auf Tablet wie auf Desktop.
- **IBM Plex Mono** — *ausschließlich* für messbare Werte: Cut-offs,
  NRS-Zahlen, Einheit-Nummern, technische Bezeichner. Monospace signalisiert
  *„dieser Wert ist präzise und messbar"*. `tnum` aktiviert, leicht negatives
  Tracking.
- Skala kompakt (11 → 30px). Überschriften halbfett (600) mit leicht negativem
  Tracking; Mikro-Labels in UPPERCASE + Sperrung.

### Spacing, Radius & Form

- **4px-Spacing-Basis**, kompakte Skala — Dichte ist gewollt.
- **Radius 0.5rem (8px)** Standard für Cards, Inputs, Buttons; 4px für Chips,
  12px für Modals, 16px für Sheets/Drawer. Chips & Avatare voll gerundet.
- **Touch-Targets ≥ 44×44px** für alle interaktiven Elemente (Tablet).

### Elevation, Border & Cards

- Karten = weißer Grund + **1px Border (`#DBDFE8`)** + **weicher, niedrig-
  kontrastiger Schatten**. Ruhig, nicht „bouncy", keine harten Schlagschatten.
- Vier Schattenstufen: `xs` (Hairline) → `sm` (Card) → `md` (Popover) → `lg`
  (Modal). Fokus = 3px Indigo-Ring bei 35% Deckkraft.
- Phasen-Akzent: 3px farbige **linke Kante** + Titel in Phasenfarbe — der
  einzige Ort, an dem eine farbige Linke-Border-Akzentuierung zulässig ist
  (semantisch, nicht dekorativ).

### Hintergründe, Transparenz & Effekte

- **Keine** Verlaufs-Backgrounds, keine Bildtexturen, keine Glas-/Blur-Effekte.
  Flächen sind flach und funktional (Off-White Base, weiße Cards).
- Transparenz wird **nur funktional** eingesetzt: semantische Farben bei
  12–15% Deckkraft als aktive Füllung (Status-Buttons, Flags, Phasen-Highlight).

### Bewegung

- Animationen **nur auf nicht-kritischen Pfaden**. Easing `cubic-bezier(0.2,0,0,1)`.
- Erlaubt: Seitenübergänge ≤150ms, Accordion ≤200ms, Progress-width 300ms.
- Chip-/Status-Toggle: Farbe **instant**, kein Delay. **Kein** Bounce, kein
  Skeleton >100ms, keine Hover-Animation auf Touch-only Elementen, **keine**
  Animation auf dem Speichern-Pfad der Verlaufsdokumentation.

### Hover- & Press-States

- Buttons: Hover = leicht abgedunkelte Fläche; Fokus = Indigo-Ring. Kein Scale.
- Listeneinträge/Nav: Hover/aktiv = Accent-Tint (`--accent`) bzw. Phasenfarbe
  @6–15%. Press verändert keine Größe (werkzeughaft, ruhig).

---

## 4. Iconographie

- **System:** [Lucide](https://lucide.dev) — der Shadcn/ui-Standard. Dünne,
  gleichmäßige 1.5–2px-Outline-Icons, neutral und klinisch sachlich. Passt zur
  Strichstärke von DM Sans.
- **Einbindung:** Über CDN per `<i data-lucide="name">` + `lucide.createIcons()`
  (siehe UI-Kit `index.html`). In Produktion als `lucide-react`-Komponenten.
- **Verwendete Beispiele:** `clipboard-list` (Befund), `activity` (Verlauf),
  `target` / `shield-check` (Return-to-Sport), `users`, `file-text`, `check`,
  `plus`, `check-circle-2`.
- **Größen:** 16–18px in Buttons & Nav; an Schriftgröße & Strichstärke
  ausgerichtet.
- **Kein Emoji**, keine Multicolor-/Flat-Illustrations-Icons. Das einzige
  „Glyph" außerhalb von Lucide ist das Häkchen ✓ in Stepper-/Status-Punkten.
- **Keine eigenen, frei gezeichneten Dekor-SVGs.** Icons tragen immer Funktion.

> *Substitutions-Hinweis:* Es wurde kein projekteigenes Icon-Set bereitgestellt.
> Lucide ist als Shadcn-Standard die naheliegende, konventionskonforme Wahl —
> bitte bestätigen oder ein eigenes Set nachreichen.

---

## 5. Index / Manifest

**Root**
- `styles.css` — globaler Einstiegspunkt (nur `@import`-Zeilen). Consumer binden
  diese eine Datei ein.
- `readme.md` — dieses Dokument.
- `SKILL.md` — Agent-Skill-Manifest (Claude Code-kompatibel).

**Tokens** (`tokens/`, alle aus `styles.css` importiert)
- `fonts.css` — `@font-face` für DM Sans & IBM Plex Mono (lokale woff2).
- `colors.css` — Shadcn-HSL-Tripel + semantische klinische Farben.
- `typography.css` — Familien, Größen, Gewichte, Tracking.
- `spacing.css` — Spacing, Radius, Touch-Target, Shadows, Motion.
- `base.css` — sinnvolle Element-Defaults.

**Foundation-Cards** (`guidelines/`) — Specimen für die Design-System-Ansicht
(Colors, Type, Spacing).

**Komponenten** (`components/`)
- `core/` — Button, Input, Select, Switch, Checkbox, Badge, Card/CardHeader, Tabs.
- `clinical/` — TestStatusToggle, NrsSlider, FlagChip, PhaseStepper,
  ValueReadout, ProgressBar (semantisch belegte Fachkomponenten).

**UI-Kit** (`ui_kits/physio-app/`) — interaktive Recreation der Klinova-App:
Patientenliste, Befundaufnahme (Anamnese · Objektiv · Gelenke · Befund ·
Planung), Verlaufsdokumentation, Return-to-Sport, Berichte. Einstieg:
`index.html` (Design-System-Tab) bzw. `preview.html` (standalone).

**Assets** (`assets/`)
- `fonts/` — lokale Webfont-Dateien (woff2).

---

## 6. Caveats & offene Punkte

- **Fonts:** DM Sans & IBM Plex Mono wurden als lokale woff2 von der
  Fontsource-CDN gezogen (latin, Gewichte 400–700). Beide sind exakt die im
  Spec genannten Schriften — keine Substitution. Bei Bedarf bitte lizenzierte
  Originaldateien nachreichen.
- **Icons:** Lucide als Shadcn-Standard gewählt (kein projekteigenes Set
  geliefert) — bitte bestätigen.
- **Logo:** Keine Marken-Assets vorhanden. „Klinova" ist als schlichter
  Text-Logotype gesetzt — bitte echtes Logo nachreichen.
- **Offen aus Spec:** Dark Theme (Phase 2, Architektur via CSS-Properties
  vorbereitet), finale NRS-Slider-Implementierung (nativ vs. custom),
  WCAG-AA-Kontrastprüfung der Phasenfarben auf Tablet.
