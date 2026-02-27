export interface CreditScoreEntry {
  id: string;
  date: string; // ISO date
  score: number;
  bureau: 'experian' | 'transunion' | 'xds';
  notes?: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: TransactionCategory;
  type: 'debit' | 'credit';
  source: 'bank' | 'credit_card' | 'savings';
  accountNumber?: string;
  isSubscription: boolean;
  tags?: string[];
}

export type TransactionCategory =
  | 'housing'
  | 'utilities'
  | 'groceries'
  | 'transport'
  | 'entertainment'
  | 'dining'
  | 'shopping'
  | 'health'
  | 'insurance'
  | 'subscriptions'
  | 'savings'
  | 'investments'
  | 'debt_payment'
  | 'income'
  | 'transfer'
  | 'bank_charges'
  | 'fuel'
  | 'mobile_data'
  | 'other';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: TransactionCategory;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  isSubscription: boolean;
  startDate: string;
  endDate?: string;
  notes?: string;
}

export interface SavingsPlan {
  month: string; // YYYY-MM
  amount: number;
  targetBalance: number;
}

export interface PurchaseDecision {
  id: string;
  date: string;
  item: string;
  amount: number;
  recommendation: 'buy_now' | 'save_and_buy' | 'delay' | 'avoid';
  targetPurchaseDate: string; // YYYY-MM
  reasoning: string;
  savingsPlan: SavingsPlan[];
  creditImpact: string;
  utilisationImpact: string;
  cashFlowImpact: string;
}

export interface InvestmentDecision {
  id: string;
  date: string;
  description: string;
  amount: number;
  recommendation: 'good' | 'delay' | 'reduce' | 'cancel';
  reasoning: string;
  roiAnalysis: string;
}

export interface MonthlyReport {
  id: string;
  month: string; // YYYY-MM
  generatedAt: string;
  healthScore: number;
  summary: string;
  creditTrajectory: string;
  riskFactors: string[];
  smartMoves: string[];
  spendingAdjustments: string[];
  creditUsagePlan: string;
  warnings: string[];
  scoreChange: number;
  predictedNextScore: number;
}

export interface UserSettings {
  monthlyIncome: number;
  monthlyRent: number;
  creditLimit: number;
  creditCardBalance: number;
  savingsBalance: number;
  debitBalance: number;
  targetScore: number;
  targetDate: string;
  name: string;
}

export interface FinancialSnapshot {
  currentScore: number;
  scoreTrend: 'up' | 'down' | 'stable';
  utilisationRatio: number;
  totalMonthlySpending: number;
  creditSpending: number;
  cashSpending: number;
  subscriptionCosts: number;
  totalSavings: number;
  totalCash: number;
  healthRating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  predictedScore3m: number;
  predictedScore6m: number;
}

export interface AppState {
  settings: UserSettings;
  creditScores: CreditScoreEntry[];
  transactions: Transaction[];
  expenses: Expense[];
  purchaseDecisions: PurchaseDecision[];
  investmentDecisions: InvestmentDecision[];
  monthlyReports: MonthlyReport[];
  isAuthenticated: boolean;
}
