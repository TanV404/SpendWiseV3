export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  provider: 'email' | 'google' | 'guest';
}

export interface Transaction {
  id: string;
  merchant: string;
  category: string;
  date: string;
  amount: number; // positive for income, negative for expense
  selected?: boolean;
  icon?: string;
}

export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  icon: string;
  date?: string;
  dueDate?: string;
  next_expected_date?: string;
  category?: string;
  frequency?: 'monthly' | 'weekly' | 'biweekly' | 'yearly' | 'custom';
  interval_days?: number;
}

export interface ChartBarData {
  label: string;
  rent: number; // percentage or dollar height ratio
  food: number;
  travel: number;
}

export type ChartTimeframe = 'weekly' | 'monthly' | 'yearly';

export type ModalType =
  | 'edit-budget'
  | 'summary'
  | 'upload'
  | 'recurring'
  | 'add-transaction'
  | 'edit-transaction'
  | 'edit-categories'
  | 'edit-savings-goal'
  | null;

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface BudgetConfig {
  totalLimit: number;
  essential: number;
  discretionary: number;
  aiSmartAdjust: boolean;
}

export interface CategoryItem {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

export interface BudgetStatusItem {
  category_id?: string;
  category_name: string;
  monthly_limit: number;
  spent: number;
  remaining: number;
}

export interface CategoryAtRisk {
  category_id?: string;
  category_name: string;
  projected_spend: number;
  monthly_limit: number;
}

export interface ForecastResponse {
  daily_burn_rate: number;
  projected_total: number | null;
  current_spend: number;
  monthly_budget: number;
  remaining_budget: number;
  insufficient_data: boolean;
  status: 'UNDER_BUDGET' | 'NEAR_BUDGET' | 'OVER_BUDGET';
  categories_at_risk: CategoryAtRisk[];
}

