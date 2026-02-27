import type {
  CreditScoreEntry,
  Transaction,
  Expense,
  FinancialSnapshot,
  UserSettings,
  TransactionCategory,
  PurchaseDecision,
  SavingsPlan,
} from './types';

export function calculateUtilisation(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((balance / limit) * 100);
}

export function getHealthRating(
  score: number,
  utilisation: number
): FinancialSnapshot['healthRating'] {
  if (score === 0) return 'fair';
  if (score >= 700 && utilisation <= 10) return 'excellent';
  if (score >= 650 && utilisation <= 30) return 'good';
  if (score >= 580 && utilisation <= 50) return 'fair';
  if (score >= 500) return 'poor';
  return 'critical';
}

export function getScoreTrend(
  scores: CreditScoreEntry[]
): 'up' | 'down' | 'stable' {
  if (scores.length < 2) return 'stable';
  const last = scores[scores.length - 1].score;
  const prev = scores[scores.length - 2].score;
  if (last > prev) return 'up';
  if (last < prev) return 'down';
  return 'stable';
}

export function predictScore(
  currentScore: number,
  utilisation: number,
  paymentHistory: boolean,
  monthsAhead: number
): number {
  if (currentScore === 0) return 0;
  let predicted = currentScore;

  if (paymentHistory) {
    predicted += monthsAhead * 5;
  } else {
    predicted -= monthsAhead * 15;
  }

  if (utilisation <= 9) {
    predicted += monthsAhead * 3;
  } else if (utilisation <= 30) {
    predicted += monthsAhead * 1;
  } else if (utilisation <= 50) {
    predicted -= monthsAhead * 2;
  } else {
    predicted -= monthsAhead * 5;
  }

  return Math.min(740, Math.max(300, Math.round(predicted)));
}

export function calculateFinancialSnapshot(
  settings: UserSettings,
  creditScores: CreditScoreEntry[],
  transactions: Transaction[],
  expenses: Expense[]
): FinancialSnapshot {
  const currentScore =
    creditScores.length > 0
      ? creditScores[creditScores.length - 1].score
      : 0;

  const utilisation = calculateUtilisation(
    settings.creditCardBalance,
    settings.creditLimit
  );

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentTxns = transactions.filter(
    (t) => new Date(t.date) >= thirtyDaysAgo && t.type === 'debit'
  );

  const totalMonthlySpending = recentTxns.reduce((sum, t) => sum + t.amount, 0);
  const creditSpending = recentTxns
    .filter((t) => t.source === 'credit_card')
    .reduce((sum, t) => sum + t.amount, 0);
  const cashSpending = totalMonthlySpending - creditSpending;

  const subscriptionCosts = expenses
    .filter((e) => e.isSubscription && e.frequency === 'monthly')
    .reduce((sum, e) => sum + e.amount, 0);

  const healthRating = getHealthRating(currentScore, utilisation);
  const scoreTrend = getScoreTrend(creditScores);

  return {
    currentScore,
    scoreTrend,
    utilisationRatio: utilisation,
    totalMonthlySpending,
    creditSpending,
    cashSpending,
    subscriptionCosts,
    totalSavings: settings.savingsBalance,
    totalCash: settings.debitBalance + settings.savingsBalance,
    healthRating,
    predictedScore3m: predictScore(currentScore, utilisation, true, 3),
    predictedScore6m: predictScore(currentScore, utilisation, true, 6),
  };
}

export function analyzePurchaseTimeline(
  item: string,
  amount: number,
  snapshot: FinancialSnapshot,
  settings: UserSettings
): PurchaseDecision {
  const monthlyDisposable = settings.monthlyIncome - snapshot.totalMonthlySpending;
  const targetSavingsRate = 0.3; // Recommend saving 30% of disposable income
  const monthlySavingsAmount = Math.max(500, monthlyDisposable * targetSavingsRate);

  let recommendation: PurchaseDecision['recommendation'] = 'buy_now';
  let monthsToSave = 0;
  let reasoning = "";

  if (amount <= snapshot.totalCash * 0.15) {
    recommendation = 'buy_now';
    reasoning = `This purchase is well within your liquid cash reserves (R${snapshot.totalCash.toFixed(2)}). You can afford this without impacting your financial health.`;
  } else if (monthlyDisposable > 0) {
    recommendation = 'save_and_buy';
    monthsToSave = Math.ceil(amount / monthlySavingsAmount);
    reasoning = `By setting aside R${monthlySavingsAmount.toFixed(2)} per month, you can purchase this in ${monthsToSave} months. This protects your emergency fund and keeps you debt-free.`;
  } else {
    recommendation = 'avoid';
    reasoning = `Your current monthly spending exceeds or equals your income. We strongly advise avoiding new non-essential purchases until your cash flow improves.`;
  }

  const savingsPlan: SavingsPlan[] = [];
  const now = new Date();
  for (let i = 1; i <= Math.max(1, monthsToSave); i++) {
    const planDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    savingsPlan.push({
      month: planDate.toISOString().substring(0, 7),
      amount: monthsToSave > 0 ? monthlySavingsAmount : amount,
      targetBalance: monthsToSave > 0 ? Math.min(amount, monthlySavingsAmount * i) : amount
    });
  }

  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthsToSave, 1);

  return {
    id: `pd-${Date.now()}`,
    date: new Date().toISOString(),
    item,
    amount,
    recommendation,
    targetPurchaseDate: targetDate.toISOString().substring(0, 7),
    reasoning,
    savingsPlan,
    creditImpact: amount > settings.creditLimit * 0.2 ? "High" : "Low",
    utilisationImpact: `${((amount / settings.creditLimit) * 100).toFixed(1)}%`,
    cashFlowImpact: `R${amount.toFixed(2)}`
  };
}

export function formatCurrency(amount: number): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return isNegative ? `-R${formatted}` : `R${formatted}`;
}

export function getUtilisationColor(ratio: number): string {
  if (ratio <= 9) return 'text-emerald-400';
  if (ratio <= 30) return 'text-green-400';
  if (ratio <= 50) return 'text-yellow-400';
  if (ratio <= 75) return 'text-orange-400';
  return 'text-red-400';
}

export function getScoreColor(score: number): string {
  if (score >= 700) return 'text-emerald-400';
  if (score >= 650) return 'text-green-400';
  if (score >= 580) return 'text-yellow-400';
  if (score >= 500) return 'text-orange-400';
  return 'text-red-400';
}

export function getHealthColor(
  rating: FinancialSnapshot['healthRating']
): string {
  switch (rating) {
    case 'excellent':
      return 'text-emerald-400';
    case 'good':
      return 'text-green-400';
    case 'fair':
      return 'text-yellow-400';
    case 'poor':
      return 'text-orange-400';
    case 'critical':
      return 'text-red-400';
  }
}

export function getCategoryLabel(category: TransactionCategory): string {
  const labels: Record<TransactionCategory, string> = {
    housing: 'Housing',
    utilities: 'Utilities',
    groceries: 'Groceries',
    transport: 'Transport',
    entertainment: 'Entertainment',
    dining: 'Dining Out',
    shopping: 'Shopping',
    health: 'Health',
    insurance: 'Insurance',
    subscriptions: 'Subscriptions',
    savings: 'Savings',
    investments: 'Investments',
    debt_payment: 'Debt Payment',
    income: 'Income',
    transfer: 'Transfer',
    bank_charges: 'Bank Charges',
    fuel: 'Fuel',
    mobile_data: 'Mobile & Data',
    other: 'Other',
  };
  return labels[category] || 'Other';
}

export function getCategoryColor(category: TransactionCategory): string {
  const colors: Record<TransactionCategory, string> = {
    housing: '#6366f1',
    utilities: '#8b5cf6',
    groceries: '#22c55e',
    transport: '#3b82f6',
    entertainment: '#f59e0b',
    dining: '#ef4444',
    shopping: '#ec4899',
    health: '#14b8a6',
    insurance: '#64748b',
    subscriptions: '#a855f7',
    savings: '#10b981',
    investments: '#06b6d4',
    debt_payment: '#f97316',
    income: '#22d3ee',
    transfer: '#94a3b8',
    bank_charges: '#f43f5e',
    fuel: '#eab308',
    mobile_data: '#06b6d4',
    other: '#6b7280',
  };
  return colors[category] || '#6b7280';
}
