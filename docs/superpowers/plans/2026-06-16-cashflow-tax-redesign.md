# Cashflow & Tax Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 systematic bugs in tax/cashflow calculations to align with German tax law (§9 EStG, §21 EStG, §7 AfA) and the verified Excel reference model.

**Architecture:** `StatusPeriodCalculator` (new) handles day-level status segmentation; `TaxCalculator.annualTaxableIncome` becomes the authoritative tax calculation for both "Laufendes Jahr" and "Prognose"; `CashflowCalculator` gains a parking-aware `ownerBorneRecoverableCosts`; `PropertyViewModel` is rewired to use all new functions.

**Tech Stack:** Swift 5.9, SwiftData, SwiftUI, XCTest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `Volta/Utilities/Extensions+Date.swift` | Modify | Add `day`, `daysInMonth()`, `firstDay(year:month:day:)` |
| `Volta/Calculations/StatusPeriodCalculator.swift` | **Create** | Day-level status segmentation; `incomeForMonth`; `leerstandDayFraction` |
| `Volta/Models/Property.swift` | Modify | 8 new fields: `hasParking`, HOA/parking/Grundsteuer splits |
| `Volta/Calculations/AmortizationCalculator.swift` | Modify | `interestForCalendarYear(year:loanStartDate:…)` |
| `Volta/Calculations/TaxCalculator.swift` | Modify | New `annualTaxableIncome`; `prognoseTaxableIncome`; fix divisor |
| `Volta/Calculations/CashflowCalculator.swift` | Modify | Fix `ownerBorneRecoverableCosts` for parking split |
| `Volta/ViewModels/PropertyViewModel.swift` | Modify | Rewire all tax/cashflow computed properties |
| `VoltaTests/TestFixtures.swift` | Modify | New fields + new expected values for acquisition-year logic |
| `VoltaTests/TaxCalculatorTests.swift` | Modify | Replace old tests + add acquisition-year / proration tests |
| `VoltaTests/StatusPeriodCalculatorTests.swift` | **Create** | `incomeForMonth`, `leerstandDayFraction`, mid-month transition |
| `VoltaTests/AmortizationCalculatorTests.swift` | Modify | Add `interestForCalendarYear` test |
| `Volta/Views/Property/TaxTab.swift` | Modify | Full redesign: Ist + Prognose with year picker |
| `Volta/Views/Property/SettingsTab.swift` | Modify | HOA split fields, Stellplatz fields, Grundsteuer Stellplatz |
| `Volta/Views/Property/CashflowTab.swift` | Modify | Update statusEntryRow income display |
| `Volta/Views/Property/StatusEntrySheet.swift` | Modify | Hide income field for non-Mietgarantie statuses |

---

## Task 1: Date Helpers

**Files:**
- Modify: `Volta/Volta/Utilities/Extensions+Date.swift`
- Test: `VoltaTests/Extensions+DateTests.swift` (create)

- [ ] **Step 1.1: Write the failing tests**

Create `VoltaTests/Extensions+DateTests.swift`:

```swift
import XCTest
@testable import Volta

final class DateExtensionsTests: XCTestCase {
    func test_day_returnsUTCDayComponent() {
        let d = Date.firstDay(year: 2026, month: 6, day: 15)
        XCTAssertEqual(d.day, 15)
    }

    func test_daysInMonth_june() {
        XCTAssertEqual(Date.firstDay(year: 2026, month: 6).daysInMonth(), 30)
    }

    func test_daysInMonth_february_nonLeap() {
        XCTAssertEqual(Date.firstDay(year: 2026, month: 2).daysInMonth(), 28)
    }

    func test_daysInMonth_february_leap() {
        XCTAssertEqual(Date.firstDay(year: 2028, month: 2).daysInMonth(), 29)
    }

    func test_firstDay_withDay_createsCorrectDate() {
        let d = Date.firstDay(year: 2026, month: 6, day: 16)
        XCTAssertEqual(d.year, 2026)
        XCTAssertEqual(d.month, 6)
        XCTAssertEqual(d.day, 16)
    }
}
```

- [ ] **Step 1.2: Run to confirm FAIL**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/DateExtensionsTests 2>&1 | tail -20
```
Expected: compile error (type not found) or test failure.

- [ ] **Step 1.3: Add helpers to Extensions+Date.swift**

After the existing `remainingMonthsInYear` property, add:

```swift
    /// Day of the month (1–31), UTC.
    var day: Int {
        Date.utcCalendar.component(.day, from: self)
    }

    /// Total number of days in this date's calendar month, UTC.
    func daysInMonth() -> Int {
        Date.utcCalendar.range(of: .day, in: .month, for: self)?.count ?? 30
    }

    /// Returns a Date for a specific day within a year/month (UTC).
    static func firstDay(year: Int, month: Int, day: Int) -> Date {
        var comps = DateComponents()
        comps.year = year; comps.month = month; comps.day = day
        return utcCalendar.date(from: comps) ?? Date()
    }
```

- [ ] **Step 1.4: Run tests to confirm PASS**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/DateExtensionsTests 2>&1 | tail -10
```
Expected: `** TEST SUCCEEDED **`

- [ ] **Step 1.5: Commit**

```bash
git add Volta/Volta/Utilities/Extensions+Date.swift Volta/VoltaTests/Extensions+DateTests.swift
git commit -m "feat: add day, daysInMonth, firstDay(year:month:day:) date helpers"
```

---

## Task 2: StatusPeriodCalculator

**Files:**
- Create: `Volta/Volta/Calculations/StatusPeriodCalculator.swift`
- Create: `VoltaTests/StatusPeriodCalculatorTests.swift`

Key computed values for tests (loanStart=Oct 2025, economicTransfer=Feb 1 2026, monthly payment=1242.85):
- `incomeForMonth` June 2026 with mid-month transition (leerstand Jun 1-15, vermietet Jun 16-30, coldRent=950, parking=48): `998 × 15/30 = 499.00`
- `leerstandDayFraction` June 2026 (15 leerstand days): `15.0/30.0 = 0.5`
- `incomeForMonth` future month (all vermietet projected): `998.00`
- `incomeForMonth` past month (all leerstand, incomeActual=999): `999.00` (Mietgarantie)

- [ ] **Step 2.1: Write failing tests**

Create `VoltaTests/StatusPeriodCalculatorTests.swift`:

```swift
import XCTest
@testable import Volta

final class StatusPeriodCalculatorTests: XCTestCase {

    private func makeEntry(_ status: PropertyStatus, year: Int, month: Int, day: Int = 1, income: Double = 0) -> StatusEntry {
        StatusEntry(statusFrom: Date.firstDay(year: year, month: month, day: day),
                    status: status, incomeActualMonthly: income)
    }

    func test_incomeForMonth_allVermietet() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [makeEntry(.vermietet, year: 2026, month: 2)]
        let result = StatusPeriodCalculator.incomeForMonth(june, statusHistory: history,
                      today: Date.firstDay(year: 2026, month: 12),
                      coldRentMonthly: 950, parkingRentMonthly: 48)
        XCTAssertEqual(result, 998.0, accuracy: 0.01)
    }

    func test_incomeForMonth_allLeerstand() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [makeEntry(.leerstand, year: 2026, month: 2)]
        let result = StatusPeriodCalculator.incomeForMonth(june, statusHistory: history,
                      today: Date.firstDay(year: 2026, month: 12),
                      coldRentMonthly: 950, parkingRentMonthly: 48)
        XCTAssertEqual(result, 0.0, accuracy: 0.01)
    }

    func test_incomeForMonth_mietgarantie_usesEntryIncome() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [makeEntry(.leerstandMietgarantie, year: 2026, month: 2, income: 999)]
        let result = StatusPeriodCalculator.incomeForMonth(june, statusHistory: history,
                      today: Date.firstDay(year: 2026, month: 12),
                      coldRentMonthly: 950, parkingRentMonthly: 48)
        XCTAssertEqual(result, 999.0, accuracy: 0.01)
    }

    func test_incomeForMonth_midMonthTransition_leerstandToVermietet() {
        // Jun 1–15: leerstand, Jun 16–30: vermietet (30-day month)
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [
            makeEntry(.leerstand,   year: 2026, month: 2),
            makeEntry(.vermietet,   year: 2026, month: 6, day: 16)
        ]
        let result = StatusPeriodCalculator.incomeForMonth(june, statusHistory: history,
                      today: Date.firstDay(year: 2026, month: 12),
                      coldRentMonthly: 950, parkingRentMonthly: 48)
        // vermietet: 15 days / 30 days × 998
        XCTAssertEqual(result, 998.0 * 15.0 / 30.0, accuracy: 0.01)
    }

    func test_leerstandDayFraction_halfMonth() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [
            makeEntry(.leerstand, year: 2026, month: 2),
            makeEntry(.vermietet, year: 2026, month: 6, day: 16)
        ]
        let result = StatusPeriodCalculator.leerstandDayFraction(
            month: june, statusHistory: history, today: Date.firstDay(year: 2026, month: 12))
        XCTAssertEqual(result, 15.0 / 30.0, accuracy: 0.0001)
    }

    func test_leerstandDayFraction_fullVermietet_isZero() {
        let june = Date.firstDay(year: 2026, month: 6)
        let history = [makeEntry(.vermietet, year: 2026, month: 2)]
        let result = StatusPeriodCalculator.leerstandDayFraction(
            month: june, statusHistory: history, today: Date.firstDay(year: 2026, month: 12))
        XCTAssertEqual(result, 0.0, accuracy: 0.0001)
    }

    func test_incomeForMonth_futureMont_projectsLastStatus() {
        let dec = Date.firstDay(year: 2026, month: 12)
        let history = [makeEntry(.vermietet, year: 2026, month: 2)]
        let today = Date.firstDay(year: 2026, month: 6)  // today is June
        let result = StatusPeriodCalculator.incomeForMonth(dec, statusHistory: history,
                      today: today, coldRentMonthly: 950, parkingRentMonthly: 48)
        XCTAssertEqual(result, 998.0, accuracy: 0.01)
    }

    func test_ownershipDayFraction_acquisitionMonthNotFirst() {
        // Feb 15 as economicTransferDate → 14 days owned out of 28
        let feb2026 = Date.firstDay(year: 2026, month: 2)
        let economicTransfer = Date.firstDay(year: 2026, month: 2, day: 15)
        let result = StatusPeriodCalculator.ownershipDayFraction(month: feb2026, economicTransferDate: economicTransfer)
        XCTAssertEqual(result, 14.0 / 28.0, accuracy: 0.0001)
    }

    func test_ownershipDayFraction_fullMonth() {
        let mar = Date.firstDay(year: 2026, month: 3)
        let economicTransfer = Date.firstDay(year: 2026, month: 2)
        let result = StatusPeriodCalculator.ownershipDayFraction(month: mar, economicTransferDate: economicTransfer)
        XCTAssertEqual(result, 1.0, accuracy: 0.0001)
    }

    func test_ownershipDayFraction_beforeAcquisition_isZero() {
        let jan = Date.firstDay(year: 2026, month: 1)
        let economicTransfer = Date.firstDay(year: 2026, month: 2)
        let result = StatusPeriodCalculator.ownershipDayFraction(month: jan, economicTransferDate: economicTransfer)
        XCTAssertEqual(result, 0.0, accuracy: 0.0001)
    }
}
```

- [ ] **Step 2.2: Run to confirm FAIL**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/StatusPeriodCalculatorTests 2>&1 | tail -5
```
Expected: compile error (type not found).

- [ ] **Step 2.3: Create StatusPeriodCalculator.swift**

Create `Volta/Volta/Calculations/StatusPeriodCalculator.swift`:

```swift
import Foundation

struct StatusSegment {
    let status: PropertyStatus
    let incomeActualMonthly: Double
    let dayFraction: Double
}

enum StatusPeriodCalculator {

    /// Breaks a calendar month into StatusSegments based on status history.
    /// Days after `today` within the current month are projected using the last known status.
    static func segments(
        month: Date,
        statusHistory: [StatusEntry],
        today: Date
    ) -> [StatusSegment] {
        let totalDays = month.daysInMonth()
        let sorted = statusHistory.sorted { $0.statusFrom < $1.statusFrom }
        let monthStart = month.firstDayOfMonth

        // Collect transition days within this month (day numbers that start a new status)
        var transitionDays: [Int] = [1]
        for entry in sorted {
            let entryMonth = entry.statusFrom.firstDayOfMonth
            if entryMonth == monthStart {
                let d = entry.statusFrom.day
                if d > 1 && !transitionDays.contains(d) {
                    transitionDays.append(d)
                }
            }
        }
        // Add today+1 as a transition point if we're in the current month
        // (to split actual vs projected days)
        let todayMonth = today.firstDayOfMonth
        if todayMonth == monthStart {
            let tomorrowDay = today.day + 1
            if tomorrowDay <= totalDays && !transitionDays.contains(tomorrowDay) {
                transitionDays.append(tomorrowDay)
            }
        }
        transitionDays.sort()

        var result: [StatusSegment] = []
        for i in 0..<transitionDays.count {
            let startDay = transitionDays[i]
            let endDay = i + 1 < transitionDays.count ? transitionDays[i + 1] - 1 : totalDays
            let days = endDay - startDay + 1

            // Date representing this segment's start — capped at today for projection
            let segmentDate = Date.firstDay(year: month.year, month: month.month, day: startDay)
            let lookupDate = segmentDate <= today ? segmentDate : today

            let activeEntry = sorted.filter { $0.statusFrom <= lookupDate }.last

            result.append(StatusSegment(
                status: activeEntry?.status ?? .leerstand,
                incomeActualMonthly: activeEntry?.incomeActualMonthly ?? 0,
                dayFraction: Double(days) / Double(totalDays)
            ))
        }
        return result
    }

    /// Monthly income from all status segments (tagesgenau).
    /// Vermietet: uses settings (coldRent + parking). Mietgarantie: uses entry income. Others: 0.
    static func incomeForMonth(
        _ month: Date,
        statusHistory: [StatusEntry],
        today: Date,
        coldRentMonthly: Double,
        parkingRentMonthly: Double
    ) -> Double {
        segments(month: month, statusHistory: statusHistory, today: today)
            .reduce(0.0) { sum, seg in
                switch seg.status {
                case .vermietet:
                    return sum + (coldRentMonthly + parkingRentMonthly) * seg.dayFraction
                case .leerstandMietgarantie:
                    return sum + seg.incomeActualMonthly * seg.dayFraction
                default:
                    return sum
                }
            }
    }

    /// Sum of dayFractions where the status is NOT vermietet.
    /// Used by TaxCalculator to determine how much of the month is owner-borne for recoverable costs.
    static func leerstandDayFraction(
        month: Date,
        statusHistory: [StatusEntry],
        today: Date
    ) -> Double {
        segments(month: month, statusHistory: statusHistory, today: today)
            .filter { $0.status != .vermietet }
            .reduce(0.0) { $0 + $1.dayFraction }
    }

    /// Fraction of the month owned (0.0 if before acquisition, 1.0 for full months, partial for acquisition month).
    static func ownershipDayFraction(month: Date, economicTransferDate: Date) -> Double {
        let monthStart = month.firstDayOfMonth
        let transferMonth = economicTransferDate.firstDayOfMonth

        if monthStart < transferMonth { return 0.0 }
        if monthStart > transferMonth { return 1.0 }

        // Same month: count days from transfer day to end of month
        let totalDays = month.daysInMonth()
        let transferDay = economicTransferDate.day
        let ownedDays = totalDays - transferDay + 1
        return Double(ownedDays) / Double(totalDays)
    }
}
```

- [ ] **Step 2.4: Run tests to confirm PASS**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/StatusPeriodCalculatorTests 2>&1 | tail -10
```
Expected: `** TEST SUCCEEDED **`

- [ ] **Step 2.5: Commit**

```bash
git add Volta/Volta/Calculations/StatusPeriodCalculator.swift Volta/VoltaTests/StatusPeriodCalculatorTests.swift
git commit -m "feat: add StatusPeriodCalculator with day-level status segmentation"
```

---

## Task 3: Property Model — New Fields

**Files:**
- Modify: `Volta/Volta/Models/Property.swift`

No tests needed; SwiftData migrations use property defaults. Existing tests should still compile.

- [ ] **Step 3.1: Add new fields to Property.swift**

In `Property.swift`, after `var otherCostsMonthly: Double = 0.0`, add:

```swift
    // Stellplatz (nur relevant wenn hasParking = true)
    var hasParking: Bool = false
    var hoaFeeParkingTotalMonthly: Double = 0.0
    var isHoaParkingSplit: Bool = false
    var hoaFeeParkingRecoverableMonthly: Double = 0.0
    var hoaFeeParkingMaintenanceReserveMonthly: Double = 0.0
    var parkingPropertyTaxAnnual: Double = 0.0

    // Hausgeld Wohnung — optionale Aufteilung
    var isHoaUnitSplit: Bool = false
    var hoaFeeMaintenanceReserveUnitMonthly: Double = 0.0
```

- [ ] **Step 3.2: Verify the app still compiles**

```bash
cd /Users/maikschlarmann/volta && xcodebuild build -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | tail -10
```
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 3.3: Commit**

```bash
git add Volta/Volta/Models/Property.swift
git commit -m "feat: add Property fields for parking HOA, Grundsteuer Stellplatz, and HOA unit split"
```

---

## Task 4: AmortizationCalculator — Interest for Calendar Year

**Files:**
- Modify: `Volta/Volta/Calculations/AmortizationCalculator.swift`
- Modify: `VoltaTests/AmortizationCalculatorTests.swift`

Key test values (loanAmount=230000, rate=0.043, payment=1242.85, loanStart=Oct 1 2025):
- `interestForCalendarYear(2025)` = Oct+Nov+Dec 2025 = 824.1667 + 822.6630 + 821.1596 = **2467.99**
- `interestForCalendarYear(2026)` = Jan–Dec 2026 (months 4–15) = **9734.81**

- [ ] **Step 4.1: Write failing tests**

Append to `VoltaTests/AmortizationCalculatorTests.swift`:

```swift
    func test_interestForCalendarYear_2025_threeMonths() {
        let result = AmortizationCalculator.interestForCalendarYear(
            year: 2025,
            loanStartDate: TestFixtures.loanStartDate,    // Oct 1 2025
            loanAmount: TestFixtures.loanAmount,          // 230000
            interestRate: TestFixtures.interestRate,      // 0.043
            monthlyPayment: TestFixtures.monthlyMortgageActual  // 1242.85
        )
        XCTAssertEqual(result, 2467.99, accuracy: 1.0)
    }

    func test_interestForCalendarYear_2026_fullYear() {
        let result = AmortizationCalculator.interestForCalendarYear(
            year: 2026,
            loanStartDate: TestFixtures.loanStartDate,
            loanAmount: TestFixtures.loanAmount,
            interestRate: TestFixtures.interestRate,
            monthlyPayment: TestFixtures.monthlyMortgageActual
        )
        XCTAssertEqual(result, 9734.81, accuracy: 1.0)
    }

    func test_interestForCalendarYear_beforeLoanStart_isZero() {
        let result = AmortizationCalculator.interestForCalendarYear(
            year: 2024,
            loanStartDate: TestFixtures.loanStartDate,
            loanAmount: TestFixtures.loanAmount,
            interestRate: TestFixtures.interestRate,
            monthlyPayment: TestFixtures.monthlyMortgageActual
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.01)
    }
```

- [ ] **Step 4.2: Run to confirm FAIL**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/AmortizationCalculatorTests 2>&1 | tail -10
```
Expected: compile error (method not found).

- [ ] **Step 4.3: Add method to AmortizationCalculator.swift**

After `amortizationSchedule`, add:

```swift
    /// Total interest paid within a calendar year, using the amortization schedule.
    /// Only counts months that fall within `year`. Months before loanStartDate are excluded.
    static func interestForCalendarYear(
        year: Int,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double
    ) -> Double {
        guard loanAmount > 0, interestRate > 0, monthlyPayment > 0 else { return 0 }
        guard loanStartDate.year <= year else { return 0 }

        // Calculate how many months from loanStart to end of target year
        let yearEnd = Date.firstDay(year: year, month: 12, day: 31)
        guard let totalMonths = loanStartDate.monthsBetween(yearEnd), totalMonths > 0 else { return 0 }

        let schedule = amortizationSchedule(
            loanAmount: loanAmount,
            interestRate: interestRate,
            monthlyPayment: monthlyPayment,
            loanStartDate: loanStartDate,
            months: totalMonths + 1
        )

        return schedule
            .filter { $0.date.year == year }
            .reduce(0.0) { $0 + $1.interest }
    }
```

- [ ] **Step 4.4: Run tests to confirm PASS**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/AmortizationCalculatorTests 2>&1 | tail -10
```
Expected: `** TEST SUCCEEDED **`

- [ ] **Step 4.5: Commit**

```bash
git add Volta/Volta/Calculations/AmortizationCalculator.swift Volta/VoltaTests/AmortizationCalculatorTests.swift
git commit -m "feat: add AmortizationCalculator.interestForCalendarYear with exact amortizing interest"
```

---

## Task 5: TaxCalculator — Annual Taxable Income

**Files:**
- Modify: `Volta/Volta/Calculations/TaxCalculator.swift`
- Modify: `VoltaTests/TaxCalculatorTests.swift`

Key test values (Feb 1 2026 acquisition, loanStart Oct 2025, all fixtures from TestFixtures):

`hoaUnitNonRecoverableMonthly_forTax = 125.0` (hoaTotal 417 - recoverable 292 — no WEG reserve split in fixture)
`propertyManagementMonthly = 33.0`
`taxDeductibleNonRecoverableMonthly = 125 + 33 = 158.0`

**allVermietet2026** (11 months Feb-Dec):
- income = 998 × 11 = 10978.00
- interest2026 = 9734.81
- afaAcq = 782.33 × 11 = 8605.63
- nonRecoverable = 158 × 11 = 1738.00
- recoverable WE = 0, Grundsteuer WE = 0
- **taxableIncome = 10978 − 9734.81 − 8605.63 − 1738 = −9100.44**
- taxEffectYearly = 9100.44 × 0.42 = **3822.18**
- taxEffectMonthly = 3822.18 / 11 = **347.47**

**allLeerstand2026** (11 months):
- income = 0; recoverable WE = 292 × 11 = 3212; Grundsteuer WE = 17.0833 × 11 = 187.92
- **taxableIncome = 0 − 9734.81 − 8605.63 − 1738 − 3212 − 187.92 = −23478.36**
- taxEffectYearly = 23478.36 × 0.42 = **9860.91**

**mixed2026** (leerstand Feb, vermietet Mar-Dec = 10 months vermietet, 1 leerstand):
- income = 998 × 10 = 9980; recoverable WE = 292 × 1 = 292; Grundsteuer WE = 17.08
- **taxableIncome = 9980 − 9734.81 − 8605.63 − 1738 − 292 − 17.08 = −10407.52**
- taxEffectYearly = 10407.52 × 0.42 = **4371.16**

- [ ] **Step 5.1: Write failing tests**

Replace all existing tests in `VoltaTests/TaxCalculatorTests.swift`:

```swift
import XCTest
@testable import Volta

final class TaxCalculatorTests: XCTestCase {
    let f = TestFixtures.self

    // MARK: - annualTaxableIncome

    func test_annualTaxableIncome_allVermietet_acquisitionYear() {
        let history = [StatusEntry(statusFrom: f.economicTransferDate, status: .vermietet, incomeActualMonthly: 0)]
        let result = TaxCalculator.annualTaxableIncome(
            year: 2026,
            statusHistory: history,
            economicTransferDate: f.economicTransferDate,
            loanStartDate: f.loanStartDate,
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            afaBasis: f.afaBasis,
            depreciationRate: f.depreciationRate,
            hoaUnitNonRecoverableMonthly: 125.0,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: 0,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0,
            propertyManagementMonthly: f.propertyManagementMonthly,
            otherCostsMonthly: 0,
            coldRentMonthly: f.coldRentMonthly,
            parkingRentMonthly: f.parkingRentMonthly,
            today: Date.firstDay(year: 2026, month: 12, day: 31)
        )
        XCTAssertEqual(result, -9100.44, accuracy: 5.0)
    }

    func test_annualTaxableIncome_allLeerstand_acquisitionYear() {
        let history = [StatusEntry(statusFrom: f.economicTransferDate, status: .leerstand, incomeActualMonthly: 0)]
        let result = TaxCalculator.annualTaxableIncome(
            year: 2026,
            statusHistory: history,
            economicTransferDate: f.economicTransferDate,
            loanStartDate: f.loanStartDate,
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            afaBasis: f.afaBasis,
            depreciationRate: f.depreciationRate,
            hoaUnitNonRecoverableMonthly: 125.0,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: 0,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0,
            propertyManagementMonthly: f.propertyManagementMonthly,
            otherCostsMonthly: 0,
            coldRentMonthly: f.coldRentMonthly,
            parkingRentMonthly: f.parkingRentMonthly,
            today: Date.firstDay(year: 2026, month: 12, day: 31)
        )
        XCTAssertEqual(result, -23478.36, accuracy: 5.0)
    }

    func test_annualTaxableIncome_mixed_leerstandToVermietet() {
        let history = [
            StatusEntry(statusFrom: f.economicTransferDate,          status: .leerstand,  incomeActualMonthly: 0),
            StatusEntry(statusFrom: Date.firstDay(year: 2026, month: 3), status: .vermietet, incomeActualMonthly: 0)
        ]
        let result = TaxCalculator.annualTaxableIncome(
            year: 2026,
            statusHistory: history,
            economicTransferDate: f.economicTransferDate,
            loanStartDate: f.loanStartDate,
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            afaBasis: f.afaBasis,
            depreciationRate: f.depreciationRate,
            hoaUnitNonRecoverableMonthly: 125.0,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: 0,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0,
            propertyManagementMonthly: f.propertyManagementMonthly,
            otherCostsMonthly: 0,
            coldRentMonthly: f.coldRentMonthly,
            parkingRentMonthly: f.parkingRentMonthly,
            today: Date.firstDay(year: 2026, month: 12, day: 31)
        )
        XCTAssertEqual(result, -10407.52, accuracy: 5.0)
    }

    func test_annualTaxableIncome_fullYear_noProration() {
        let history = [StatusEntry(statusFrom: Date.firstDay(year: 2027, month: 1), status: .vermietet, incomeActualMonthly: 0)]
        // Full year 2027, acquisition was 2026 → 12 months, full AfA
        let interest2027 = AmortizationCalculator.interestForCalendarYear(
            year: 2027, loanStartDate: f.loanStartDate, loanAmount: f.loanAmount,
            interestRate: f.interestRate, monthlyPayment: f.monthlyMortgageActual)
        let afa2027 = f.afaBasis * f.depreciationRate  // full year AfA
        let income2027 = (f.coldRentMonthly + f.parkingRentMonthly) * 12
        let expected = income2027 - interest2027 - afa2027 - (125.0 + f.propertyManagementMonthly) * 12
        let result = TaxCalculator.annualTaxableIncome(
            year: 2027,
            statusHistory: history,
            economicTransferDate: f.economicTransferDate,
            loanStartDate: f.loanStartDate,
            loanAmount: f.loanAmount,
            interestRate: f.interestRate,
            monthlyPayment: f.monthlyMortgageActual,
            afaBasis: f.afaBasis,
            depreciationRate: f.depreciationRate,
            hoaUnitNonRecoverableMonthly: 125.0,
            hoaUnitRecoverableMonthly: f.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: 0,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: f.propertyTaxMonthly,
            propertyTaxParkingMonthly: 0,
            propertyManagementMonthly: f.propertyManagementMonthly,
            otherCostsMonthly: 0,
            coldRentMonthly: f.coldRentMonthly,
            parkingRentMonthly: f.parkingRentMonthly,
            today: Date.firstDay(year: 2027, month: 12, day: 31)
        )
        XCTAssertEqual(result, expected, accuracy: 5.0)
    }

    // MARK: - taxEffectYearly / taxEffectMonthly (unchanged API)

    func test_taxEffectYearly_negativeTaxableIncome_isPositive() {
        XCTAssertGreaterThan(TaxCalculator.taxEffectYearly(taxableIncomeVV: -9100.44, marginalTaxRate: 0.42), 0)
    }

    func test_taxEffectYearly_value() {
        XCTAssertEqual(TaxCalculator.taxEffectYearly(taxableIncomeVV: -9100.44, marginalTaxRate: 0.42),
                       3822.18, accuracy: 1.0)
    }

    func test_taxEffectMonthly_divisorIsOwnershipMonths() {
        // With 11 ownership months, monthly = yearly / 11 (not /12)
        let yearly = TaxCalculator.taxEffectYearly(taxableIncomeVV: -9100.44, marginalTaxRate: 0.42)
        let monthly = TaxCalculator.taxEffectMonthly(taxEffectYearly: yearly, ownershipMonths: 11)
        XCTAssertEqual(monthly, yearly / 11.0, accuracy: 0.01)
    }
}
```

- [ ] **Step 5.2: Run to confirm FAIL**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/TaxCalculatorTests 2>&1 | tail -10
```
Expected: compile error (method signatures changed).

- [ ] **Step 5.3: Rewrite TaxCalculator.swift**

Replace the entire file content:

```swift
import Foundation

enum TaxCalculator {

    /// Full annual taxable income for V+V (§21 EStG).
    /// Handles acquisition-year proration, amortizing interest, day-level status costs.
    static func annualTaxableIncome(
        year: Int,
        statusHistory: [StatusEntry],
        economicTransferDate: Date,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double,
        afaBasis: Double,
        depreciationRate: Double,
        hoaUnitNonRecoverableMonthly: Double,
        hoaUnitRecoverableMonthly: Double,
        hoaParkingNonRecoverableMonthly: Double,
        hoaParkingRecoverableMonthly: Double,
        propertyTaxUnitMonthly: Double,
        propertyTaxParkingMonthly: Double,
        propertyManagementMonthly: Double,
        otherCostsMonthly: Double,
        coldRentMonthly: Double,
        parkingRentMonthly: Double,
        today: Date = Date()
    ) -> Double {
        let isAcquisitionYear = year == economicTransferDate.year

        // 1. Ownership months in this year
        let ownershipMonths: [Date] = (1...12).compactMap { month -> Date? in
            let d = Date.firstDay(year: year, month: month)
            let fraction = StatusPeriodCalculator.ownershipDayFraction(
                month: d, economicTransferDate: economicTransferDate)
            return fraction > 0 ? d : nil
        }
        guard !ownershipMonths.isEmpty else { return 0 }

        // 2. Amortizing interest for the calendar year (includes months before Besitzübergang)
        let interestYear = AmortizationCalculator.interestForCalendarYear(
            year: year,
            loanStartDate: loanStartDate,
            loanAmount: loanAmount,
            interestRate: interestRate,
            monthlyPayment: monthlyPayment
        )

        // 3. AfA — prorated in acquisition year, full thereafter
        let monthsForAfa = ownershipMonths.count
        let afaYear: Double
        if isAcquisitionYear {
            afaYear = (afaBasis * depreciationRate / 12.0) * Double(monthsForAfa)
        } else {
            afaYear = afaBasis * depreciationRate
        }

        // 4. Income and status-dependent deductions (day-level, per ownership month)
        var totalIncome: Double = 0
        var ownershipMonthEquivalent: Double = 0  // sum of ownership day fractions
        var leerstandEquivalentMonths: Double = 0  // sum of leerstand day fractions × ownership fraction

        for month in ownershipMonths {
            let ownerFraction = StatusPeriodCalculator.ownershipDayFraction(
                month: month, economicTransferDate: economicTransferDate)
            ownershipMonthEquivalent += ownerFraction

            let leerstandFraction = StatusPeriodCalculator.leerstandDayFraction(
                month: month, statusHistory: statusHistory, today: today)

            // Ownership fraction × leerstand fraction = actual leerstand for cost deduction
            leerstandEquivalentMonths += ownerFraction * leerstandFraction

            totalIncome += StatusPeriodCalculator.incomeForMonth(
                month,
                statusHistory: statusHistory,
                today: today,
                coldRentMonthly: coldRentMonthly,
                parkingRentMonthly: parkingRentMonthly
            ) * ownerFraction  // scale by ownership fraction for partial first month
        }

        // 5. Deductions
        let alwaysDeductions = (
            hoaUnitNonRecoverableMonthly
            + hoaParkingNonRecoverableMonthly
            + hoaParkingRecoverableMonthly   // Stellplatz recoverable: always owner-borne
            + propertyTaxParkingMonthly      // Stellplatz Grundsteuer: always owner-borne
            + propertyManagementMonthly
            + otherCostsMonthly
        ) * ownershipMonthEquivalent

        let leerstandDeductions = (
            hoaUnitRecoverableMonthly
            + propertyTaxUnitMonthly
        ) * leerstandEquivalentMonths

        return totalIncome - interestYear - afaYear - alwaysDeductions - leerstandDeductions
    }

    /// Jährlicher Steuereffekt: negatives Ergebnis × Grenzsteuersatz.
    static func taxEffectYearly(taxableIncomeVV: Double, marginalTaxRate: Double) -> Double {
        taxableIncomeVV * marginalTaxRate * -1.0
    }

    /// Monatlicher Steuereffekt = jährlicher Effekt ÷ Eigentumsmonate im Jahr.
    static func taxEffectMonthly(taxEffectYearly: Double, ownershipMonths: Int) -> Double {
        guard ownershipMonths > 0 else { return 0 }
        return taxEffectYearly / Double(ownershipMonths)
    }

    /// Prognose-Steuerergebnis: Vollvermietung, 12 Monate, kein Status-Split für WE.
    /// Stellplatz-Kosten werden immer abgezogen (Eigentümer trägt sie immer).
    static func prognoseAnnualTaxableIncome(
        year: Int,
        loanStartDate: Date,
        loanAmount: Double,
        interestRate: Double,
        monthlyPayment: Double,
        afaBasis: Double,
        depreciationRate: Double,
        hoaUnitNonRecoverableMonthly: Double,
        hoaParkingNonRecoverableMonthly: Double,
        hoaParkingRecoverableMonthly: Double,
        propertyTaxParkingMonthly: Double,
        propertyManagementMonthly: Double,
        otherCostsMonthly: Double,
        coldRentMonthly: Double,
        parkingRentMonthly: Double
    ) -> Double {
        let interest = AmortizationCalculator.interestForCalendarYear(
            year: year, loanStartDate: loanStartDate, loanAmount: loanAmount,
            interestRate: interestRate, monthlyPayment: monthlyPayment)
        let afa = afaBasis * depreciationRate
        let income = (coldRentMonthly + parkingRentMonthly) * 12
        let deductions = (hoaUnitNonRecoverableMonthly + hoaParkingNonRecoverableMonthly
            + hoaParkingRecoverableMonthly + propertyTaxParkingMonthly
            + propertyManagementMonthly + otherCostsMonthly) * 12
        return income - interest - afa - deductions
    }
}
```

- [ ] **Step 5.4: Run tests**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/TaxCalculatorTests 2>&1 | tail -10
```
Expected: `** TEST SUCCEEDED **`

- [ ] **Step 5.5: Run all tests to check for regressions**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep -E "(PASS|FAIL|error:)" | head -30
```

Fix any compile errors in other test files caused by the removed `taxEffectMonthly(taxableIncomeVV:marginalTaxRate:)` signature. In any test file calling the old signature, replace with the new `taxEffectMonthly(taxEffectYearly:ownershipMonths:)`.

- [ ] **Step 5.6: Commit**

```bash
git add Volta/Volta/Calculations/TaxCalculator.swift Volta/VoltaTests/TaxCalculatorTests.swift
git commit -m "feat: rewrite TaxCalculator with annualTaxableIncome, amortizing interest, day-level status, correct divisor"
```

---

## Task 6: CashflowCalculator — Fix Parking Split

**Files:**
- Modify: `Volta/Volta/Calculations/CashflowCalculator.swift`
- Modify: `VoltaTests/CashflowCalculatorTests.swift`

- [ ] **Step 6.1: Write failing tests**

Append to `VoltaTests/CashflowCalculatorTests.swift`:

```swift
    func test_ownerBorneRecoverable_vermietet_onlyParking() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .vermietet,
            hoaUnitRecoverableMonthly: 292,
            hoaParkingRecoverableMonthly: 50,
            propertyTaxUnitMonthly: 17,
            propertyTaxParkingMonthly: 10
        )
        // vermietet: WE recoverable = 0 (Mieter zahlt), Stellplatz = always
        XCTAssertEqual(result, 60.0, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_leerstand_allOwnerBorne() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .leerstand,
            hoaUnitRecoverableMonthly: 292,
            hoaParkingRecoverableMonthly: 50,
            propertyTaxUnitMonthly: 17,
            propertyTaxParkingMonthly: 10
        )
        XCTAssertEqual(result, 369.0, accuracy: 0.01)
    }

    func test_ownerBorneRecoverable_noParking_vermietet_isZero() {
        let result = CashflowCalculator.ownerBorneRecoverableCosts(
            status: .vermietet,
            hoaUnitRecoverableMonthly: 292,
            hoaParkingRecoverableMonthly: 0,
            propertyTaxUnitMonthly: 17,
            propertyTaxParkingMonthly: 0
        )
        XCTAssertEqual(result, 0.0, accuracy: 0.01)
    }
```

- [ ] **Step 6.2: Run to confirm FAIL**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/CashflowCalculatorTests 2>&1 | tail -10
```
Expected: compile error (wrong signature).

- [ ] **Step 6.3: Update CashflowCalculator.swift**

Replace `ownerBorneRecoverableCosts`:

```swift
    /// Umlagefähige Kosten die der Eigentümer trägt.
    /// WE-Kosten: nur bei Nicht-Vermietung. Stellplatz-Kosten: immer.
    static func ownerBorneRecoverableCosts(
        status: PropertyStatus,
        hoaUnitRecoverableMonthly: Double,
        hoaParkingRecoverableMonthly: Double,
        propertyTaxUnitMonthly: Double,
        propertyTaxParkingMonthly: Double
    ) -> Double {
        let parkingPart = hoaParkingRecoverableMonthly + propertyTaxParkingMonthly
        switch status {
        case .vermietet:
            return parkingPart
        default:
            return hoaUnitRecoverableMonthly + propertyTaxUnitMonthly + parkingPart
        }
    }
```

Remove the old `propertyInsuranceMonthly` parameter (it was unused in the model; insurance is 0 in fixtures).

- [ ] **Step 6.4: Run tests to confirm PASS**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/CashflowCalculatorTests 2>&1 | tail -10
```

- [ ] **Step 6.5: Fix any ViewModel compile errors from signature change**

Search for `ownerBorneRecoverableCosts` in the codebase:

```bash
grep -rn "ownerBorneRecoverableCosts" /Users/maikschlarmann/volta/Volta/
```

Update all call sites to use the new signature (remove `propertyInsuranceMonthly` parameter).

- [ ] **Step 6.6: Commit**

```bash
git add Volta/Volta/Calculations/CashflowCalculator.swift Volta/VoltaTests/CashflowCalculatorTests.swift
git commit -m "fix: CashflowCalculator.ownerBorneRecoverableCosts — Stellplatz always owner-borne, remove insurance param"
```

---

## Task 7: PropertyViewModel — Rewire

**Files:**
- Modify: `Volta/Volta/ViewModels/PropertyViewModel.swift`

- [ ] **Step 7.1: Update the ViewModel**

Replace `PropertyViewModel.swift` with the updated version. Key changes:

1. **New derived cost properties** (add after `propertyInsuranceMonthly`):

```swift
    // Hausgeld Wohnung — nicht umlagefähig für Steuer (ohne Rücklage)
    var hoaFeeNonRecoverableUnitMonthly: Double {
        property.isHoaUnitSplit
            ? property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly - property.hoaFeeMaintenanceReserveUnitMonthly
            : property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly
    }

    // Hausgeld Stellplatz — nicht umlagefähig für Steuer
    var hoaFeeNonRecoverableParkingMonthly: Double {
        property.isHoaParkingSplit
            ? property.hoaFeeParkingTotalMonthly - property.hoaFeeParkingRecoverableMonthly - property.hoaFeeParkingMaintenanceReserveMonthly
            : property.hoaFeeParkingTotalMonthly
    }

    var propertyTaxUnitMonthly: Double { property.propertyTaxAnnual / 12.0 }
    var propertyTaxParkingMonthly: Double { property.parkingPropertyTaxAnnual / 12.0 }

    // Cashflow-Kosten nicht umlagefähig (inkl. Rücklage — echter Geldabfluss)
    var operatingCostsNonRecoverableMonthly: Double {
        let hoaUnit = property.isHoaUnitSplit
            ? hoaFeeNonRecoverableUnitMonthly + property.hoaFeeMaintenanceReserveUnitMonthly
            : property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly
        let hoaParking = property.isHoaParkingSplit
            ? hoaFeeNonRecoverableParkingMonthly + property.hoaFeeParkingMaintenanceReserveMonthly
            : property.hoaFeeParkingTotalMonthly
        return hoaUnit + hoaParking + propertyManagementMonthly
            + property.maintenanceReserveMonthly + property.otherCostsMonthly
    }

    var operatingCostsNonRecoverableYearly: Double { operatingCostsNonRecoverableMonthly * 12.0 }
```

2. **Remove old `interestAnnual` and `taxableIncomeVV` computed properties.**

3. **Add `ownershipMonthsCount` helper**:

```swift
    var ownershipMonthsCurrentYear: Int {
        let year = Calendar.current.component(.year, from: Date())
        let transferYear = Calendar.current.component(.year, from: property.economicTransferDate)
        if year > transferYear { return 12 }
        if year < transferYear { return 0 }
        return 13 - property.economicTransferDate.month
    }
```

4. **Replace `taxableIncomeVV`, `taxEffectMonthly`**:

```swift
    var annualTaxableIncomeCurrentYear: Double {
        TaxCalculator.annualTaxableIncome(
            year: Calendar.current.component(.year, from: Date()),
            statusHistory: property.statusHistory,
            economicTransferDate: property.economicTransferDate,
            loanStartDate: property.loanStartDate,
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            monthlyPayment: monthlyMortgage,
            afaBasis: afaBasis,
            depreciationRate: property.depreciationRate,
            hoaUnitNonRecoverableMonthly: hoaFeeNonRecoverableUnitMonthly,
            hoaUnitRecoverableMonthly: property.hoaFeeRecoverableMonthly,
            hoaParkingNonRecoverableMonthly: hoaFeeNonRecoverableParkingMonthly,
            hoaParkingRecoverableMonthly: property.hoaFeeParkingRecoverableMonthly,
            propertyTaxUnitMonthly: propertyTaxUnitMonthly,
            propertyTaxParkingMonthly: propertyTaxParkingMonthly,
            propertyManagementMonthly: propertyManagementMonthly,
            otherCostsMonthly: property.otherCostsMonthly,
            coldRentMonthly: property.coldRentMonthly,
            parkingRentMonthly: property.parkingRentMonthly
        )
    }

    var taxEffectYearlyCurrentYear: Double {
        TaxCalculator.taxEffectYearly(
            taxableIncomeVV: annualTaxableIncomeCurrentYear,
            marginalTaxRate: property.marginalTaxRate
        )
    }

    var taxEffectMonthlyCurrentYear: Double {
        TaxCalculator.taxEffectMonthly(
            taxEffectYearly: taxEffectYearlyCurrentYear,
            ownershipMonths: ownershipMonthsCurrentYear
        )
    }
```

5. **`prognoseTaxableIncome`** (takes external Prognose params — keeps ViewModel thin):

```swift
    func prognoseTaxableIncome(year: Int, coldRent: Double, parkingRent: Double, hoaTotal: Double) -> Double {
        let hoaNonRecovUnitRatio: Double = property.hoaFeeTotalMonthly > 0
            ? hoaFeeNonRecoverableUnitMonthly / property.hoaFeeTotalMonthly : 0
        let progHoaUnit = hoaTotal * hoaNonRecovUnitRatio
        return TaxCalculator.prognoseAnnualTaxableIncome(
            year: year,
            loanStartDate: property.loanStartDate,
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            monthlyPayment: monthlyMortgage,
            afaBasis: afaBasis,
            depreciationRate: property.depreciationRate,
            hoaUnitNonRecoverableMonthly: progHoaUnit,
            hoaParkingNonRecoverableMonthly: hoaFeeNonRecoverableParkingMonthly,
            hoaParkingRecoverableMonthly: property.hoaFeeParkingRecoverableMonthly,
            propertyTaxParkingMonthly: propertyTaxParkingMonthly,
            propertyManagementMonthly: propertyManagementMonthly,
            otherCostsMonthly: property.otherCostsMonthly,
            coldRentMonthly: coldRent,
            parkingRentMonthly: parkingRent
        )
    }
```

6. **Update `cashflowActual`** to use `StatusPeriodCalculator.incomeForMonth` and new `ownerBorneRecoverableCosts`:

```swift
    func cashflowActual(for month: Date) -> (beforeTax: Double, afterTax: Double)? {
        guard month.firstDayOfMonth >= property.economicTransferDate.firstDayOfMonth else { return nil }
        guard !property.statusHistory.isEmpty else { return nil }

        let income = StatusPeriodCalculator.incomeForMonth(
            month, statusHistory: property.statusHistory, today: Date(),
            coldRentMonthly: property.coldRentMonthly,
            parkingRentMonthly: property.parkingRentMonthly)

        let activeStatus = property.statusHistory
            .sorted { $0.statusFrom < $1.statusFrom }
            .last { $0.statusFrom.firstDayOfMonth <= month.firstDayOfMonth }

        let ownerRecoverable = CashflowCalculator.ownerBorneRecoverableCosts(
            status: activeStatus?.status ?? .leerstand,
            hoaUnitRecoverableMonthly: property.hoaFeeRecoverableMonthly,
            hoaParkingRecoverableMonthly: property.hoaFeeParkingRecoverableMonthly,
            propertyTaxUnitMonthly: propertyTaxUnitMonthly,
            propertyTaxParkingMonthly: propertyTaxParkingMonthly
        )

        let monthStart = month.firstDayOfMonth
        let extraordinary = property.extraordinaryCosts
            .filter { $0.costMonth.firstDayOfMonth == monthStart }
            .reduce(0) { $0 + $1.amount }

        let beforeTax = CashflowCalculator.cashflowBeforeTax(
            incomeActualMonthly: income,
            monthlyMortgage: monthlyMortgage,
            operatingCostsNonRecoverableMonthly: operatingCostsNonRecoverableMonthly,
            ownerBorneRecoverableMonthly: ownerRecoverable,
            extraordinaryCostsThisMonth: extraordinary
        )
        let afterTax = CashflowCalculator.cashflowAfterTax(
            cashflowBeforeTax: beforeTax,
            taxEffectMonthly: taxEffectMonthlyCurrentYear
        )
        return (beforeTax, afterTax)
    }
```

- [ ] **Step 7.2: Build to check for compile errors**

```bash
cd /Users/maikschlarmann/volta && xcodebuild build -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep "error:" | head -20
```

Fix all compile errors (likely usages of old `taxableIncomeVV`, `taxEffectMonthly`, `interestAnnual` properties in Views).

- [ ] **Step 7.3: Run all tests**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep -E "(PASS|FAIL|error:)" | head -30
```

- [ ] **Step 7.4: Commit**

```bash
git add Volta/Volta/ViewModels/PropertyViewModel.swift
git commit -m "feat: rewire PropertyViewModel to use annualTaxableIncome, StatusPeriodCalculator, parking-aware costs"
```

---

## Task 8: StatusEntrySheet — Hide Income for Non-Mietgarantie

**Files:**
- Modify: `Volta/Volta/Views/Property/StatusEntrySheet.swift`

- [ ] **Step 8.1: Find and read the sheet**

```bash
find /Users/maikschlarmann/volta/Volta -name "StatusEntrySheet.swift"
```

- [ ] **Step 8.2: Wrap the income field in a conditional**

Find the income entry field (likely a `CurrencyField` for `incomeActualMonthly`) and wrap it:

```swift
if selectedStatus == .leerstandMietgarantie {
    CurrencyField(label: "Mietgarantie-Betrag/Monat", value: $entry.incomeActualMonthly)
}
```

Remove it from all other status cases. The field is only meaningful for Mietgarantie.

- [ ] **Step 8.3: Build and verify**

```bash
cd /Users/maikschlarmann/volta && xcodebuild build -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | tail -5
```

- [ ] **Step 8.4: Commit**

```bash
git add Volta/Volta/Views/Property/StatusEntrySheet.swift
git commit -m "fix: hide income field in StatusEntrySheet for non-Mietgarantie statuses"
```

---

## Task 9: SettingsTab — New Fields

**Files:**
- Modify: `Volta/Volta/Views/Property/SettingsTab.swift`

- [ ] **Step 9.1: Update kaufSection — add hasParking toggle**

Replace the `kaufSection`'s `CurrencyField(label: "Kaufpreis Stellplatz", ...)` block:

```swift
private var kaufSection: some View {
    formSection(title: "Kauf & Nebenkosten") {
        if property.hasParking {
            CurrencyField(label: "Kaufpreis Wohnung *", value: $property.purchasePriceUnit, isRequired: true)
            CurrencyField(label: "Kaufpreis Stellplatz *", value: $property.purchasePriceParking, isRequired: true)
            labeledField("Gesamtkaufpreis") {
                Text(Formatters.formatCurrency(property.purchasePriceUnit + property.purchasePriceParking))
                    .font(.appMono).foregroundStyle(Color.appSecondaryText)
            }
        } else {
            CurrencyField(label: "Kaufpreis *", value: $property.purchasePriceUnit, isRequired: true)
        }
        labeledField("Stellplatz vorhanden") {
            Toggle("", isOn: $property.hasParking)
                .labelsHidden()
                .onChange(of: property.hasParking) { _, newValue in
                    if !newValue {
                        property.purchasePriceParking = 0
                        property.hoaFeeParkingTotalMonthly = 0
                        property.parkingPropertyTaxAnnual = 0
                    }
                }
        }
        // ... rest of existing Kauf fields (Grunderwerbsteuer, Notar, etc.)
        CurrencyField(label: "Grunderwerbsteuer", value: $property.landTransferTax)
        CurrencyField(label: "Notarkosten", value: $property.notaryCosts)
        CurrencyField(label: "Grundbuchkosten", value: $property.landRegistryCosts)
        CurrencyField(label: "Maklerprovision", value: $property.agentFee)
        CurrencyField(label: "Gutachterkosten", value: $property.appraisalCosts)
        CurrencyField(label: "Renovierung gesamt", value: $property.renovationModernizationCosts)
        CurrencyField(label: "davon aktivierungspflichtig", value: $property.renovationAfaEligible)
        labeledField("Wirtschaftlicher Übergang *") {
            DatePicker("", selection: $property.economicTransferDate, displayedComponents: .date)
                .datePickerStyle(.compact).frame(width: 160)
        }
    }
}
```

- [ ] **Step 9.2: Update kostenSection — add HOA split + Stellplatz**

Replace `kostenSection`:

```swift
private var kostenSection: some View {
    formSection(title: "Laufende Kosten") {
        // -- Hausgeld Wohnung --
        CurrencyField(label: "Hausgeld Wohnung/Monat *", value: $property.hoaFeeTotalMonthly, isRequired: true)
        labeledField("Hausgeld aufteilen") {
            Toggle("", isOn: $property.isHoaUnitSplit).labelsHidden()
        }
        if property.isHoaUnitSplit {
            CurrencyField(label: "  davon umlagefähig/Monat", value: $property.hoaFeeRecoverableMonthly)
            CurrencyField(label: "  davon Instandh.-Rücklage/Monat", value: $property.hoaFeeMaintenanceReserveUnitMonthly)
            labeledField("  davon nicht umlagefähig/Monat") {
                let nonRec = property.hoaFeeTotalMonthly - property.hoaFeeRecoverableMonthly - property.hoaFeeMaintenanceReserveUnitMonthly
                Text(Formatters.formatCurrency(max(0, nonRec)))
                    .font(.appMono)
                    .foregroundStyle(nonRec < 0 ? Color.appNegative : Color.appSecondaryText)
            }
        } else {
            CurrencyField(label: "davon umlagefähig/Monat", value: $property.hoaFeeRecoverableMonthly)
        }
        if !property.isHoaUnitSplit {
            hoaWarningRow("Hausgeld Wohnung aufteilen für genaue steuerliche Berechnung")
        }

        // -- Hausgeld Stellplatz --
        if property.hasParking {
            Divider().padding(.leading, 12)
            CurrencyField(label: "Hausgeld Stellplatz/Monat", value: $property.hoaFeeParkingTotalMonthly)
            if property.hoaFeeParkingTotalMonthly > 0 {
                labeledField("Stellplatz Hausgeld aufteilen") {
                    Toggle("", isOn: $property.isHoaParkingSplit).labelsHidden()
                }
                if property.isHoaParkingSplit {
                    CurrencyField(label: "  davon umlagefähig/Monat", value: $property.hoaFeeParkingRecoverableMonthly)
                    CurrencyField(label: "  davon Rücklage/Monat", value: $property.hoaFeeParkingMaintenanceReserveMonthly)
                }
                if !property.isHoaParkingSplit {
                    hoaWarningRow("Stellplatz Hausgeld aufteilen für genaue Berechnung")
                }
            }
        }

        // -- Grundsteuer --
        Divider().padding(.leading, 12)
        CurrencyField(label: "Grundsteuer Wohnung/Jahr *", value: $property.propertyTaxAnnual, isRequired: true)
        if property.hasParking {
            CurrencyField(label: "Grundsteuer Stellplatz/Jahr", value: $property.parkingPropertyTaxAnnual)
        }

        // -- Sonstige --
        Divider().padding(.leading, 12)
        CurrencyField(label: "Hausverwaltung/Jahr", value: $property.propertyManagementAnnual)
        CurrencyField(label: "Instandh.-Rücklage extern/Monat", value: $property.maintenanceReserveMonthly)
        CurrencyField(label: "Gebäudeversicherung/Jahr", value: $property.propertyInsuranceAnnual)
        CurrencyField(label: "Sonstige Kosten/Monat", value: $property.otherCostsMonthly)
    }
}

@ViewBuilder
private func hoaWarningRow(_ message: String) -> some View {
    HStack(spacing: 6) {
        Image(systemName: "exclamationmark.circle")
            .font(.caption).foregroundStyle(Color(hex: "#D97706"))
        Text(message)
            .font(.appCaption).foregroundStyle(Color(hex: "#D97706"))
    }
    .padding(.horizontal, 12).padding(.vertical, 6)
}
```

- [ ] **Step 9.3: Update warningsSection to include HOA split warnings**

Add to `warningsSection`:
```swift
private var showHoaUnitWarning: Bool { !property.isHoaUnitSplit }
private var showHoaParkingWarning: Bool { property.hasParking && property.hoaFeeParkingTotalMonthly > 0 && !property.isHoaParkingSplit }
private var hoaUnitSplitInvalid: Bool {
    property.isHoaUnitSplit &&
    (property.hoaFeeRecoverableMonthly + property.hoaFeeMaintenanceReserveUnitMonthly) > property.hoaFeeTotalMonthly
}
```

- [ ] **Step 9.4: Build and verify**

```bash
cd /Users/maikschlarmann/volta && xcodebuild build -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep "error:" | head -20
```

- [ ] **Step 9.5: Commit**

```bash
git add Volta/Volta/Views/Property/SettingsTab.swift
git commit -m "feat: SettingsTab — HOA split fields, Stellplatz fields, Grundsteuer Stellplatz"
```

---

## Task 10: TaxTab — Full Redesign

**Files:**
- Modify: `Volta/Volta/Views/Property/TaxTab.swift`

- [ ] **Step 10.1: Rewrite TaxTab.swift**

Replace the entire file:

```swift
import SwiftUI

struct TaxTab: View {
    let vm: PropertyViewModel

    // Prognose in-memory state (not persisted)
    @State private var prognoseYear: Int = Calendar.current.component(.year, from: Date()) + 1
    @State private var prognoseRent: Double = 0
    @State private var prognoseParking: Double = 0
    @State private var prognoseHoa: Double = 0
    @State private var prognoseInitialized = false

    private var currentYear: Int { Calendar.current.component(.year, from: Date()) }

    private var prognoseYears: [Int] {
        let base = currentYear + 1
        return Array(base...(base + 9))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                afaSection
                istSection
                prognoseSection
            }
            .padding(24)
        }
        .background(Color.appContentBackground)
        .onAppear {
            if !prognoseInitialized {
                prognoseRent    = vm.property.coldRentMonthly
                prognoseParking = vm.property.parkingRentMonthly
                prognoseHoa     = vm.property.hoaFeeTotalMonthly
                prognoseInitialized = true
            }
        }
    }

    // MARK: - AfA Section (unchanged from before)

    private var afaSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "AfA — Absetzung für Abnutzung")
            VStack(spacing: 0) {
                taxRow(label: "Gebäudewert", value: Formatters.formatCurrency(vm.property.buildingValue))
                taxRow(label: "Grundstückswert", value: Formatters.formatCurrency(vm.property.landValue))
                taxRow(label: "AfA-Basis", value: Formatters.formatCurrency(vm.afaBasis), isBold: true)
                taxRow(label: "AfA-Satz", value: Formatters.formatPercentOneDecimal(vm.property.depreciationRate))
                taxRow(label: "AfA jährlich", value: Formatters.formatCurrency(vm.depreciationYearly), isBold: true)
            }
            .background(Color.appCardBackground).clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Ist Section

    private var istSection: some View {
        let taxableIncome = vm.annualTaxableIncomeCurrentYear
        let taxEffect = vm.taxEffectYearlyCurrentYear
        let ownershipMonths = vm.ownershipMonthsCurrentYear
        let showHoaWarning = !vm.property.isHoaUnitSplit

        return VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Laufendes Jahr \(currentYear) — Steuerliches Ergebnis")

            if showHoaWarning {
                warningBanner("Für genaue Berechnung Hausgeld Wohnung aufteilen (Einstellungen)")
            }

            VStack(spacing: 0) {
                taxRow(label: "Einnahmen (Ist + Projektion)", value: Formatters.formatCurrency(vm.annualIncomeCurrentYear))
                taxRow(label: "− Zinsen (amortisierend, inkl. vor Besitzübergang)",
                       value: "−" + Formatters.formatCurrency(vm.interestCurrentYear), valueColor: .appNegative)
                taxRow(label: "− AfA (\(ownershipMonths) Monate)",
                       value: "−" + Formatters.formatCurrency(vm.afaCurrentYear), valueColor: .appNegative)
                taxRow(label: "− Nicht umlagefähige Kosten Wohnung",
                       value: "−" + Formatters.formatCurrency(vm.hoaFeeNonRecoverableUnitMonthly * Double(ownershipMonths)), valueColor: .appNegative)
                if vm.property.hasParking {
                    taxRow(label: "− Hausgeld Stellplatz (immer)",
                           value: "−" + Formatters.formatCurrency(
                            (vm.hoaFeeNonRecoverableParkingMonthly + vm.property.hoaFeeParkingRecoverableMonthly) * Double(ownershipMonths)),
                           valueColor: .appNegative)
                    taxRow(label: "− Grundsteuer Stellplatz",
                           value: "−" + Formatters.formatCurrency(vm.propertyTaxParkingMonthly * Double(ownershipMonths)),
                           valueColor: .appNegative)
                }
                taxRow(label: "− Umlagefähige Kosten Wohnung (Leerstand)",
                       value: "−" + Formatters.formatCurrency(vm.recoverableUnitLeerstandDeductionCurrentYear), valueColor: .appNegative)
                taxRow(label: "− Grundsteuer Wohnung (Leerstand)",
                       value: "−" + Formatters.formatCurrency(vm.grundsteuerUnitLeerstandDeductionCurrentYear), valueColor: .appNegative)
                taxRow(label: "− Hausverwaltung",
                       value: "−" + Formatters.formatCurrency(vm.propertyManagementMonthly * Double(ownershipMonths)), valueColor: .appNegative)
                Divider().padding(.leading, 12)
                taxRow(label: "= Steuerliches Ergebnis", value: Formatters.formatCurrency(taxableIncome),
                       valueColor: Color.valueColor(-taxableIncome), isBold: true)
                taxRow(label: "× Grenzsteuersatz",
                       value: Formatters.formatPercentOneDecimal(vm.property.marginalTaxRate))
                taxRow(label: "= Steuererstattung Jahr", value: Formatters.formatCurrency(taxEffect),
                       valueColor: taxEffect > 0 ? .appPositive : .appNegative, isBold: true)
                taxRow(label: "÷ \(ownershipMonths) Eigentumsmonate",
                       value: "= " + Formatters.formatCurrency(vm.taxEffectMonthlyCurrentYear) + "/Mon",
                       isBold: true)
            }
            .background(Color.appCardBackground).clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Prognose Section

    private var prognoseSection: some View {
        let taxableIncome = vm.prognoseTaxableIncome(
            year: prognoseYear,
            coldRent: prognoseRent,
            parkingRent: prognoseParking,
            hoaTotal: prognoseHoa
        )
        let taxEffect = TaxCalculator.taxEffectYearly(taxableIncomeVV: taxableIncome, marginalTaxRate: vm.property.marginalTaxRate)

        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                SectionHeader(title: "Prognose")
                Spacer()
                Picker("Jahr", selection: $prognoseYear) {
                    ForEach(prognoseYears, id: \.self) { y in Text(String(y)).tag(y) }
                }.pickerStyle(.menu).frame(width: 100)
                Button("Zurücksetzen") {
                    prognoseRent    = vm.property.coldRentMonthly
                    prognoseParking = vm.property.parkingRentMonthly
                    prognoseHoa     = vm.property.hoaFeeTotalMonthly
                }.font(.appCaption).foregroundStyle(Color.appAccent)
            }

            VStack(spacing: 0) {
                prognoseSlider("Kaltmiete/Monat", value: $prognoseRent, range: 0...3000, step: 10)
                if vm.property.hasParking {
                    prognoseSlider("Stellplatz/Monat", value: $prognoseParking, range: 0...500, step: 5)
                }
                prognoseSlider("Hausgeld gesamt/Monat", value: $prognoseHoa, range: 0...1500, step: 10)
            }
            .background(Color.appCardBackground).clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(spacing: 0) {
                taxRow(label: "Einnahmen (Vollvermietung, 12 Mon.)",
                       value: Formatters.formatCurrency((prognoseRent + prognoseParking) * 12))
                taxRow(label: "− Zinsen (amortisierend \(prognoseYear))",
                       value: "−" + Formatters.formatCurrency(
                        AmortizationCalculator.interestForCalendarYear(
                            year: prognoseYear,
                            loanStartDate: vm.property.loanStartDate,
                            loanAmount: vm.property.loanAmount,
                            interestRate: vm.property.interestRate,
                            monthlyPayment: vm.monthlyMortgage)
                       ), valueColor: .appNegative)
                taxRow(label: "− AfA", value: "−" + Formatters.formatCurrency(vm.depreciationYearly), valueColor: .appNegative)
                taxRow(label: "− Nicht umlagefähige Kosten × 12",
                       value: "−" + Formatters.formatCurrency(vm.hoaFeeNonRecoverableUnitMonthly * 12), valueColor: .appNegative)
                if vm.property.hasParking {
                    taxRow(label: "− Stellplatz-Kosten × 12",
                           value: "−" + Formatters.formatCurrency(
                            (vm.hoaFeeNonRecoverableParkingMonthly + vm.property.hoaFeeParkingRecoverableMonthly + vm.propertyTaxParkingMonthly) * 12),
                           valueColor: .appNegative)
                }
                taxRow(label: "− Hausverwaltung × 12",
                       value: "−" + Formatters.formatCurrency(vm.propertyManagementMonthly * 12), valueColor: .appNegative)
                Divider().padding(.leading, 12)
                taxRow(label: "= Steuerliches Ergebnis (Prognose)",
                       value: Formatters.formatCurrency(taxableIncome),
                       valueColor: Color.valueColor(-taxableIncome), isBold: true)
                taxRow(label: "× Grenzsteuersatz",
                       value: Formatters.formatPercentOneDecimal(vm.property.marginalTaxRate))
                taxRow(label: "= Steuererstattung (Prognose)",
                       value: Formatters.formatCurrency(taxEffect),
                       valueColor: taxEffect > 0 ? .appPositive : .appNegative, isBold: true)
                taxRow(label: "÷ 12", value: "= " + Formatters.formatCurrency(taxEffect / 12) + "/Mon", isBold: true)
            }
            .background(Color.appCardBackground).clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Helpers

    @ViewBuilder
    private func taxRow(label: String, value: String,
                        valueColor: Color = .appPrimaryText, isBold: Bool = false) -> some View {
        HStack {
            Text(label).font(isBold ? .appBody.weight(.semibold) : .appBody).foregroundStyle(Color.appPrimaryText)
            Spacer()
            Text(value).font(isBold ? .appMono.weight(.semibold) : .appMono).foregroundStyle(valueColor)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        Divider().padding(.leading, 12)
    }

    @ViewBuilder
    private func prognoseSlider(_ label: String, value: Binding<Double>, range: ClosedRange<Double>, step: Double) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(label).font(.appBody).foregroundStyle(Color.appPrimaryText)
                Spacer()
                Text(Formatters.formatCurrency(value.wrappedValue)).font(.appMono).foregroundStyle(Color.appPrimaryText).frame(width: 100, alignment: .trailing)
            }
            Slider(value: value, in: range, step: step)
                .padding(.horizontal, 4)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        Divider().padding(.leading, 12)
    }

    @ViewBuilder
    private func warningBanner(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle").foregroundStyle(Color(hex: "#D97706"))
            Text(message).font(.appCaption).foregroundStyle(Color(hex: "#D97706"))
        }
        .padding(10)
        .background(Color(hex: "#D97706").opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}
```

- [ ] **Step 10.2: Add missing ViewModel computed properties needed by TaxTab**

These need to be added to `PropertyViewModel.swift` (they are used in TaxTab above but not yet in the ViewModel):

```swift
    // Annual income for current year (Ist + projected)
    var annualIncomeCurrentYear: Double {
        let year = Calendar.current.component(.year, from: Date())
        let ownerMonths = (1...12).filter { month in
            let d = Date.firstDay(year: year, month: month)
            return StatusPeriodCalculator.ownershipDayFraction(
                month: d, economicTransferDate: property.economicTransferDate) > 0
        }.map { Date.firstDay(year: year, month: $0) }
        return ownerMonths.reduce(0) { sum, month in
            sum + StatusPeriodCalculator.incomeForMonth(
                month, statusHistory: property.statusHistory, today: Date(),
                coldRentMonthly: property.coldRentMonthly,
                parkingRentMonthly: property.parkingRentMonthly)
        }
    }

    var interestCurrentYear: Double {
        AmortizationCalculator.interestForCalendarYear(
            year: Calendar.current.component(.year, from: Date()),
            loanStartDate: property.loanStartDate,
            loanAmount: property.loanAmount,
            interestRate: property.interestRate,
            monthlyPayment: monthlyMortgage
        )
    }

    var afaCurrentYear: Double {
        let year = Calendar.current.component(.year, from: Date())
        let months = ownershipMonthsCurrentYear
        if year == property.economicTransferDate.year {
            return (afaBasis * property.depreciationRate / 12.0) * Double(months)
        }
        return afaBasis * property.depreciationRate
    }

    var recoverableUnitLeerstandDeductionCurrentYear: Double {
        let year = Calendar.current.component(.year, from: Date())
        return (1...12).reduce(0.0) { sum, month in
            let d = Date.firstDay(year: year, month: month)
            let ownerFraction = StatusPeriodCalculator.ownershipDayFraction(
                month: d, economicTransferDate: property.economicTransferDate)
            guard ownerFraction > 0 else { return sum }
            let leerstand = StatusPeriodCalculator.leerstandDayFraction(
                month: d, statusHistory: property.statusHistory, today: Date())
            return sum + property.hoaFeeRecoverableMonthly * ownerFraction * leerstand
        }
    }

    var grundsteuerUnitLeerstandDeductionCurrentYear: Double {
        let year = Calendar.current.component(.year, from: Date())
        return (1...12).reduce(0.0) { sum, month in
            let d = Date.firstDay(year: year, month: month)
            let ownerFraction = StatusPeriodCalculator.ownershipDayFraction(
                month: d, economicTransferDate: property.economicTransferDate)
            guard ownerFraction > 0 else { return sum }
            let leerstand = StatusPeriodCalculator.leerstandDayFraction(
                month: d, statusHistory: property.statusHistory, today: Date())
            return sum + propertyTaxUnitMonthly * ownerFraction * leerstand
        }
    }
```

- [ ] **Step 10.3: Build and fix compile errors**

```bash
cd /Users/maikschlarmann/volta && xcodebuild build -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep "error:" | head -20
```

- [ ] **Step 10.4: Commit**

```bash
git add Volta/Volta/Views/Property/TaxTab.swift Volta/Volta/ViewModels/PropertyViewModel.swift
git commit -m "feat: TaxTab redesign — Laufendes Jahr + Prognose with year picker"
```

---

## Task 11: CashflowTab — Update statusEntryRow Income Display

**Files:**
- Modify: `Volta/Volta/Views/Property/CashflowTab.swift`

- [ ] **Step 11.1: Update the income display in statusEntryRow**

In `statusEntryRow`, the income display currently shows `entry.incomeActualMonthly` for all entries. Update it:

```swift
// Replace:
Text(Formatters.formatCurrency(entry.incomeActualMonthly) + "/Mon")

// With:
Group {
    switch entry.status {
    case .vermietet:
        Text("Aus Einstellungen").font(.appCaption).foregroundStyle(Color.appSecondaryText)
    case .leerstandMietgarantie:
        Text(Formatters.formatCurrency(entry.incomeActualMonthly) + "/Mon")
            .font(.appMono).foregroundStyle(Color.appPrimaryText)
    default:
        Text("0 €/Mon").font(.appCaption).foregroundStyle(Color.appSecondaryText)
    }
}
```

- [ ] **Step 11.2: Build and commit**

```bash
cd /Users/maikschlarmann/volta && xcodebuild build -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | tail -5
git add Volta/Volta/Views/Property/CashflowTab.swift
git commit -m "fix: CashflowTab statusEntryRow — show 'Aus Einstellungen' for vermietet entries"
```

---

## Task 12: Final Build + Test Run

- [ ] **Step 12.1: Run full test suite**

```bash
cd /Users/maikschlarmann/volta && xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' 2>&1 | grep -E "(PASS|FAIL|error:|TEST)" | head -40
```

- [ ] **Step 12.2: Fix any remaining test failures**

For each failing test, read the assertion message and fix either the test expectation (if the fixture changed) or the implementation (if there's a logic bug). Run failing tests individually:

```bash
xcodebuild test -scheme Volta -destination 'platform=iOS Simulator,name=iPhone 16' -only-testing:VoltaTests/<FailingClass>/<test_method> 2>&1 | tail -20
```

- [ ] **Step 12.3: Final commit**

```bash
git add -A
git commit -m "feat: cashflow & tax redesign complete — acquisition-year proration, amortizing interest, parking split, Laufendes Jahr / Prognose tabs"
```

---

## Self-Review: Spec Coverage Check

| Spec requirement | Task |
|-----------------|------|
| Instandhaltungsrücklage not in tax deduction | Task 7 (ViewModel `hoaFeeNonRecoverableUnitMonthly`) |
| Divisor = ownership months not 12 | Task 5 (`taxEffectMonthly(ownershipMonths:)`) |
| Ist uses actual status, not vacancy rate | Task 5 (`annualTaxableIncome` via `StatusPeriodCalculator`) |
| Status-dependent recoverable costs | Tasks 5, 6 |
| Stellplatz always owner-borne | Task 6 |
| Zinsen vor Besitzübergang absetzbar | Task 4 (`interestForCalendarYear` starts from loanStartDate) |
| Zinsjahr-Grenze (no Vorjahr-Zinsen) | Task 4 (filtered by year) |
| Amortizing interest | Task 4 |
| WE/Stellplatz field split | Task 3 (model), Task 9 (UI) |
| Hausgeld optional split | Task 3, Task 9 |
| Day-level proration mid-month | Task 2 (`StatusPeriodCalculator`) |
| Laufendes Jahr hybrid | Task 2 (today barrier in `segments`) |
| Prognose year picker (in-memory) | Task 10 (`@State prognoseYear`) |
| Income field only for Mietgarantie | Task 8 |
| Labels: Wohnung/Stellplatz | Tasks 9, 10 |
