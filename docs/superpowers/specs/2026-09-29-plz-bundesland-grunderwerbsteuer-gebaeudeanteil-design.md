# Bundesland aus PLZ, Grunderwerbsteuer-Vorschlag, Gebäudeanteil in Prozent

**Problem:** Beim Anlegen und Bearbeiten einer Immobilie sind Bundesland (Freitext), Grunderwerbsteuer (Euro-Betrag) und die Aufteilung Gebäude/Grundstück (zwei Euro-Felder) reine Handeingabe. Das Bundesland ergibt sich aus der PLZ, die Grunderwerbsteuer aus Bundesland und Kaufpreis, und wer die Kaufpreisaufteilung nicht kennt, arbeitet mit einem Prozentsatz.

**Ziel:** Drei zusammenhängende Verbesserungen an denselben Formularen (README-Roadmap):

1. Bundesland wird aus der PLZ vorbelegt (Dropdown, änderbar).
2. Grunderwerbsteuer wird nach Bundesland als überschreibbarer Vorschlag berechnet.
3. Gebäudeanteil ist wahlweise in Euro oder als Prozentsatz eingebbar (Switcher über dem Feld).

---

## Out of Scope

- **Investment-Rechner** (`InvestmentInputSections`): bleibt unverändert. Er hat kein Bundesland-Feld und wird ohnehin neu gebaut (README: "Investment-Rechner Neugestaltung").
- Keine Datenbank-Migration. `state`, `land_transfer_tax`, `building_value`, `land_value` behalten Typ und Bedeutung.
- Keine externe PLZ-API, keine Laufzeit-Netzwerkaufrufe.
- Bewegliche Sachen (Küche) und Instandhaltungsrücklage werden in der Bemessungsgrundlage der Grunderwerbsteuer nicht berücksichtigt.
- Wizard-Summary-Design und die übrigen README-Punkte sind eigene Themen.

---

## 1. Daten

### 1.1 Bundesländer und Steuersätze

**Datei:** `web/lib/data/landTransferTaxRates.ts`

Liste der 16 Bundesländer mit Code, Namen und Grunderwerbsteuersatz (Prozent). Quelle im Dateikommentar: Angabe des Projektinhabers, Stand 29.09.2026.

| Land | Satz | Land | Satz |
|---|---|---|---|
| Baden-Württemberg | 5,0 % | Niedersachsen | 5,0 % |
| Bayern | 3,5 % | Nordrhein-Westfalen | 6,5 % |
| Berlin | 6,0 % | Rheinland-Pfalz | 5,0 % |
| Brandenburg | 6,5 % | Saarland | 6,5 % |
| Bremen | 5,5 % | Sachsen | 5,5 % |
| Hamburg | 5,5 % | Sachsen-Anhalt | 5,0 % |
| Hessen | 6,0 % | Schleswig-Holstein | 6,5 % |
| Mecklenburg-Vorpommern | 6,0 % | Thüringen | 5,0 % |

Dazu `normalizeState(text)`: bildet bestehenden Freitext (Groß-/Kleinschreibung, Leerzeichen) auf den kanonischen Namen ab, sonst leer. Wird beim Laden bestehender Objekte angewendet, damit das Dropdown vorbelegt ist.

### 1.2 PLZ-Tabelle

**Datei:** `web/lib/data/plzToState.ts` (generiert), **Skript:** `web/scripts/generatePlzTable.ts`

Quelle: `german-postcodes.csv` (GitHub-Gist pmdroid/6ae8286a494cafce82b6ea5f6cc2362a, Spalten `Ort;Plz;Bundesland`). Die Rohdatei liegt nicht im Repo, das Skript liest sie von einem übergebenen Pfad. Kommentar im generierten File nennt Quelle und Erzeugungsdatum.

Bereinigung im Skript (Befunde der Vorprüfung):

- PLZ auf 5 Stellen mit führenden Nullen auffüllen (2.761 Zeilen hatten nur 4 Stellen).
- „Schlewig-Holstein" zu „Schleswig-Holstein" korrigieren.
- Zeilen ohne PLZ/Bundesland verwerfen (4 Leerzeilen).
- Ergebnis: 8.256 PLZ, Bereich 01067 bis 99998.
- Skript bricht ab, wenn ein Bundesland nicht zu den 16 kanonischen gehört.

Uneindeutige PLZ (26 Stück, in zwei Ländern) werden als eigene Liste mit allen Kandidaten ausgegeben, nicht per Mehrheit aufgelöst.

`lookupState(plz)` liefert:

- `{ kind: 'unique', state }`
- `{ kind: 'ambiguous', states: [...] }`
- `{ kind: 'unknown' }` (kein Treffer oder keine 5 Ziffern)

---

## 2. Verhalten

Alle Änderungen liegen in den wiederverwendeten Schritt-Komponenten. `PropertyEditForm` bindet `StepStammdaten`, `StepKauf` und `StepAfaSteuer` ebenfalls ein, ein Einbau deckt also Wizard und Bearbeiten-Formular ab.

### 2.1 Bundesland (Feature 1)

**Datei:** `web/components/wizard/steps/StepStammdaten.tsx`

Das Textfeld `state` wird zum Dropdown mit den 16 Ländern (Platzhalter „Bitte wählen"). Reaktion, sobald sich die PLZ zu einem vollständigen 5-Ziffern-Wert ändert (nicht beim Laden der Seite):

| Ergebnis | Aktion | Hinweis unter dem Dropdown |
|---|---|---|
| eindeutig | Land setzen | „Aus PLZ erkannt" |
| uneindeutig | Land leeren | „PLZ liegt in Hessen und Rheinland-Pfalz – bitte wählen" |
| unbekannt | Land unverändert | „Gültige Postleitzahl eingeben" |

Bei weniger als 5 Ziffern erscheint kein Hinweis. Das Dropdown bleibt jederzeit von Hand änderbar; die Grunderwerbsteuer richtet sich immer nach dem Dropdown-Wert.

### 2.2 Grunderwerbsteuer-Vorschlag (Feature 2)

**Datei:** `web/components/wizard/steps/StepKauf.tsx`, Hook in `web/lib/wizard/` (Name im Plan)

Vorschlag = Satz des gewählten Bundeslands × Gesamtkaufpreis (Kaufpreis Wohnung + Kaufpreis Stellplatz, wie der bestehende `purchasePrice`), auf Cent gerundet. Zwei Zustände:

- **Automatisch:** Feld wird bei Änderung von Bundesland oder Kaufpreis neu befüllt. Hinweis: „Sachsen 5,5 % (Vorschlag)".
- **Manuell:** Sobald der Nutzer das Feld ändert. Hinweis: „Sachsen 5,5 % wären 9.625 € · Zurücksetzen". „Zurücksetzen" wechselt zurück in „Automatisch".

Startzustand: neues Objekt im Wizard „Automatisch"; bestehendes Objekt im Bearbeiten-Formular „Manuell", damit gespeicherte Werte nie überschrieben werden. Ohne Bundesland: kein Vorschlag, Hinweis „Bundesland wählen, dann erscheint ein Vorschlag." Der Modus wird nicht persistiert.

### 2.3 Gebäudeanteil (Feature 3)

**Datei:** `web/components/wizard/steps/StepAfaSteuer.tsx`, neue Komponente für den Switcher

Segment-Switcher „€ | %" im Kopf der Karte „AfA & Steuer". Standard: „€".

- **€-Modus:** unverändert (zwei Euro-Felder, Abweichungswarnung ±5 %).
- **%-Modus:** ein Prozentfeld „Gebäudeanteil" (0 bis 100, bis zwei Nachkommastellen). Gebäudewert = Gesamtkaufpreis × Anteil, Grundstückswert = Gesamtkaufpreis − Gebäudewert; beide als Euro-Beträge in die bestehenden Formularfelder `buildingValue`/`landValue` geschrieben, Grundstückswert nur lesbar angezeigt. Die Abweichungswarnung entfällt. Ändert sich der Kaufpreis, bleibt der Prozentsatz erhalten und die Euro-Werte werden neu berechnet.
- **Umschalten € → %:** Anteil = Gebäudewert / Gesamtkaufpreis (bei Kaufpreis 0: leeres Feld).
- **Umschalten % → €:** die berechneten Euro-Werte stehen in den Feldern, nichts geht verloren.

Der Switcher-Zustand ist reiner UI-State. Die AfA-Berechnung und `canFinish` (Gebäude- und Grundstückswert > 0) bleiben unverändert; 100 % ergibt Grundstückswert 0 und blockiert wie bisher.

---

## 3. Fehlerfälle

- PLZ mit 5 Ziffern ohne Treffer: „Gültige Postleitzahl eingeben", Bundesland bleibt.
- PLZ in zwei Ländern: Land leer, Hinweis mit beiden Kandidaten.
- Kaufpreis 0: Vorschlag 0 €, keine Fehlermeldung.
- Gespeichertes `state` nicht erkennbar (`normalizeState` liefert leer): Dropdown leer, kein Vorschlag, gespeicherter Wert wird erst durch eine Auswahl ersetzt.
- Rundung: Prozentwerte werden vor der Anzeige gerundet (kein 3,4000000000000004, vgl. `PercentField`-Fix), Euro-Werte auf Cent.

---

## 4. Tests

- `lookupState`: Stichproben für alle 16 Länder (u. a. 01099 Sachsen, 80331 Bayern, 20095 Hamburg, 28195 Bremen), uneindeutige PLZ (65326, 88147, 21039), unbekannte und zu kurze Eingaben.
- Tabellenintegrität: nur 5-stellige PLZ, alle 16 Länder vorhanden, keine Duplikate.
- `normalizeState`: kanonische Namen, Schreibvarianten, Unbekanntes.
- Steuervorschlag: Berechnung je Land inkl. Stellplatz, Wechsel auf „Manuell", „Zurücksetzen", Startzustand Wizard vs. Bearbeiten, Kaufpreis 0.
- Gebäudeanteil: €→%→€ ohne Wertverlust, Rest-Berechnung, Kaufpreisänderung im %-Modus, Randwerte 0 % und 100 %, Rundung.
- Komponententests für die drei Hinweistexte.
