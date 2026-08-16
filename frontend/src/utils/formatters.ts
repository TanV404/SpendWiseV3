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

/**
 * Safely parse any transaction date string (e.g. 'May 15 2024', '2024-05-15', '05/15/2024', '2024-05-15T00:00:00Z').
 * Handles ISO strings explicitly to avoid UTC date rollback across timezones.
 */
export function parseTransactionDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Handle YYYY-MM-DD format explicitly
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }

  // Handle "Month Day Year" or standard format
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Check if a transaction belongs to the current calendar month and current year.
 */
export function isCurrentMonthAndYear(dateStr?: string | null, referenceDate = new Date()): boolean {
  const d = parseTransactionDate(dateStr);
  if (!d) return false;
  return d.getFullYear() === referenceDate.getFullYear() && d.getMonth() === referenceDate.getMonth();
}

/**
 * Check if a transaction belongs to the current calendar year.
 */
export function isCurrentYear(dateStr?: string | null, referenceDate = new Date()): boolean {
  const d = parseTransactionDate(dateStr);
  if (!d) return false;
  return d.getFullYear() === referenceDate.getFullYear();
}

export type DateFilterType = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'CUSTOM';

/**
 * Filter transaction date strings by preset or custom date range.
 */
export function matchesDateFilter(
  dateStr?: string | null,
  filterType: DateFilterType = 'ALL',
  customStart?: string,
  customEnd?: string,
  referenceDate = new Date()
): boolean {
  if (filterType === 'ALL') return true;
  const d = parseTransactionDate(dateStr);
  if (!d) return false;

  const now = referenceDate;
  const txTime = d.getTime();

  switch (filterType) {
    case 'THIS_MONTH':
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();

    case 'LAST_MONTH': {
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    }

    case 'THIS_YEAR':
      return d.getFullYear() === now.getFullYear();

    case 'LAST_30_DAYS': {
      const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).getTime();
      return txTime >= thirtyDaysAgo;
    }

    case 'LAST_90_DAYS': {
      const ninetyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90).getTime();
      return txTime >= ninetyDaysAgo;
    }

    case 'CUSTOM': {
      if (customStart) {
        const start = parseTransactionDate(customStart);
        if (start) {
          start.setHours(0, 0, 0, 0);
          if (d < start) return false;
        }
      }
      if (customEnd) {
        const end = parseTransactionDate(customEnd);
        if (end) {
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
      }
      return true;
    }

    default:
      return true;
  }
}

