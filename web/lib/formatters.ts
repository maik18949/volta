const currencyFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('de-DE', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

/** `value` is a decimal fraction (0.042 = 4.2%), not a whole percent number. */
export function formatPercent(value: number): string {
  return percentFormatter.format(value);
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

/** Plain de-DE number formatting (comma decimal separator, no currency/percent symbol). */
export function formatNumber(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Kaufpreisfaktor / Mietmultiplikator — plain number with one decimal and a × suffix. */
export function formatMultiplier(value: number): string {
  return `${formatNumber(value, 1)}×`;
}
