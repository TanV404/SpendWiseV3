import React from 'react';
import { formatSmartCurrency } from '../utils/formatters';

interface KPICardsProps {
  totalBalance: number;
  monthlySpending: number;
  savingsGoal: number;
  currentSaved?: number;
  savingsProgress: number;
  budgetRemaining: number;
  totalBudgetLimit: number;
  hasBudget?: boolean;
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
  hasBudget,
  onEditBudget,
  onEditSavingsGoal,
}) => {
  const budgetExists = hasBudget !== undefined ? hasBudget : totalBudgetLimit > 0;
  const balanceFmt = formatSmartCurrency(totalBalance);
  const spendingFmt = formatSmartCurrency(monthlySpending);
  const goalFmt = formatSmartCurrency(savingsGoal);
  const remainingFmt = formatSmartCurrency(budgetRemaining);

  const balanceState =
    totalBalance > 0
      ? 'positive'
      : totalBalance < 0
      ? 'negative'
      : 'neutral';

  // Card 2 (Current Spend) dynamic state
  const isOverBudget = budgetExists && monthlySpending > totalBudgetLimit;
  const isNearBudget = budgetExists && !isOverBudget && totalBudgetLimit > 0 && monthlySpending >= totalBudgetLimit * 0.85;
  const spendingRatio = totalBudgetLimit > 0 ? Math.round((monthlySpending / totalBudgetLimit) * 100) : 0;

  // Card 3 (Savings Goal) dynamic state
  const isGoalAchieved = savingsGoal > 0 && savingsProgress >= 100;
  const isGoalInProgress = savingsGoal > 0 && savingsProgress > 0 && savingsProgress < 100;

  // Card 4 (Budget Left) dynamic state
  const budgetRemainingPct = totalBudgetLimit > 0 ? Math.max(0, Math.round((budgetRemaining / totalBudgetLimit) * 100)) : 0;
  const isBudgetCritical = budgetExists && budgetRemainingPct < 15;
  const isBudgetWarning = budgetExists && budgetRemainingPct >= 15 && budgetRemainingPct < 30;
  const isBudgetHealthy = budgetExists && budgetRemainingPct >= 30;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 col-span-12">
      {/* Card 1: Total Balance */}
      <div className="bento-card group relative bg-gradient-to-b from-[#0e2136] to-[#0a1827] p-5 h-36 min-h-[144px] rounded-2xl flex flex-col justify-between border border-[#3b82f6]/20 hover:border-[#3b82f6]/50 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 animate-fade overflow-hidden">
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
            balanceState === 'positive'
              ? 'from-blue-500/0 via-[#60a5fa] to-blue-500/0'
              : balanceState === 'negative'
              ? 'from-red-500/0 via-[#ffb4ab] to-red-500/0'
              : 'from-slate-500/0 via-slate-400/40 to-slate-500/0'
          } opacity-70 group-hover:opacity-100 transition-opacity`}
        />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg ${
                balanceState === 'positive'
                  ? 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#93c5fd]'
                  : balanceState === 'negative'
                  ? 'bg-[#ffb4ab]/15 border-[#ffb4ab]/30 text-[#ffb4ab]'
                  : 'bg-[#1e293b]/60 border-[#464555]/30 text-[#c7c4d8]/70'
              } border flex items-center justify-center`}
            >
              <span className="material-symbols-outlined fill-1 text-base">account_balance_wallet</span>
            </div>
            <p className="font-mono-data text-[#c7c4d8] text-[11px] uppercase tracking-wider font-semibold">
              Total Balance
            </p>
          </div>

          <span
            className={`${
              balanceState === 'positive'
                ? 'text-[#93c5fd] bg-[#3b82f6]/10 border-[#3b82f6]/30'
                : balanceState === 'negative'
                ? 'text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/30'
                : 'text-[#c7c4d8]/80 bg-[#1e293b]/60 border-[#464555]/30'
            } border flex items-center text-[11px] font-mono-data px-2 py-0.5 rounded-md font-semibold`}
          >
            {balanceState === 'positive' && (
              <span className="material-symbols-outlined text-xs mr-1">trending_up</span>
            )}
            {balanceState === 'negative' && (
              <span className="material-symbols-outlined text-xs mr-1">trending_down</span>
            )}
            {balanceState === 'neutral' && (
              <span className="material-symbols-outlined text-xs mr-1">remove</span>
            )}
            {balanceState === 'positive' ? 'Positive' : balanceState === 'negative' ? 'Deficit' : 'No activity'}
          </span>
        </div>

        <div className="flex items-center my-auto overflow-hidden" title={`Exact Total Balance: ${balanceFmt.exact}`}>
          <h2 className={`${balanceFmt.className} font-bold text-[#e2edfa] tracking-tight font-mono-data group-hover:text-white transition-colors truncate`}>
            {balanceFmt.display}
          </h2>
        </div>

        <div className="h-1.5 w-full opacity-0" />
      </div>

      {/* Card 2: Current Spend */}
      <div
        className="bento-card group relative bg-gradient-to-b from-[#0e2136] to-[#0a1827] p-5 h-36 min-h-[144px] rounded-2xl flex flex-col justify-between border border-[#3b82f6]/20 hover:border-[#3b82f6]/50 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 animate-fade overflow-hidden"
        style={{ animationDelay: '0.08s' }}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
            isOverBudget
              ? 'from-red-500/0 via-[#ffb4ab] to-red-500/0'
              : isNearBudget
              ? 'from-amber-500/0 via-amber-400 to-amber-500/0'
              : 'from-blue-500/0 via-[#3b82f6] to-blue-500/0'
          } opacity-70 group-hover:opacity-100 transition-opacity`}
        />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg ${
                isOverBudget
                  ? 'bg-[#ffb4ab]/15 border-[#ffb4ab]/30 text-[#ffb4ab]'
                  : isNearBudget
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#93c5fd]'
              } border flex items-center justify-center`}
            >
              <span className="material-symbols-outlined text-base">shopping_bag</span>
            </div>
            <p className="font-mono-data text-[#c7c4d8] text-[11px] uppercase tracking-wider font-semibold">
              Current Spend
            </p>
          </div>

          <span
            className={`${
              isOverBudget
                ? 'text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/30'
                : isNearBudget
                ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                : 'text-[#93c5fd] bg-[#3b82f6]/10 border-[#3b82f6]/30'
            } border flex items-center text-[11px] font-mono-data px-2 py-0.5 rounded-md font-semibold`}
          >
            <span className="material-symbols-outlined text-xs mr-1">
              {isOverBudget ? 'error' : isNearBudget ? 'alarm' : monthlySpending > 0 ? 'receipt_long' : 'hourglass_empty'}
            </span>
            {totalBudgetLimit > 0
              ? isOverBudget
                ? 'Over Budget'
                : `${spendingRatio}% used`
              : monthlySpending > 0
              ? 'Active'
              : 'No Spend'}
          </span>
        </div>

        <div className="flex items-center my-auto overflow-hidden" title={`Exact Current Spend: ${spendingFmt.exact}`}>
          <h2 className={`${spendingFmt.className} font-bold text-[#e2edfa] tracking-tight font-mono-data group-hover:text-white transition-colors truncate`}>
            {spendingFmt.display}
          </h2>
        </div>

        <div className="h-1.5 w-full opacity-0" />
      </div>

      {/* Card 3: Savings Goal */}
      <div
        className="bento-card group relative bg-gradient-to-b from-[#0e2136] to-[#0a1827] p-5 h-36 min-h-[144px] rounded-2xl flex flex-col justify-between border border-[#3b82f6]/20 hover:border-[#3b82f6]/50 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 animate-fade overflow-hidden"
        style={{ animationDelay: '0.16s' }}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
            isGoalAchieved
              ? 'from-blue-500/0 via-[#93c5fd] to-blue-500/0'
              : isGoalInProgress
              ? 'from-blue-500/0 via-[#60a5fa] to-blue-500/0'
              : 'from-slate-500/0 via-slate-400/40 to-slate-500/0'
          } opacity-70 group-hover:opacity-100 transition-opacity`}
        />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg ${
                isGoalAchieved
                  ? 'bg-blue-500/20 border-blue-400/40 text-blue-200'
                  : isGoalInProgress
                  ? 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#93c5fd]'
                  : 'bg-[#1e293b]/60 border-[#464555]/30 text-[#c7c4d8]/70'
              } border flex items-center justify-center`}
            >
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
                  isGoalAchieved
                    ? 'text-[#93c5fd] bg-[#3b82f6]/15 border-[#3b82f6]/30'
                    : isGoalInProgress
                    ? 'text-[#bfdbfe] bg-[#1e3a8a]/30 border-[#3b82f6]/30'
                    : 'text-[#c7c4d8]/80 bg-[#1e293b]/60 border-[#464555]/30'
                } border flex items-center text-[11px] font-mono-data px-2 py-0.5 rounded-md font-semibold`}
              >
                <span className="material-symbols-outlined text-xs mr-0.5">
                  {isGoalAchieved ? 'check_circle' : isGoalInProgress ? 'ads_click' : 'flag_circle'}
                </span>
                {savingsProgress}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center my-auto overflow-hidden" title={`Exact Savings Goal: ${goalFmt.exact}`}>
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
            <h2 className={`${goalFmt.className} font-bold text-[#e2edfa] tracking-tight font-mono-data group-hover:text-white transition-colors truncate`}>
              {goalFmt.display}
            </h2>
          )}
        </div>

        {savingsGoal === 0 ? (
          <div className="h-1.5 w-full opacity-0" />
        ) : (
          <div className="h-1.5 w-full bg-[#1e293b] rounded-full overflow-hidden">
            <div
              className={`h-full ${
                isGoalAchieved
                  ? 'bg-gradient-to-r from-[#2563eb] to-[#93c5fd] shadow-[0_0_12px_rgba(147,197,253,0.6)]'
                  : 'bg-gradient-to-r from-[#1d4ed8] to-[#60a5fa] shadow-[0_0_10px_rgba(59,130,246,0.5)]'
              } rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, savingsProgress))}%` }}
            />
          </div>
        )}
      </div>

      {/* Card 4: Budget Left */}
      <div
        className="bento-card group relative bg-gradient-to-b from-[#0e2136] to-[#0a1827] p-5 h-36 min-h-[144px] rounded-2xl flex flex-col justify-between border border-[#3b82f6]/20 hover:border-[#3b82f6]/50 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(59,130,246,0.15)] hover:-translate-y-0.5 animate-fade overflow-hidden"
        style={{ animationDelay: '0.24s' }}
      >
        <div
          className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${
            totalBudgetLimit === 0
              ? 'from-slate-500/0 via-slate-400/40 to-slate-500/0'
              : isBudgetHealthy
              ? 'from-blue-500/0 via-[#60a5fa] to-blue-500/0'
              : isBudgetWarning
              ? 'from-amber-500/0 via-amber-400 to-amber-500/0'
              : 'from-red-500/0 via-[#ffb4ab] to-red-500/0'
          } opacity-70 group-hover:opacity-100 transition-opacity`}
        />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-lg ${
                !budgetExists
                  ? 'bg-[#1e293b]/60 border-[#464555]/30 text-[#c7c4d8]/70'
                  : isBudgetHealthy
                  ? 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#93c5fd]'
                  : isBudgetWarning
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-[#ffb4ab]/15 border-[#ffb4ab]/30 text-[#ffb4ab]'
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
            {budgetExists && (
              <span
                className={`${
                  isBudgetHealthy
                    ? 'text-[#93c5fd] bg-[#3b82f6]/10 border-[#3b82f6]/30'
                    : isBudgetWarning
                    ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                    : 'text-[#ffb4ab] bg-[#ffb4ab]/10 border-[#ffb4ab]/30'
                } border flex items-center text-[11px] font-mono-data px-2 py-0.5 rounded-md font-semibold`}
              >
                <span className="material-symbols-outlined text-xs mr-0.5">
                  {isBudgetHealthy ? 'verified_user' : isBudgetWarning ? 'fmd_bad' : 'warning_amber'}
                </span>
                {budgetRemainingPct}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center my-auto overflow-hidden" title={`Exact Budget Left: ${remainingFmt.exact}`}>
          {!budgetExists ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#c7c4d8]/80 font-mono-data">No budget set</span>
              <button
                onClick={onEditBudget}
                className="text-xs font-bold text-[#93c5fd] hover:text-white underline cursor-pointer font-mono-data"
              >
                Set a budget
              </button>
            </div>
          ) : (
            <h2 className={`${remainingFmt.className} font-bold text-[#e2edfa] tracking-tight font-mono-data group-hover:text-white transition-colors truncate`}>
              {remainingFmt.display}
            </h2>
          )}
        </div>

        {!budgetExists ? (
          <div className="h-1.5 w-full opacity-0" />
        ) : (
          <div className="h-1.5 w-full bg-[#1e293b] rounded-full overflow-hidden">
            <div
              className={`h-full ${
                isBudgetHealthy
                  ? 'bg-gradient-to-r from-[#1d4ed8] to-[#60a5fa] shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                  : isBudgetWarning
                  ? 'bg-gradient-to-r from-blue-600 via-amber-500 to-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                  : 'bg-gradient-to-r from-amber-600 to-[#ffb4ab] shadow-[0_0_10px_rgba(255,180,171,0.5)]'
              } rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(100, Math.max(0, budgetRemainingPct))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
