import type {
  CreditScoreEntry,
  Transaction,
  Expense,
  FinancialSnapshot,
  UserSettings,
  TransactionCategory,
} from './types';

export function calculateUtilisation(balance: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((balance / limit) * 100);
}

export function getHealthRating(
  score: number,
  utilisation: number
): FinancialSnapshot['healthRating'] {
  if (score === 0) return 'fair'; // No data yet
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
  paymentHistory: boolean, // true = all on time
  monthsAhead: number
): number {
  if (currentScore === 0) return 0;
  let predicted = currentScore;

  // Payment history impact
  if (paymentHistory) {
    predicted += monthsAhead * 5; // ~5 points per month for perfect payments
  } else {
    predicted -= monthsAhead * 15;
  }

  // Utilisation impact
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

export function categoriseTransaction(description: string): TransactionCategory {
  const desc = description.toLowerCase();

  if (desc.includes('rent') || desc.includes('property') || desc.includes('bond'))
    return 'housing';
  if (
    desc.includes('electric') ||
    desc.includes('water') ||
    desc.includes('municipal') ||
    desc.includes('eskom')
  )
    return 'utilities';
  if (
    desc.includes('checkers') ||
    desc.includes('woolworths') ||
    desc.includes('pick n pay') ||
    desc.includes('spar') ||
    desc.includes('shoprite') ||
    desc.includes('food')
  )
    return 'groceries';
  if (
    desc.includes('uber') ||
    desc.includes('bolt') ||
    desc.includes('petrol') ||
    desc.includes('engen') ||
    desc.includes('shell') ||
    desc.includes('bp') ||
    desc.includes('sasol')
  )
    return 'transport';
  if (
    desc.includes('netflix') ||
    desc.includes('spotify') ||
    desc.includes('dstv') ||
    desc.includes('showmax') ||
    desc.includes('youtube') ||
    desc.includes('apple music')
  )
    return 'entertainment';
  if (
    desc.includes('restaurant') ||
    desc.includes('kfc') ||
    desc.includes('nandos') ||
    desc.includes('mcdonalds') ||
    desc.includes('steers') ||
    desc.includes('wimpy')
  )
    return 'dining';
  if (
    desc.includes('takealot') ||
    desc.includes('amazon') ||
    desc.includes('game') ||
    desc.includes('mr price') ||
    desc.includes('edgars')
  )
    return 'shopping';
  if (
    desc.includes('medical') ||
    desc.includes('pharmacy') ||
    desc.includes('dischem') ||
    desc.includes('clicks') ||
    desc.includes('doctor')
  )
    return 'health';
  if (desc.includes('insurance') || desc.includes('old mutual') || desc.includes('sanlam'))
    return 'insurance';
  if (desc.includes('subscription') || desc.includes('monthly fee'))
    return 'subscriptions';
  if (desc.includes('salary') || desc.includes('income') || desc.includes('payment received'))
    return 'income';
  if (desc.includes('transfer') || desc.includes('eft'))
    return 'transfer';
  if (desc.includes('invest') || desc.includes('etf') || desc.includes('satrix'))
    return 'investments';
  if (desc.includes('loan') || desc.includes('repayment'))
    return 'debt_payment';

  return 'other';
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

  // Calculate monthly spending from transactions (last 30 days)
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

  // Calculate subscription costs from expenses
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
    healthRating,
    predictedScore3m: predictScore(currentScore, utilisation, true, 3),
    predictedScore6m: predictScore(currentScore, utilisation, true, 6),
  };
}

export function formatCurrency(amount: number): string {
  return `R${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
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
    other: '#6b7280',
  };
  return colors[category] || '#6b7280';
}
