/**
 * Shared parsing for the prognoseJahr/prognoseQuote URL params — the cross-tab "future-year
 * Leerstandsquote what-if" state shared between the Cashflow and Steuer tabs' Jahresübersicht
 * cards (see PropertySidebar.tsx, which forwards both params between the two tabs). Kept as
 * pure functions (not a hook) so both a client component's useSearchParams() result and plain
 * URLSearchParams work identically — both expose the same .get(key): string | null shape this
 * only needs.
 */

interface ReadonlySearchParamsLike {
  get(key: string): string | null;
}

/** How many years into the future the Cashflow- and Steuer-Jahresübersicht year-pickers allow
 * navigating (`maxYear={currentYear + MAX_FORECAST_YEARS_AHEAD}` in both). Kept as a single
 * exported constant so both pickers and `initialYearFromParams` below agree on the same bound —
 * a year the shared `prognoseJahr` param names must always be representable in both tabs. */
export const MAX_FORECAST_YEARS_AHEAD = 10;

/** The initial year to show: `prognoseJahr` from the URL if it's a representable future year
 * (`currentYear < year <= currentYear + MAX_FORECAST_YEARS_AHEAD`, matching the year-picker
 * bound both Jahresübersicht cards must stay within), else `currentYear`. */
export function initialYearFromParams(searchParams: ReadonlySearchParamsLike, currentYear: number): number {
  const prognoseJahrParam = searchParams.get('prognoseJahr');
  if (prognoseJahrParam === null) return currentYear;
  const parsed = Number(prognoseJahrParam);
  return parsed > currentYear && parsed <= currentYear + MAX_FORECAST_YEARS_AHEAD ? parsed : currentYear;
}

/** The default (no override) Leerstandsquote for a future year, as a 0-100 percent — derived
 * from the property's lifetime average vacancy rate. */
export function defaultForecastQuotePercent(actualVacancyRate: number | null): number {
  return actualVacancyRate !== null ? Math.round(actualVacancyRate * 100) : 0;
}

/** The effective Leerstandsquote (0-100 percent) for `year`: reads the shared `prognoseQuote`
 * from the URL only when `year` matches the URL's own `prognoseJahr` (i.e. the quote in the URL
 * was set FOR this exact year by whichever Jahresübersicht card last touched it) and `year` is
 * itself a future year — otherwise falls back to `defaultQuotePercent`. */
export function effectiveForecastQuotePercent(
  searchParams: ReadonlySearchParamsLike,
  currentYear: number,
  year: number,
  defaultQuotePercent: number
): number {
  const prognoseJahrParam = searchParams.get('prognoseJahr');
  const prognoseQuoteParam = searchParams.get('prognoseQuote');
  const isFuture = year > currentYear;
  const sharedQuote =
    isFuture && prognoseJahrParam !== null && Number(prognoseJahrParam) === year && prognoseQuoteParam !== null
      ? Number(prognoseQuoteParam)
      : NaN;
  return Number.isFinite(sharedQuote) ? Math.min(100, Math.max(0, sharedQuote)) : defaultQuotePercent;
}
