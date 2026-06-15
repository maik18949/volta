import Foundation

enum BenchmarkRating: String {
    case sehrGut = "Sehr gut"
    case gut = "Gut"
    case okay = "Okay"
    case schlecht = "Schlecht"
    case kritisch = "Kritisch"
    case neutral = "–"
}

struct BenchmarkResult {
    let rating: BenchmarkRating
    let context: String
}

enum BenchmarkContext {

    // MARK: - Bruttorendite

    static func grossYield(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.035:
            rating = .schlecht
            context = "Unter 3,5% — bei Finanzierungskosten von 4%+ oft nicht kostendeckend."
        case 0.035..<0.045:
            rating = .okay
            context = "3,5–4,5% — A-Lagen strukturell bedingt, kein Qualitätsmerkmal."
        case 0.045..<0.06:
            rating = .gut
            context = "4,5–6,0% — solide Bruttorendite im aktuellen Zinsumfeld."
        default:
            rating = .sehrGut
            context = "Über 6,0% — überdurchschnittlich. Risiken (Lage, Substanz) prüfen."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Nettorendite

    static func netYield(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.02:
            rating = .schlecht
            context = "Unter 2,0% — bei 4% Zinsen wirtschaftlich kritisch."
        case 0.02..<0.03:
            rating = .okay
            context = "2,0–3,0% — Faustregel: Nettorendite ≈ Bruttorendite minus 1,5–2,5 Prozentpunkte."
        case 0.03..<0.045:
            rating = .gut
            context = "3,0–4,5% — gute Nettorendite im aktuellen Markt."
        default:
            rating = .sehrGut
            context = "Über 4,5% — sehr gut. Auf Altbau-Instandhaltungsrisiken achten."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Mietmultiplikator

    static func mietmultiplikator(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<17:
            rating = .sehrGut
            context = "Unter 17 — günstiger Einstieg. C-Lagen mit Strukturrisiken prüfen."
        case 17..<22:
            rating = .gut
            context = "17–22 — B-Lagen typisch. Gute Ausgangsbasis."
        case 22..<28:
            rating = .okay
            context = "22–28 — A-Lagen Standard 2024. Cashflow oft negativ."
        default:
            rating = .schlecht
            context = "Über 28 — A-Lagen-Peak-Niveau. Bei 4%+ Zinsen kaum tragfähig."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Cash-on-Cash Return

    static func cashOnCash(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0:
            rating = .schlecht
            context = "Negativ — laufender Eigenkapitalverzehr. In A-Lagen mit Wertsteigerungspotenzial tolerierbar."
        case 0..<0.03:
            rating = .okay
            context = "0–3% — bei hohem Hebel in A/B-Städten realistisch. Stark eigenkapitalabhängig."
        case 0.03..<0.06:
            rating = .gut
            context = "3–6% — guter Cash-on-Cash. Tilgung baut zusätzlich EK auf."
        default:
            rating = .sehrGut
            context = "Über 6% — sehr gut. Niedrigen Kaufpreisfaktor oder viel EK eingesetzt."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - DSCR

    static func dscr(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.85:
            rating = .schlecht
            context = "Unter 0,85 — kritisches Refinanzierungsrisiko. NOI deckt Schuldendienst bei weitem nicht."
        case 0.85..<1.0:
            rating = .okay
            context = "0,85–1,0 — bei aktuellen Zinsen in A/B-Lagen strukturell normal. Einkommensnachweis entscheidend."
        case 1.0..<1.25:
            rating = .gut
            context = "1,0–1,25 — NOI deckt Schuldendienst. Banken fordern 1,2–1,5 für optimale Konditionen."
        default:
            rating = .sehrGut
            context = "Über 1,25 — sehr komfortabel. Spielraum für Zinsanstieg bei Prolongation."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - LTV

    static func ltv(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.60:
            rating = .sehrGut
            context = "Unter 60% — Pfandbrief-Beleihungsgrenze. Beste Zinskonditionen."
        case 0.60..<0.75:
            rating = .gut
            context = "60–75% — solide Beleihung. Guter Puffer für Wertkorrektur."
        case 0.75..<0.85:
            rating = .okay
            context = "75–85% — üblich bei Vollfinanzierung. Zinszuschlag ca. +1,3% gegenüber <60%."
        default:
            rating = .schlecht
            context = "Über 85% — hohes Refinanzierungsrisiko. Nebenkosten immer aus EK finanzieren."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Cashflow pro Monat

    static func cashflowMonthly(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<(-300):
            rating = .kritisch
            context = "Unter −300 €/Monat — kritisch. Belastung nicht durch Steuereffekt kompensierbar."
        case (-300)..<(-100):
            rating = .okay
            context = "−300 bis −100 €/Monat — in A-Lagen bei hohem Grenzsteuersatz tolerierbar. Tilgung zählt als EK-Aufbau."
        case (-100)..<100:
            rating = .gut
            context = "−100 bis +100 €/Monat — näherungsweise Breakeven. Gute Ausgangsposition."
        default:
            rating = .sehrGut
            context = "Über +100 €/Monat — positiver Cashflow. Selten in A-Städten mit aktuellen Zinsen."
        }
        return BenchmarkResult(rating: rating, context: context)
    }

    // MARK: - Leerstandsquote

    static func vacancyRate(_ value: Double) -> BenchmarkResult {
        let rating: BenchmarkRating
        let context: String
        switch value {
        case ..<0.02:
            rating = .sehrGut
            context = "Unter 2% — Markt-Leerstand Westdeutschland 2024. Angespannter Wohnungsmarkt."
        case 0.02..<0.05:
            rating = .gut
            context = "2–5% — konservative Planung inkl. Mieterwechsel und Zahlungsverzug."
        case 0.05..<0.08:
            rating = .okay
            context = "5–8% — erhöhtes Mietausfallrisiko. Lageanalyse empfohlen."
        default:
            rating = .schlecht
            context = "Über 8% — strukturschwache Region oder Objektmängel. Prüfen."
        }
        return BenchmarkResult(rating: rating, context: context)
    }
}
