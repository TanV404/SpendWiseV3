import React, { useState } from 'react';
import { ChartTimeframe, Transaction } from '../types';

interface SpendingAnalysisProps {
  transactions: Transaction[];
}

interface IncomeExpenseBarData {
  label: string;
  income: number;
  expense: number;
  incomeHeight: number;
  expenseHeight: number;
}

export const SpendingAnalysis: React.FC<SpendingAnalysisProps> = ({ transactions }) => {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('monthly');
  const [activeBar, setActiveBar] = useState<{ label: string; type: string; value: number } | null>(null);

  // Compute Income vs Expense dataset strictly from transactions
  const getDataset = (): { items: IncomeExpenseBarData[]; totalActivity: number } => {
    let labels: string[] = [];
    if (timeframe === 'yearly') {
      labels = ['2022', '2023', '2024', '2025', '2026'];
    } else {
      labels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG'];
    }

    let totalActivity = 0;

    const rawData = labels.map((lbl) => {
      let labelIncome = 0;
      let labelExpense = 0;

      transactions.forEach((tx) => {
        if (!tx.date) return;
        const dStr = tx.date.toUpperCase();
        if (dStr.includes(lbl)) {
          if (tx.amount > 0) labelIncome += tx.amount;
          else labelExpense += Math.abs(tx.amount);
        }
      });

      totalActivity += labelIncome + labelExpense;

      return { label: lbl, income: labelIncome, expense: labelExpense };
    });

    const maxVal = Math.max(
      ...rawData.map((d) => Math.max(d.income, d.expense)),
      1
    );

    const items = rawData.map((d) => ({
      label: d.label,
      income: d.income,
      expense: d.expense,
      incomeHeight: d.income > 0 ? Math.max(8, Math.min(100, Math.round((d.income / maxVal) * 85))) : 0,
      expenseHeight: d.expense > 0 ? Math.max(8, Math.min(100, Math.round((d.expense / maxVal) * 85))) : 0,
    }));

    return { items, totalActivity };
  };

  const { items: data, totalActivity } = getDataset();

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="col-span-12 lg:col-span-8 bento-card bg-[#122131] p-6 animate-fade flex flex-col justify-between">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-[#d4e4fa] tracking-tight">Spending Analysis</h3>
          <p className="text-sm text-[#c7c4d8]/80 font-normal mt-0.5">Income vs Expense comparison</p>
        </div>

        {/* Toggle Group */}
        <div className="flex bg-[#010f1f] p-1 rounded-xl border border-[#464555]/20 shadow-inner">
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3.5 py-1.5 text-xs font-mono-data font-semibold transition-all rounded-lg focus:outline-none cursor-pointer ${
              timeframe === 'monthly'
                ? 'bg-[#3b82f6] text-[#d4e4fa] shadow-md border border-[#3b82f6]'
                : 'text-[#c7c4d8] hover:text-[#d4e4fa] border border-transparent'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('yearly')}
            className={`px-3.5 py-1.5 text-xs font-mono-data font-semibold transition-all rounded-lg focus:outline-none cursor-pointer ${
              timeframe === 'yearly'
                ? 'bg-[#3b82f6] text-[#d4e4fa] shadow-md border border-[#3b82f6]'
                : 'text-[#c7c4d8] hover:text-[#d4e4fa] border border-transparent'
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      {/* Grouped Bar Chart Area or Empty State */}
      <div className="h-64 flex items-end justify-between gap-4 sm:gap-6 px-2 sm:px-4 pb-4 border-b border-[#464555]/10 relative">
        {/* Horizontal grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 px-4 pb-10 pt-4">
          <div className="border-t border-[#d4e4fa] w-full"></div>
          <div className="border-t border-[#d4e4fa] w-full"></div>
          <div className="border-t border-[#d4e4fa] w-full"></div>
          <div className="border-t border-[#d4e4fa] w-full"></div>
        </div>

        {totalActivity === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center py-8 relative z-10">
            <span className="material-symbols-outlined text-[#c7c4d8]/40 text-4xl mb-2">bar_chart_off</span>
            <p className="text-xs text-[#c7c4d8] font-semibold">Not enough spending data yet.</p>
            <p className="text-[11px] text-[#c7c4d8]/60 mt-0.5">Add or import transactions to view dynamic chart breakdown.</p>
          </div>
        ) : (
          <>
            {/* Hover Tooltip Overlay */}
            {activeBar && (
              <div className="absolute top-2 right-4 bg-[#0d1c2d] text-xs px-3 py-1.5 rounded-lg border border-[#3b82f6]/30 shadow-xl z-20 animate-fade">
                <span className="font-semibold text-[#d4e4fa]">{activeBar.label}</span> — {activeBar.type}: <span className="font-mono-data font-bold text-white">{formatCurrency(activeBar.value)}</span>
              </div>
            )}

            {/* Bars */}
            {data.map((item, index) => (
              <div key={item.label + timeframe + index} className="flex-1 h-full flex flex-col justify-end items-center group">
                <div className="flex items-end gap-1.5 w-full justify-center h-full">
                  {/* Income Bar */}
                  {item.incomeHeight > 0 && (
                    <div
                      onMouseEnter={() => setActiveBar({ label: item.label, type: 'Income', value: item.income })}
                      onMouseLeave={() => setActiveBar(null)}
                      style={{ height: `${item.incomeHeight}%` }}
                      className="w-4 sm:w-5 rounded-t-sm bar-animate bar-hover bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)] cursor-pointer"
                    ></div>
                  )}

                  {/* Expense Bar */}
                  {item.expenseHeight > 0 && (
                    <div
                      onMouseEnter={() => setActiveBar({ label: item.label, type: 'Expense', value: item.expense })}
                      onMouseLeave={() => setActiveBar(null)}
                      style={{ height: `${item.expenseHeight}%` }}
                      className="w-4 sm:w-5 rounded-t-sm bar-animate bar-hover bg-[#ffb4ab] shadow-[0_0_12px_rgba(255,180,171,0.3)] cursor-pointer"
                    ></div>
                  )}
                </div>
                <p className="font-mono-data text-[10px] mt-3 text-[#c7c4d8]/70 font-medium">
                  {item.label}
                </p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Legend: Income vs Expense Only */}
      <div className="flex justify-center gap-8 mt-6">
        <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-100 transition-opacity">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></div>
          <span className="font-mono-data text-xs text-[#d4e4fa] font-semibold">Income (+)</span>
        </div>
        <div className="flex items-center gap-2.5 cursor-pointer hover:opacity-100 transition-opacity">
          <div className="w-3 h-3 rounded-full bg-[#ffb4ab] shadow-[0_0_6px_#ffb4ab]"></div>
          <span className="font-mono-data text-xs text-[#d4e4fa] font-semibold">Expense (-)</span>
        </div>
      </div>
    </div>
  );
};
