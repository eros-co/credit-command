'use client';

import { useState, useMemo } from 'react';
import {
  PiggyBank,
  ThumbsUp,
  Clock,
  TrendingDown,
  XCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  calculateFinancialSnapshot,
  formatCurrency,
} from '@/lib/calculations';
import { generateInvestmentDecision } from '@/lib/ai-engine';
import type { InvestmentDecision } from '@/lib/types';

const RECOMMENDATION_CONFIG: Record<
  InvestmentDecision['recommendation'],
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  good: {
    label: 'Good Decision',
    icon: <ThumbsUp className="w-5 h-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/30',
  },
  delay: {
    label: 'Delay Investment',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/30',
  },
  reduce: {
    label: 'Reduce Amount',
    icon: <TrendingDown className="w-5 h-5" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10 border-orange-400/30',
  },
  cancel: {
    label: 'Cancel Investment',
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/30',
  },
};

export default function InvestmentAdvisorPage() {
  const {
    settings,
    creditScores,
    transactions,
    expenses,
    investmentDecisions,
    addInvestmentDecision,
  } = useAppStore();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currentDecision, setCurrentDecision] =
    useState<InvestmentDecision | null>(null);

  const snapshot = useMemo(
    () =>
      calculateFinancialSnapshot(settings, creditScores, transactions, expenses),
    [settings, creditScores, transactions, expenses]
  );

  const handleAnalyse = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || !description) return;

    const decision = generateInvestmentDecision(
      description,
      amt,
      settings,
      snapshot
    );
    setCurrentDecision(decision);
    addInvestmentDecision(decision);
  };

  const handleClear = () => {
    setDescription('');
    setAmount('');
    setCurrentDecision(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Investment Decision Advisor</h1>
        <p className="text-sm text-muted mt-1">
          Evaluate investment decisions against your credit optimisation goals
          and financial stability
        </p>
      </div>

      {/* Input Form */}
      <div className="card">
        <h3 className="text-sm font-medium mb-4">Evaluate an Investment</h3>
        <form onSubmit={handleAnalyse} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                Investment Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Satrix Top 40 ETF, Business equipment, Online course"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Amount (R)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 3000"
                min={0}
                step={0.01}
                required
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
            >
              <PiggyBank className="w-4 h-4" />
              Evaluate Investment
            </button>
            {currentDecision && (
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Current Decision Result */}
      {currentDecision && (
        <div className="space-y-4">
          {(() => {
            const config =
              RECOMMENDATION_CONFIG[currentDecision.recommendation];
            return (
              <div className={`card border ${config.bgColor}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={config.color}>{config.icon}</div>
                  <div>
                    <div className={`text-lg font-bold ${config.color}`}>
                      {config.label}
                    </div>
                    <div className="text-xs text-muted">
                      {currentDecision.description} —{' '}
                      {formatCurrency(currentDecision.amount)}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed">
                  {currentDecision.reasoning}
                </p>
              </div>
            );
          })()}

          {/* ROI Analysis */}
          <div className="card">
            <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
              ROI & Financial Analysis
            </h4>
            <p className="text-sm leading-relaxed">
              {currentDecision.roiAnalysis}
            </p>
          </div>
        </div>
      )}

      {/* Financial Context */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Available for Investment
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {formatCurrency(
              Math.max(
                0,
                settings.monthlyIncome -
                  settings.monthlyRent -
                  snapshot.totalMonthlySpending
              )
            )}
          </div>
          <div className="text-xs text-muted mt-1">
            After expenses and rent
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Credit Card Balance
          </div>
          <div
            className={`text-2xl font-bold ${
              settings.creditCardBalance > 0 ? 'text-yellow-400' : 'text-emerald-400'
            }`}
          >
            {formatCurrency(settings.creditCardBalance)}
          </div>
          <div className="text-xs text-muted mt-1">
            {settings.creditCardBalance > 0
              ? 'Pay this down before investing'
              : 'No outstanding balance'}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Utilisation
          </div>
          <div
            className={`text-2xl font-bold ${
              snapshot.utilisationRatio <= 9
                ? 'text-emerald-400'
                : snapshot.utilisationRatio <= 30
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}
          >
            {snapshot.utilisationRatio}%
          </div>
          <div className="text-xs text-muted mt-1">
            {snapshot.utilisationRatio <= 9
              ? 'Optimal — safe to invest'
              : 'Reduce before investing'}
          </div>
        </div>
      </div>

      {/* History */}
      {investmentDecisions.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-muted mb-4">
            Decision History
          </h3>
          <div className="space-y-3">
            {investmentDecisions.slice(0, 10).map((dec) => {
              const config = RECOMMENDATION_CONFIG[dec.recommendation];
              return (
                <div
                  key={dec.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#1a2332]"
                >
                  <div className="flex items-center gap-3">
                    <div className={config.color}>{config.icon}</div>
                    <div>
                      <div className="text-sm font-medium">
                        {dec.description}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(dec.date).toLocaleDateString('en-ZA')} —{' '}
                        {formatCurrency(dec.amount)}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      dec.recommendation === 'good'
                        ? 'badge-green'
                        : dec.recommendation === 'delay'
                        ? 'badge-yellow'
                        : dec.recommendation === 'reduce'
                        ? 'badge-yellow'
                        : 'badge-red'
                    }`}
                  >
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="card bg-[#1a2332] border-accent/20">
        <h4 className="text-sm font-medium mb-2">Investment Philosophy</h4>
        <p className="text-xs text-muted leading-relaxed">
          This system prioritises credit score optimisation over investment
          returns. In the South African context, credit card interest rates
          (18-22% p.a.) almost always exceed investment returns. Therefore, the
          system will recommend paying down debt before investing. Once your
          credit utilisation is optimal (below 9%) and all obligations are met,
          investment recommendations become more favourable.
        </p>
      </div>
    </div>
  );
}
