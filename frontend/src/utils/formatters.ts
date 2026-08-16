/**
 * Currency and large number formatters for SpendWise UI.
 * Prevents visual overflow by rounding / abbreviating large numbers (e.g. $1.2M, $450K)
 * while retaining exact full currency values for tooltips (title attribute).
 */

export interface FormattedCurrencyResult {
  display: string;
  exact: string;
  className: string;
}

export function formatSmartCurrency(val: number | null | undefined): FormattedCurrencyResult {
  const num = typeof val === 'number' && !isNaN(val) ? val : 0;
  const absNum = Math.abs(num);
  const isNegative = num < 0;
  const sign = isNegative ? '-' : '';

  // Exact representation with full comma formatting
  const exact = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);

  let display = '';

  if (absNum >= 1_000_000_000) {
    display = `${sign}$${(absNum / 1_000_000_000).toFixed(1)}B`;
  } else if (absNum >= 1_000_000) {
    display = `${sign}$${(absNum / 1_000_000).toFixed(1)}M`;
  } else if (absNum >= 100_000) {
    display = `${sign}$${(absNum / 1_000).toFixed(1)}k`;
  } else {
    display = exact;
  }

  // Length-based adaptive font size class to prevent overflow
  let className = 'text-2xl sm:text-3xl';
  if (display.length >= 15) {
    className = 'text-base sm:text-lg';
  } else if (display.length >= 11) {
    className = 'text-lg sm:text-xl';
  }

  return { display, exact, className };
}
