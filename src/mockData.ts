import { Transaction, RecurringItem, ChartBarData, BudgetConfig } from './types';

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    merchant: 'Whole Foods Market',
    category: 'Groceries',
    date: 'May 12, 2024',
    amount: -142.50,
    icon: 'shopping_cart'
  },
  {
    id: 'tx-2',
    merchant: 'Netflix Premium',
    category: 'Entertainment',
    date: 'May 10, 2024',
    amount: -19.99,
    icon: 'subscriptions'
  },
  {
    id: 'tx-3',
    merchant: 'Salaries Ltd',
    category: 'Income',
    date: 'May 01, 2024',
    amount: 4200.00,
    icon: 'payments'
  },
  {
    id: 'tx-4',
    merchant: 'Blue Bottle Coffee',
    category: 'Dining Out',
    date: 'May 11, 2024',
    amount: -12.40,
    icon: 'local_cafe'
  },
  {
    id: 'tx-5',
    merchant: 'Chevron Station',
    category: 'Travel',
    date: 'May 08, 2024',
    amount: -45.00,
    icon: 'local_gas_station'
  },
  {
    id: 'tx-6',
    merchant: 'Equinox Gym',
    category: 'Fitness',
    date: 'May 05, 2024',
    amount: -45.00,
    icon: 'fitness_center'
  }
];

export const INITIAL_RECURRING: RecurringItem[] = [];

export const WEEKLY_CHART_DATA: ChartBarData[] = [
  { label: 'MON', rent: 20, food: 45, travel: 15 },
  { label: 'TUE', rent: 20, food: 60, travel: 25 },
  { label: 'WED', rent: 20, food: 30, travel: 35 },
  { label: 'THU', rent: 20, food: 70, travel: 20 },
  { label: 'FRI', rent: 20, food: 85, travel: 50 },
  { label: 'SAT', rent: 20, food: 90, travel: 40 },
  { label: 'SUN', rent: 20, food: 50, travel: 30 }
];

export const MONTHLY_CHART_DATA: ChartBarData[] = [
  { label: 'JAN', rent: 65, food: 35, travel: 20 },
  { label: 'FEB', rent: 75, food: 42, travel: 15 },
  { label: 'MAR', rent: 60, food: 38, travel: 45 },
  { label: 'APR', rent: 85, food: 55, travel: 25 },
  { label: 'MAY', rent: 68, food: 48, travel: 30 }
];

export const YEARLY_CHART_DATA: ChartBarData[] = [
  { label: '2021', rent: 50, food: 40, travel: 30 },
  { label: '2022', rent: 60, food: 45, travel: 35 },
  { label: '2023', rent: 75, food: 50, travel: 40 },
  { label: '2024', rent: 82, food: 58, travel: 48 }
];

export const INITIAL_BUDGET: BudgetConfig = {
  totalLimit: 5000,
  essential: 2500,
  discretionary: 1500,
  aiSmartAdjust: true
};
