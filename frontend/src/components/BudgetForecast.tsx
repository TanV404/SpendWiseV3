import React, { useMemo } from 'react';
import { ForecastResponse, Transaction } from '../types';
import {
  formatSmartCurrency,
  isCurrentMonthAndYear,
  parseTransactionDate,
} from '../utils/formatters';

interface BudgetForecastProps {
  transactions?: Transaction[];
  totalBudgetLimit?: number;
}

export const BudgetForecast: React.FC<BudgetForecastProps> = ({
  transactions = [],
  totalBudgetLimit = 0,
}) => {
  const forecast = useMemo<ForecastResponse>(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    /*
     * Upcoming month
     */
    const upcomingMonthYear =
      currentMonth === 11 ? currentYear + 1 : currentYear;

    const upcomingMonth =
      currentMonth === 11 ? 0 : currentMonth + 1;

    const daysInUpcomingMonth = new Date(
      upcomingMonthYear,
      upcomingMonth + 1,
      0
    ).getDate();

    /*
     * 1. CURRENT SPEND
     *
     * Only expenses from the current calendar month.
     * This should match the Current Spend KPI.
     */
    const currentMonthExpenses = transactions.filter((tx) => {
      if (tx.amount >= 0 || Math.abs(tx.amount) >= 1_000_000) {
        return false;
      }

      return isCurrentMonthAndYear(tx.date);
    });

    const currentSpend = currentMonthExpenses.reduce(
      (total, tx) => total + Math.abs(tx.amount),
      0
    );

    /*
     * 2. PROJECTED SPEND
     *
     * Average monthly expenses across ALL historical months
     * that contain expense data.
     *
     * Example:
     * Jan 2024 = $2,000
     * Feb 2024 = $3,000
     * Aug 2025 = $4,000
     *
     * Projected Spend = (2000 + 3000 + 4000) / 3
     */
    const expensesByMonth: Record<string, number> = {};

    transactions.forEach((tx) => {
      if (tx.amount >= 0 || Math.abs(tx.amount) >= 1_000_000) {
        return;
      }

      const date = parseTransactionDate(tx.date);

      if (!date || isNaN(date.getTime())) {
        return;
      }

      const year = date.getFullYear();
      const month = date.getMonth();

      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

      expensesByMonth[monthKey] =
        (expensesByMonth[monthKey] || 0) + Math.abs(tx.amount);
    });

    const monthlyExpenses = Object.values(expensesByMonth);

    const totalHistoricalExpenses = monthlyExpenses.reduce(
      (total, value) => total + value,
      0
    );

    const monthsWithData = monthlyExpenses.length;

    const projectedSpend =
      monthsWithData > 0
        ? roundVal(totalHistoricalExpenses / monthsWithData)
        : 0;

    /*
     * 3. EXPECTED DAILY
     *
     * Projected Spend / number of days in upcoming month
     */
    const expectedDaily =
      daysInUpcomingMonth > 0
        ? roundVal(projectedSpend / daysInUpcomingMonth)
        : 0;

    /*
     * 4. REMAINING BUDGET
     *
     * Based on CURRENT MONTH spend.
     */
    const remainingBudget = Math.max(
      0,
      totalBudgetLimit - currentSpend
    );

    /*
     * 5. BUDGET STATUS
     *
     * Compare projected spend against the monthly budget.
     */
    let status: 'UNDER_BUDGET' | 'NEAR_BUDGET' | 'OVER_BUDGET' =
      'UNDER_BUDGET';

    if (projectedSpend > 0 && totalBudgetLimit > 0) {
      if (projectedSpend > totalBudgetLimit) {
        status = 'OVER_BUDGET';
      } else if (projectedSpend >= totalBudgetLimit * 0.85) {
        status = 'NEAR_BUDGET';
      }
    }

    const isInsufficient = monthsWithData === 0;

    return {
      daily_burn_rate: expectedDaily,
      projected_total: projectedSpend,
      current_spend: roundVal(currentSpend),
      monthly_budget: roundVal(totalBudgetLimit),
      remaining_budget: roundVal(remainingBudget),
      insufficient_data: isInsufficient,
      status,
      categories_at_risk: [],
    };
  }, [transactions, totalBudgetLimit]);

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) {
      return '—';
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getStatusBadge = (
    status: 'UNDER_BUDGET' | 'NEAR_BUDGET' | 'OVER_BUDGET',
    isInsufficient: boolean
  ) => {
    if (isInsufficient) {
      return {
        label: 'Pending Data',
        colorClass:
          'bg-[#3b82f6]/15 text-[#93c5fd] border-[#3b82f6]/30',
      };
    }

    switch (status) {
      case 'OVER_BUDGET':
        return {
          label: 'Over Budget',
          colorClass:
            'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/30',
        };

      case 'NEAR_BUDGET':
        return {
          label: 'Near Budget',
          colorClass:
            'bg-amber-400/15 text-amber-300 border-amber-400/30',
        };

      default:
        return {
          label: 'Under Budget',
          colorClass:
            'bg-[#3b82f6]/15 text-[#93c5fd] border-[#3b82f6]/30',
        };
    }
  };

  const statusBadge = getStatusBadge(
    forecast.status,
    forecast.insufficient_data
  );

  return (
    <div
      className="col-span-12 lg:col-span-6 bento-card p-6 animate-fade bg-[#122131] relative overflow-hidden flex flex-col justify-between"
      style={{ animationDelay: '0.25s' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#d4e4fa] tracking-tight">
            Budget Forecast
          </h3>

          <p className="text-sm text-[#c7c4d8]/80 font-normal mt-0.5">
            Monthly average & upcoming expectation
          </p>
        </div>

        <span
          className={`px-2.5 py-1 rounded-md text-xs font-mono-data font-bold border ${statusBadge.colorClass}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {forecast.insufficient_data ? (
        <div className="p-4 bg-[#010f1f]/80 rounded-xl border border-[#3b82f6]/30 flex items-center gap-3 my-2">
          <span className="material-symbols-outlined text-[#3b82f6] text-2xl">
            info
          </span>

          <div>
            <p className="text-xs font-bold text-[#d4e4fa]">
              No Expense Data
            </p>

            <p className="text-xs text-[#c7c4d8] leading-relaxed">
              Add expense transactions to generate a reliable monthly
              forecast.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 my-2">
          {/* Current Spend */}
          <div
            className="p-3 bg-[#010f1f]/60 rounded-xl border border-[#464555]/20 overflow-hidden"
            title={`Current Month Spend: ${
              formatSmartCurrency(forecast.current_spend).exact
            }`}
          >
            <p className="text-[10px] font-mono-data text-[#c7c4d8]/70 uppercase tracking-wider font-semibold">
              Current Spend
            </p>

            <p className="text-base sm:text-lg font-bold text-[#d4e4fa] font-mono-data mt-0.5 truncate">
              {formatSmartCurrency(forecast.current_spend).display}
            </p>
          </div>

          {/* Expected Daily */}
          <div
            className="p-3 bg-[#010f1f]/60 rounded-xl border border-[#464555]/20 overflow-hidden"
            title={`Expected Daily: ${
              formatSmartCurrency(forecast.daily_burn_rate).exact
            }/day`}
          >
            <p className="text-[10px] font-mono-data text-[#c7c4d8]/70 uppercase tracking-wider font-semibold">
              Expected Daily
            </p>

            <p className="text-base sm:text-lg font-bold text-[#d4e4fa] font-mono-data mt-0.5 truncate">
              {formatSmartCurrency(forecast.daily_burn_rate).display}/d
            </p>
          </div>

          {/* Projected Spend */}
          <div
            className="p-3 bg-[#010f1f]/60 rounded-xl border border-[#464555]/20 overflow-hidden"
            title={`Projected Spend: ${
              formatSmartCurrency(forecast.projected_total).exact
            }`}
          >
            <p className="text-[10px] font-mono-data text-[#c7c4d8]/70 uppercase tracking-wider font-semibold">
              Projected Spend
            </p>

            <p className="text-base sm:text-lg font-bold text-[#d4e4fa] font-mono-data mt-0.5 truncate">
              {formatSmartCurrency(forecast.projected_total).display}
            </p>
          </div>
        </div>
      )}

      {/* Budget */}
      <div className="space-y-3 mt-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#c7c4d8]">
            Monthly Budget: {formatCurrency(forecast.monthly_budget)}
          </span>

          <span className="text-[#c7c4d8] font-mono-data font-bold">
            Remaining: {formatCurrency(forecast.remaining_budget)}
          </span>
        </div>

        {/* Insight */}
        <div className="flex items-center gap-3 p-3 bg-[#010f1f]/60 rounded-xl border border-[#464555]/20">
          <div className="w-8 h-8 flex items-center justify-center bg-[#3b82f6]/15 rounded-lg shrink-0">
            <span
              className="material-symbols-outlined text-[#3b82f6] text-sm"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              insights
            </span>
          </div>

          <p className="text-xs text-[#c7c4d8] leading-relaxed">
            {(() => {
              if (forecast.monthly_budget === 0) {
                return `Based on historical spending, your projected monthly spend is ${formatCurrency(
                  forecast.projected_total
                )}.`;
              }

              if (forecast.status === 'OVER_BUDGET') {
                return `Warning: Your projected monthly spend of ${formatCurrency(
                  forecast.projected_total
                )} exceeds your ${formatCurrency(
                  forecast.monthly_budget
                )} budget.`;
              }

              if (forecast.status === 'NEAR_BUDGET') {
                return `Caution: Your projected monthly spend of ${formatCurrency(
                  forecast.projected_total
                )} is close to your ${formatCurrency(
                  forecast.monthly_budget
                )} limit.`;
              }

              return `Your projected monthly spend of ${formatCurrency(
                forecast.projected_total
              )} is within your ${formatCurrency(
                forecast.monthly_budget
              )} budget.`;
            })()}
          </p>
        </div>
      </div>
    </div>
  );
};

function roundVal(value: number) {
  return Math.round(value * 100) / 100;
}