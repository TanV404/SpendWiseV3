import React from 'react';

interface KPICardsProps {
  totalBalance: number;
  monthlySpending: number;
  savingsGoal: number;
  currentSaved?: number;
  savingsProgress: number;
  budgetRemaining: number;
  totalBudgetLimit: number;
  onEditBudget: () => void;
  onEditSavingsGoal: () => void;
}

export const KPICards: React.FC<KPICardsProps> = ({
  totalBalance,
  monthlySpending,
  savingsGoal,
  savingsProgress,
  budgetRemaining,
  totalBudgetLimit,
  onEditBudget,
  onEditSavingsGoal,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const isPositiveBalance = totalBalance >= 0;
  const isWithinBudget = totalBudgetLimit > 0 ? monthlySpending <= totalBudgetLimit : true;
  const spendingRatio = totalBudgetLimit > 0 ? Math.round((monthlySpending / totalBudgetLimit) * 100) : 0;
  const budgetRemainingPct = totalBudgetLimit > 0 ? Math.max(0, Math.round((budgetRemaining / totalBudgetLimit) * 100)) : 0;
  const isBudgetSafe = budgetRemainingPct >= 20;
  const isGoalAchieved = savingsGoal > 0 && savingsProgress >= 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 col-span-12">
      {/* Card 1: Total Balance */}
      <div className="bento-card group relative bg-gradient-to-b from-[#0e2136] to-[#0a1827] p-5 h-36 rounded-2xl flex flex-col justify-between border border-white/10 hover:border-[#3b82f6]/40 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(59,130,246,0.1)] hover:-translate-y-0.5 animate-fade overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-400 to-emerald-500/0 opacity-70 group-hover:opacity-100 transition-opacity" />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-base">account_balance_wallet</span>
            </div>
            <p className="font-mono-data text-[#c7c4d8] text-[11px] uppercase tracking-wider font-semibold">
              Total Balance
            </p>
          </div>

          <span
            className={`${
              isPositiveBalance
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-[#ffb4ab] bg-rose-500/10 border-rose-500/20'
            } border flex items-center text-[11px] font-mono-data px-2 py-0.5 rounded-md font-semibold`}
          >
            <span className="material-symbols-outlined text-xs mr-1">
              {isPositiveBalance ? 'trending_up' : 'trending_down'}
            </span>
            {isPositiveBalance ? 'Positive' : 'Deficit'}
          </span>
        </div>

        <div className="flex items-center my-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#e2edfa] tracking-tight font-mono-data group-hover:text-white transition-colors">
            {formatCurrency(totalBalance)}
          </h2>
        </div>

        <div className="h-1.5 w-full opacity-0" />
      </div>

      {/* Card 2: Current Spend */}
      <div
        className="bento-card group relative bg-gradient-to-b from-[#0e2136] to-[#0a1827] p-5 h-36 rounded-2xl flex flex-col justify-between border border-white/10 hover:border-[#3b82f6]/40 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(59,130,246,0.1)] hover:-translate-y-0.5 animate-fade overflow-hidden"
        style={{ animationDelay: '0.08s' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/0 via-blue-400 to-blue-500/0 opacity-70 group-hover:opacity-100 transition-opacity" />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center text-[#93c5fd]">
              <span className="material-symbols-outlined text-base">shopping_bag</span>
            </div>
            <p className="font-mono-data text-[#c7c4d8] text-[11px] uppercase tracking-wider font-semibold">
              Current Spend
            </p>
          </div>

          <span
            className={`${
              isWithinBudget
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-[#ffb4ab] bg-rose-500/10 border-rose-500/20'
            } border flex items-center text-[11px] font-mono-data px-2 py-0.5 rounded-md font-semibold`}
          >
            <span className="material-symbols-outlined text-xs mr-1">
              {isWithinBudget ? 'check_circle' : 'warning'}
            </span>
            {totalBudgetLimit > 0 ? (isWithinBudget ? `${spendingRatio}% used` : 'Over Budget') : 'Active'}
          </span>
        </div>

        <div className="flex items-center my-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#e2edfa] tracking-tight font-mono-data group-hover:text-white transition-colors">
            {formatCurrency(monthlySpending)}
          </h2>
        </div>

        <div className="h-1.5 w-full opacity-0" />
      </div>

      {/* Card 3: Savings Goal */}
      <div
        className="bento-card group relative bg-gradient-to-b from-[#0e2136] to-[#0a1827] p-5 h-36 rounded-2xl flex flex-col justify-between border border-white/10 hover:border-[#3b82f6]/40 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(59,130,246,0.1)] hover:-translate-y-0.5 animate-fade overflow-hidden"
        style={{ animationDelay: '0.16s' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500/0 via-indigo-400 to-indigo-500/0 opacity-70 group-hover:opacity-100 transition-opacity" />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <span className="material-symbols-outlined text-base">savings</span>
            </div>
            <p className="font-mono-data text-[#c7c4d8] text-[11px] uppercase tracking-wider font-semibold">
              Savings Goal
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onEditSavingsGoal}
              className="p-1 rounded-md text-[#c7c4d8]/70 hover:text-[#93c5fd] hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
              title="Edit Savings Goal"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            {savingsGoal > 0 && (
              <span
                className={`${
                  isGoalAchieved ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-[#93c5fd] bg-[#3b82f6]/10 border-[#3b82f6]/20'
                } border flex items-center text-[11px] font-mono-data px-2 py-0.5 rounded-md font-semibold`}
              >
                <span className="material-symbols-outlined text-xs mr-0.5">
                  {isGoalAchieved ? 'check_circle' : 'flag'}
                </span>
                {savingsProgress}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center my-auto">
          {savingsGoal === 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#c7c4d8]/80 font-mono-data">No goal set</span>
              <button
                onClick={onEditSavingsGoal}
                className="text-xs font-bold text-[#93c5fd] hover:text-white underline cursor-pointer font-mono-data"
              >
                Set a savings goal
              </button>
            </div>
          ) : (
            <h2 className="text-2xl sm:text-3xl font-bold text-[#e2edfa] tracking-tight font-mono-data group-hover:text-white transition-colors">
              {formatCurrency(savingsGoal)}
            </h2>
          )}
        </div>

        {savingsGoal === 0 ? (
          <div className="h-1.5 w-full opacity-0" />
        ) : (
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-[#3b82f6] shadow-[0_0_10px_rgba(99,102,241,0.5)] rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, savingsProgress))}%` }}
            />
          </div>
        )}
      </div>

      {/* Card 4: Budget Left */}
      <div
        className="bento-card group relative bg-gradient-to-b from-[#0e2136] to-[#0a1827] p-5 h-36 rounded-2xl flex flex-col justify-between border border-white/10 hover:border-[#3b82f6]/40 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(59,130,246,0.1)] hover:-translate-y-0.5 animate-fade overflow-hidden"
        style={{ animationDelay: '0.24s' }}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
            isBudgetSafe
              ? 'from-emerald-500/0 via-emerald-400 to-emerald-500/0'
              : 'from-amber-500/0 via-amber-400 to-amber-500/0'
          } opacity-70 group-hover:opacity-100 transition-opacity`}
        />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg ${
                isBudgetSafe
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              } border flex items-center justify-center`}
            >
              <span className="material-symbols-outlined text-base">pie_chart</span>
            </div>
            <p className="font-mono-data text-[#c7c4d8] text-[11px] uppercase tracking-wider font-semibold">
              Budget Left
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onEditBudget}
              className="p-1 rounded-md text-[#c7c4d8]/70 hover:text-[#93c5fd] hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
              title="Edit Budget"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
            {totalBudgetLimit > 0 && (
              <span
                className={`${
                  isBudgetSafe
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : 'text-[#ffb4ab] bg-rose-500/10 border-rose-500/20'
                } border flex items-center text-[11px] font-mono-data px-2 py-0.5 rounded-md font-semibold`}
              >
                <span className="material-symbols-outlined text-xs mr-0.5">
                  {isBudgetSafe ? 'verified' : 'warning'}
                </span>
                {budgetRemainingPct}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center my-auto">
          {totalBudgetLimit === 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#c7c4d8]/80 font-mono-data">No budget set</span>
              <button
                onClick={onEditBudget}
                className="text-xs font-bold text-[#93c5fd] hover:text-white underline cursor-pointer font-mono-data"
              >
                Set budget
              </button>
            </div>
          ) : (
            <h2 className="text-2xl sm:text-3xl font-bold text-[#e2edfa] tracking-tight font-mono-data group-hover:text-white transition-colors">
              {formatCurrency(budgetRemaining)}
            </h2>
          )}
        </div>

        {totalBudgetLimit === 0 ? (
          <div className="h-1.5 w-full opacity-0" />
        ) : (
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                isBudgetSafe
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                  : 'bg-gradient-to-r from-amber-500 to-rose-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
              } rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, budgetRemainingPct))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
