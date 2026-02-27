'use client';

import { useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  Wallet,
  PieChart,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  PiggyBank,
  ShieldCheck,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import {
  calculateFinancialSnapshot,
  formatCurrency,
  getScoreColor,
  getUtilisationColor,
  getHealthColor,
} from '@/lib/calculations';
import MetricCard from '@/components/MetricCard';

export default function DashboardPage() {
  const { settings, creditScores, transactions, expenses } = useAppStore();

  const snapshot = useMemo(
    () =>
      calculateFinancialSnapshot(settings, creditScores, transactions, expenses),
    [settings, creditScores, transactions, expenses]
  );

  const scoreChartData = useMemo(
    () =>
      creditScores.map((s) => ({
        date: new Date(s.date).toLocaleDateString('en-ZA', {
          month: 'short',
          year: '2-digit',
        }),
        score: s.score,
        bureau: s.bureau,
      })),
    [creditScores]
  );

  const gapToTarget = settings.targetScore - snapshot.currentScore;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Financial Command Centre</h1>
          <p className="text-sm text-muted mt-1">
            Aggregated view of FNB Current, Credit, and Savings accounts
          </p>
        </div>
        <div className="badge badge-blue">
          Target: {settings.targetScore} by{' '}
          {settings.targetDate ? new Date(settings.targetDate).toLocaleDateString('en-ZA', {
            month: 'short',
            year: 'numeric',
          }) : 'Unknown'}
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Credit Score"
          value={snapshot.currentScore || '—'}
          icon={<TrendingUp className="w-5 h-5" />}
          trend={snapshot.scoreTrend}
          trendValue={
            creditScores.length >= 2
              ? `${Math.abs(
                creditScores[creditScores.length - 1].score -
                creditScores[creditScores.length - 2].score
              )} pts`
              : undefined
          }
          glow={snapshot.currentScore >= 700 ? 'green' : 'blue'}
          valueColor={getScoreColor(snapshot.currentScore)}
        />
        <MetricCard
          title="Total Cash"
          value={formatCurrency(snapshot.totalCash)}
          subtitle={`R${settings.savingsBalance.toLocaleString()} in Savings`}
          icon={<PiggyBank className="w-5 h-5" />}
          glow="green"
          valueColor="text-emerald-400"
        />
        <MetricCard
          title="Utilisation"
          value={`${snapshot.utilisationRatio}%`}
          subtitle={`of ${formatCurrency(settings.creditLimit)} limit`}
          icon={<CreditCard className="w-5 h-5" />}
          glow={snapshot.utilisationRatio <= 9 ? 'green' : snapshot.utilisationRatio <= 30 ? 'yellow' : 'red'}
          valueColor={getUtilisationColor(snapshot.utilisationRatio)}
        />
        <MetricCard
          title="Health Rating"
          value={snapshot.healthRating.toUpperCase()}
          subtitle="Overall financial health"
          icon={<Activity className="w-5 h-5" />}
          glow={
            snapshot.healthRating === 'excellent'
              ? 'green'
              : snapshot.healthRating === 'good'
                ? 'green'
                : snapshot.healthRating === 'fair'
                  ? 'yellow'
                  : 'red'
          }
          valueColor={getHealthColor(snapshot.healthRating)}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Credit Score Trend */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-medium text-muted mb-4">
            Credit Score Trend
          </h3>
          {scoreChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={scoreChartData}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis
                  domain={[300, 850]}
                  stroke="#64748b"
                  fontSize={12}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1a2332',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted text-sm">
              No credit score data yet. Add your first score in the Credit Score
              tracker.
            </div>
          )}
        </div>

        {/* Score Predictions */}
        <div className="card">
          <h3 className="text-sm font-medium text-muted mb-4">
            Score Projections
          </h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs text-muted mb-2">
                <span>Current</span>
                <span>{snapshot.currentScore} / {settings.targetScore}</span>
              </div>
              <div className="w-full bg-[#1a2332] rounded-full h-3">
                <div
                  className="bg-accent rounded-full h-3 transition-all"
                  style={{
                    width: `${Math.min(
                      (snapshot.currentScore / settings.targetScore) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">3-Month Prediction</span>
                <span className={`text-lg font-bold ${getScoreColor(snapshot.predictedScore3m)}`}>
                  {snapshot.predictedScore3m}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">6-Month Prediction</span>
                <span className={`text-lg font-bold ${getScoreColor(snapshot.predictedScore6m)}`}>
                  {snapshot.predictedScore6m}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted">Gap to Target</span>
                <span
                  className={`text-lg font-bold ${gapToTarget <= 0 ? 'text-emerald-400' : 'text-accent'
                    }`}
                >
                  {gapToTarget <= 0 ? 'Achieved!' : `${gapToTarget} pts`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-accent" />
            <span className="text-xs text-muted uppercase tracking-wider">
              Monthly Spending
            </span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Credit</span>
              <span className="text-accent">
                {formatCurrency(snapshot.creditSpending)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Debit/Cash</span>
              <span className="text-foreground">
                {formatCurrency(snapshot.cashSpending)}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-muted uppercase tracking-wider">
              Subscriptions
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {formatCurrency(snapshot.subscriptionCosts)}
          </div>
          <div className="text-xs text-muted mt-1">
            {Math.round(
              (snapshot.subscriptionCosts / settings.monthlyIncome) * 100
            )}
            % of income
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-muted uppercase tracking-wider">
              Savings Ratio
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {Math.round(((settings.monthlyIncome - snapshot.totalMonthlySpending) / settings.monthlyIncome) * 100)}%
          </div>
          <div className="text-xs text-muted mt-1">Target: 20% or higher</div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-muted uppercase tracking-wider">
              Income
            </span>
          </div>
          <div className="text-2xl font-bold text-yellow-400">
            {formatCurrency(settings.monthlyIncome)}
          </div>
          <div className="text-xs text-muted mt-1">Monthly gross income</div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="card">
        <h3 className="text-sm font-medium text-muted mb-4">
          Smart Insights
        </h3>
        <div className="space-y-3">
          {snapshot.utilisationRatio <= 9 ? (
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                Credit utilisation is in the <strong>optimal range (0-9%)</strong>. This is boosting your score significantly.
              </p>
            </div>
          ) : snapshot.utilisationRatio <= 30 ? (
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                Your utilisation is <strong>under 30%</strong>. Good job! Reducing it to under 10% could add another 10-15 points.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                High credit utilisation detected. Prioritise paying down your <strong>FNB Credit Card</strong> to under R{(settings.creditLimit * 0.3).toFixed(0)} to see a score jump.
              </p>
            </div>
          )}

          {snapshot.totalSavings < snapshot.totalMonthlySpending ? (
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                Emergency fund is low. Try to build your <strong>Savings Account</strong> balance to at least {formatCurrency(snapshot.totalMonthlySpending * 3)} (3 months of expenses).
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-foreground">
                You have a healthy emergency fund covering over 3 months of expenses. Great financial security!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
