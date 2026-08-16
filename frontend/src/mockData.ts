import { Transaction, RecurringItem, ChartBarData, BudgetConfig } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_RECURRING: RecurringItem[] = [];

export const WEEKLY_CHART_DATA: ChartBarData[] = [];
export const MONTHLY_CHART_DATA: ChartBarData[] = [];
export const YEARLY_CHART_DATA: ChartBarData[] = [];

export const INITIAL_BUDGET: BudgetConfig = {
  totalLimit: 0,
  essential: 0,
  discretionary: 0,
  aiSmartAdjust: true
};
