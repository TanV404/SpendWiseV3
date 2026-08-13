import React, { useEffect, useState, useMemo } from 'react';
import { ForecastResponse, Transaction } from '../types';
import { apiFetch } from '../api';

interface BudgetForecastProps {
  transactions?: Transaction[];
  totalBudgetLimit?: number;
}

export const BudgetForecast: React.FC<BudgetForecastProps> = ({ transactions = [], totalBudgetLimit = 0 }) => {
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);

  // Compute local fallback forecast when running in guest mode or offline
  const localForecast = useMemo<ForecastResponse>(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysElapsed = Math.max(1, now.getDate());

    const currentMonthExpenses = transactions.filter((tx) => {
      if (tx.amount >= 0) return false;
      if (!tx.date) return true;
      try {
        const d = new Date(tx.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } catch {
        return true;
      }
    });

    const totalSpent = currentMonthExpenses.reduce((acc, tx) => acc + Math.abs(tx.amount), 0);
    const isInsufficient = daysElapsed < 3 || (currentMonthExpenses.length < 3 && totalSpent === 0);

    const dailyBurnRate = roundVal(totalSpent / daysElapsed);
    const projectedTotal = !isInsufficient ? roundVal(dailyBurnRate * daysInMonth) : null;
    const remainingBudget = Math.max(0, totalBudgetLimit - totalSpent);

    let status: 'UNDER_BUDGET' | 'NEAR_BUDGET' | 'OVER_BUDGET' = 'UNDER_BUDGET';
    if (projectedTotal !== null && totalBudgetLimit > 0) {
      if (projectedTotal > totalBudgetLimit) status = 'OVER_BUDGET';
      else if (projectedTotal >= totalBudgetLimit * 0.85) status = 'NEAR_BUDGET';
    }

    return {
      daily_burn_rate: dailyBurnRate,
      projected_total: projectedTotal,
      current_spend: roundVal(totalSpent),
      monthly_budget: roundVal(totalBudgetLimit),
      remaining_budget: roundVal(remainingBudget),
      insufficient_data: isInsufficient,
      status,
      categories_at_risk: [],
    };
  }, [transactions, totalBudgetLimit]);

  useEffect(() => {
    apiFetch<ForecastResponse>('/budgets/forecast')
      .then((data) => setForecast(data))
      .catch(() => setForecast(localForecast));
  }, [transactions, totalBudgetLimit, localForecast]);

  const activeForecast = forecast || localForecast;

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const getStatusBadge = (status: 'UNDER_BUDGET' | 'NEAR_BUDGET' | 'OVER_BUDGET', isInsufficient: boolean) => {
    if (isInsufficient) {
      return { label: 'Pending Data', colorClass: 'bg-[#3b82f6]/15 text-[#93c5fd] border-[#3b82f6]/30' };
    }
    switch (status) {
      case 'OVER_BUDGET':
        return { label: 'Over Budget', colorClass: 'bg-[#ffb4ab]/15 text-[#ffb4ab] border-[#ffb4ab]/30' };
      case 'NEAR_BUDGET':
        return { label: 'Near Budget', colorClass: 'bg-amber-400/15 text-amber-300 border-amber-400/30' };
      default:
        return { label: 'Under Budget', colorClass: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' };
    }
  };

  const statusBadge = getStatusBadge(activeForecast.status, activeForecast.insufficient_data);

  return (
    <div
      className="col-span-12 lg:col-span-6 bento-card p-6 animate-fade bg-[#122131] relative overflow-hidden flex flex-col justify-between"
      style={{ animationDelay: '0.25s' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#d4e4fa] tracking-tight">Budget Forecast</h3>
          <p className="text-sm text-[#c7c4d8]/80 font-normal mt-0.5">Machine learning spending prediction</p>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-mono-data font-bold border ${statusBadge.colorClass}`}>
          {statusBadge.label}
        </span>
      </div>

      {activeForecast.insufficient_data ? (
        /* Early Month / Insufficient Data Callout */
        <div className="p-4 bg-[#010f1f]/80 rounded-xl border border-[#3b82f6]/30 flex items-center gap-3 my-2">
          <span className="material-symbols-outlined text-[#3b82f6] text-2xl">info</span>
          <div>
            <p className="text-xs font-bold text-[#d4e4fa]">Early Month Notice</p>
            <p className="text-xs text-[#c7c4d8] leading-relaxed">
              Not enough data yet to generate a reliable forecast.
            </p>
          </div>
        </div>
      ) : (
        /* Key Metrics Grid */
        <div className="grid grid-cols-3 gap-3 my-2">
          <div className="p-3 bg-[#010f1f]/60 rounded-xl border border-[#464555]/20">
            <p className="text-[10px] font-mono-data text-[#c7c4d8]/70 uppercase tracking-wider font-semibold">
              Current Spend
            </p>
            <p className="text-lg font-bold text-[#d4e4fa] font-mono-data mt-0.5">
              {formatCurrency(activeForecast.current_spend)}
            </p>
          </div>

          <div className="p-3 bg-[#010f1f]/60 rounded-xl border border-[#464555]/20">
            <p className="text-[10px] font-mono-data text-[#c7c4d8]/70 uppercase tracking-wider font-semibold">
              Daily Avg
            </p>
            <p className="text-lg font-bold text-[#d4e4fa] font-mono-data mt-0.5">
              {formatCurrency(activeForecast.daily_burn_rate)}/d
            </p>
          </div>

          <div className="p-3 bg-[#010f1f]/60 rounded-xl border border-[#464555]/20">
            <p className="text-[10px] font-mono-data text-[#c7c4d8]/70 uppercase tracking-wider font-semibold">
              Projected Total
            </p>
            <p className="text-lg font-bold text-[#d4e4fa] font-mono-data mt-0.5">
              {formatCurrency(activeForecast.projected_total)}
            </p>
          </div>
        </div>
      )}

      {/* Progress & Insight Footers */}
      <div className="space-y-3 mt-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-[#c7c4d8]">Monthly Budget: {formatCurrency(activeForecast.monthly_budget)}</span>
          <span className="text-[#c7c4d8] font-mono-data font-bold">
            Remaining: {formatCurrency(activeForecast.remaining_budget)}
          </span>
        </div>

        {/* AI Insight Callout */}
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
            {activeForecast.categories_at_risk.length > 0
              ? `At-risk category: "${activeForecast.categories_at_risk[0].category_name}" projected at ${formatCurrency(activeForecast.categories_at_risk[0].projected_spend)}.`
              : activeForecast.insufficient_data
              ? `Forecast will calibrate as more transactions are logged this month.`
              : `At current burn rate of ${formatCurrency(activeForecast.daily_burn_rate)}/day, your month-end spend is on track.`}
          </p>
        </div>
      </div>
    </div>
  );
};

function roundVal(v: number) {
  return Math.round(v * 100) / 100;
}
