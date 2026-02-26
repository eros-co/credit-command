import type {
  UserSettings,
  FinancialSnapshot,
  Transaction,
  Expense,
  CreditScoreEntry,
  PurchaseDecision,
  InvestmentDecision,
  MonthlyReport,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import {
  calculateUtilisation,
  formatCurrency,
  getCategoryLabel,
} from './calculations';

// ─── Purchase Decision Engine ───────────────────────────────────────────
export function generatePurchaseDecision(
  item: string,
  amount: number,
  settings: UserSettings,
  snapshot: FinancialSnapshot
): PurchaseDecision {
  const { monthlyIncome, creditLimit, creditCardBalance, monthlyRent } = settings;
  const disposableIncome = monthlyIncome - monthlyRent;
  const currentUtil = calculateUtilisation(creditCardBalance, creditLimit);
  const newUtil = calculateUtilisation(creditCardBalance + amount, creditLimit);
  const affordabilityRatio = amount / disposableIncome;

  let recommendation: PurchaseDecision['recommendation'];
  let reasoning: string;
  let creditImpact: string;
  let utilisationImpact: string;
  let cashFlowImpact: string;

  if (newUtil > 30) {
    if (affordabilityRatio > 0.5) {
      recommendation = 'avoid';
      reasoning = `Purchasing ${item} for ${formatCurrency(amount)} would push your credit utilisation to ${newUtil}% (above the critical 30% threshold) and represents ${Math.round(affordabilityRatio * 100)}% of your disposable income. This purchase is not advisable at this time. Your primary goal is to achieve a 740 credit score, and this purchase would significantly hinder that progress.`;
    } else {
      recommendation = 'delay';
      reasoning = `While you can technically afford ${item}, purchasing it now on credit would push utilisation to ${newUtil}%. Delay this purchase until your credit card balance is lower. Pay down existing balance first, then reconsider in 1-2 months.`;
    }
    creditImpact = `Negative. Utilisation above 30% will likely decrease your credit score by 10-30 points.`;
    utilisationImpact = `Current: ${currentUtil}% → After purchase: ${newUtil}% (EXCEEDS 30% threshold)`;
  } else if (newUtil > 9) {
    if (amount <= disposableIncome * 0.15) {
      recommendation = 'buy_credit';
      reasoning = `${item} for ${formatCurrency(amount)} is a manageable purchase. Using your credit card and paying the full balance at statement date will demonstrate responsible credit usage and help build your payment history — a key factor for reaching 740.`;
      creditImpact = `Mildly positive. Regular credit usage with full repayment builds payment history.`;
    } else {
      recommendation = 'split';
      reasoning = `Consider splitting the ${formatCurrency(amount)} purchase. Pay ${formatCurrency(Math.round(amount * 0.5))} on credit and ${formatCurrency(Math.round(amount * 0.5))} in cash. This keeps utilisation manageable while still building credit history.`;
      creditImpact = `Neutral to mildly positive if managed correctly.`;
    }
    utilisationImpact = `Current: ${currentUtil}% → After purchase: ${newUtil}% (within acceptable range)`;
  } else {
    recommendation = 'buy_credit';
    reasoning = `Excellent position. Purchasing ${item} for ${formatCurrency(amount)} on credit keeps utilisation at ${newUtil}%, well within the optimal 1-9% range. Pay the full balance at statement date to maximise credit score benefit.`;
    creditImpact = `Positive. Low utilisation with consistent repayment is the ideal credit behaviour.`;
    utilisationImpact = `Current: ${currentUtil}% → After purchase: ${newUtil}% (OPTIMAL range)`;
  }

  cashFlowImpact = affordabilityRatio <= 0.1
    ? `Minimal impact. This represents only ${Math.round(affordabilityRatio * 100)}% of your disposable income.`
    : affordabilityRatio <= 0.3
    ? `Moderate impact. This is ${Math.round(affordabilityRatio * 100)}% of your disposable income. Ensure other obligations are covered.`
    : `Significant impact. At ${Math.round(affordabilityRatio * 100)}% of disposable income, this will strain your monthly cash flow.`;

  return {
    id: uuidv4(),
    date: new Date().toISOString(),
    item,
    amount,
    recommendation,
    reasoning,
    creditImpact,
    utilisationImpact,
    cashFlowImpact,
  };
}

// ─── Investment Decision Engine ─────────────────────────────────────────
export function generateInvestmentDecision(
  description: string,
  amount: number,
  settings: UserSettings,
  snapshot: FinancialSnapshot
): InvestmentDecision {
  const { monthlyIncome, monthlyRent, creditCardBalance } = settings;
  const disposableIncome = monthlyIncome - monthlyRent;
  const savingsCapacity = disposableIncome - snapshot.totalMonthlySpending;
  const hasDebt = creditCardBalance > 0;
  const affordabilityRatio = amount / disposableIncome;

  let recommendation: InvestmentDecision['recommendation'];
  let reasoning: string;
  let roiAnalysis: string;

  if (hasDebt && creditCardBalance > amount) {
    recommendation = 'delay';
    reasoning = `Your current credit card balance is ${formatCurrency(creditCardBalance)}. Before investing ${formatCurrency(amount)} in "${description}", prioritise paying down your credit card debt. Credit card interest (typically 18-22% in SA) almost certainly exceeds any investment return. Eliminating this debt will also improve your credit utilisation ratio, directly supporting your 740 score target.`;
    roiAnalysis = `Credit card interest saved: ~20% p.a. vs typical investment returns of 8-12% p.a. Debt repayment offers a guaranteed higher return.`;
  } else if (affordabilityRatio > 0.4) {
    recommendation = 'reduce';
    reasoning = `Investing ${formatCurrency(amount)} represents ${Math.round(affordabilityRatio * 100)}% of your disposable income, which is too aggressive. Consider reducing the investment to ${formatCurrency(Math.round(disposableIncome * 0.2))} (20% of disposable income) to maintain financial flexibility and ensure all credit obligations are met on time.`;
    roiAnalysis = `A reduced investment maintains your ability to service all credit obligations — the primary driver of your credit score improvement.`;
  } else if (snapshot.utilisationRatio > 30) {
    recommendation = 'delay';
    reasoning = `Your current credit utilisation is ${snapshot.utilisationRatio}%, which is above the optimal threshold. Direct this ${formatCurrency(amount)} toward reducing your credit card balance instead. Once utilisation is below 10%, you can redirect funds to investments.`;
    roiAnalysis = `Reducing utilisation from ${snapshot.utilisationRatio}% to below 10% could improve your credit score by 30-50 points — a more valuable outcome than investment returns at this stage.`;
  } else {
    recommendation = 'good';
    reasoning = `Your financial position supports this investment. With utilisation at ${snapshot.utilisationRatio}% and manageable debt levels, investing ${formatCurrency(amount)} in "${description}" is a sound decision. Ensure you maintain your credit payment schedule and keep utilisation below 10%.`;
    roiAnalysis = `With credit obligations managed, this investment can contribute to long-term wealth building while your credit score continues to improve.`;
  }

  return {
    id: uuidv4(),
    date: new Date().toISOString(),
    description,
    amount,
    recommendation,
    reasoning,
    roiAnalysis,
  };
}

// ─── Monthly Report Generator ───────────────────────────────────────────
export function generateMonthlyReport(
  month: string,
  settings: UserSettings,
  snapshot: FinancialSnapshot,
  creditScores: CreditScoreEntry[],
  transactions: Transaction[],
  expenses: Expense[]
): MonthlyReport {
  const { currentScore, utilisationRatio, totalMonthlySpending } = snapshot;
  const { monthlyIncome, monthlyRent, targetScore } = settings;

  // Score change
  const scoreChange =
    creditScores.length >= 2
      ? creditScores[creditScores.length - 1].score -
        creditScores[creditScores.length - 2].score
      : 0;

  // Risk factors
  const riskFactors: string[] = [];
  if (utilisationRatio > 30)
    riskFactors.push(
      `Credit utilisation at ${utilisationRatio}% — exceeds the 30% threshold. This is actively harming your score.`
    );
  if (utilisationRatio > 9 && utilisationRatio <= 30)
    riskFactors.push(
      `Credit utilisation at ${utilisationRatio}% — acceptable but not optimal. Target below 9% for maximum score improvement.`
    );
  if (totalMonthlySpending > monthlyIncome * 0.8)
    riskFactors.push(
      `Monthly spending at ${formatCurrency(totalMonthlySpending)} is ${Math.round((totalMonthlySpending / monthlyIncome) * 100)}% of income. Reduce to maintain financial buffer.`
    );
  if (currentScore < targetScore)
    riskFactors.push(
      `Current score ${currentScore} is ${targetScore - currentScore} points below your target of ${targetScore}.`
    );

  // Smart moves
  const smartMoves: string[] = [
    'Pay all credit accounts on or before due date — this is the single most impactful action.',
    `Keep FNB credit card utilisation below 9% (${formatCurrency(Math.round(settings.creditLimit * 0.09))} of your ${formatCurrency(settings.creditLimit)} limit).`,
    'Do not apply for any new credit during this optimisation period.',
  ];

  if (utilisationRatio > 9) {
    smartMoves.push(
      `Reduce credit card balance by ${formatCurrency(Math.round(settings.creditCardBalance - settings.creditLimit * 0.09))} to reach optimal utilisation.`
    );
  }

  // Spending adjustments
  const spendingAdjustments: string[] = [];
  const subscriptionTotal = expenses
    .filter((e) => e.isSubscription)
    .reduce((sum, e) => sum + e.amount, 0);

  if (subscriptionTotal > monthlyIncome * 0.05) {
    spendingAdjustments.push(
      `Subscription costs of ${formatCurrency(subscriptionTotal)} represent ${Math.round((subscriptionTotal / monthlyIncome) * 100)}% of income. Review and cancel non-essential subscriptions.`
    );
  }

  if (totalMonthlySpending > 0) {
    // Analyse category spending
    const categorySpending = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'debit')
      .forEach((t) => {
        const current = categorySpending.get(t.category) || 0;
        categorySpending.set(t.category, current + t.amount);
      });

    categorySpending.forEach((amount, category) => {
      const pct = (amount / totalMonthlySpending) * 100;
      if (pct > 25 && category !== 'housing' && category !== 'debt_payment') {
        spendingAdjustments.push(
          `${getCategoryLabel(category as any)} spending at ${formatCurrency(amount)} (${Math.round(pct)}% of total) — consider reducing.`
        );
      }
    });
  }

  // Credit usage plan
  const creditUsagePlan =
    utilisationRatio <= 9
      ? `Maintain current excellent utilisation of ${utilisationRatio}%. Continue using your FNB credit card for small, regular purchases and paying the full balance monthly.`
      : `Priority: Reduce utilisation from ${utilisationRatio}% to below 9%. Target credit card balance of ${formatCurrency(Math.round(settings.creditLimit * 0.09))} or less. Pay more than the minimum — ideally the full balance each month.`;

  // Warnings
  const warnings: string[] = [];
  if (scoreChange < 0)
    warnings.push(
      `Score decreased by ${Math.abs(scoreChange)} points this month. Review recent credit behaviour for issues.`
    );
  if (utilisationRatio > 50)
    warnings.push(
      'CRITICAL: Utilisation above 50% is severely damaging your credit score. Immediate action required.'
    );

  const summary = `
**Financial Health Assessment — ${month}**

Your current credit score is **${currentScore}** (${scoreChange >= 0 ? '+' : ''}${scoreChange} from last month). Credit utilisation stands at **${utilisationRatio}%** against your ${formatCurrency(settings.creditLimit)} limit. Total monthly spending was **${formatCurrency(totalMonthlySpending)}** against income of **${formatCurrency(monthlyIncome)}**.

${currentScore >= targetScore
  ? `Congratulations — you have reached your target score of ${targetScore}. Focus now shifts to maintaining this score and preparing for future lending applications.`
  : `You are ${targetScore - currentScore} points away from your target of ${targetScore}. ${utilisationRatio <= 9 ? 'Your utilisation is optimal — continue with consistent on-time payments.' : 'Reducing utilisation should be your primary focus this month.'}`
}
`.trim();

  const creditTrajectory =
    scoreChange > 0
      ? `Positive trajectory. Score improved by ${scoreChange} points. At this rate, you could reach ${targetScore} within ${Math.max(1, Math.ceil((targetScore - currentScore) / Math.max(scoreChange, 1)))} months.`
      : scoreChange === 0
      ? `Stable. Score unchanged. Ensure you are actively optimising utilisation and payment behaviour to drive improvement.`
      : `Declining. Score dropped by ${Math.abs(scoreChange)} points. Investigate the cause — likely a missed payment or increased utilisation.`;

  return {
    id: uuidv4(),
    month,
    generatedAt: new Date().toISOString(),
    healthScore: Math.round(
      (currentScore / 740) * 50 + ((100 - Math.min(utilisationRatio, 100)) / 100) * 30 + (scoreChange >= 0 ? 20 : 0)
    ),
    summary,
    creditTrajectory,
    riskFactors,
    smartMoves,
    spendingAdjustments,
    creditUsagePlan,
    warnings,
    scoreChange,
    predictedNextScore: snapshot.predictedScore3m,
  };
}
