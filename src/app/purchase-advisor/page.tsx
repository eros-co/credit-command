'use client';

import { useState, useMemo } from 'react';
import {
  ShoppingCart,
  CreditCard,
  Banknote,
  Clock,
  Split,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  calculateFinancialSnapshot,
  formatCurrency,
} from '@/lib/calculations';
import { generatePurchaseDecision } from '@/lib/ai-engine';
import type { PurchaseDecision } from '@/lib/types';

const RECOMMENDATION_CONFIG: Record<
  PurchaseDecision['recommendation'],
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  buy_credit: {
    label: 'Buy on Credit',
    icon: <CreditCard className="w-5 h-5" />,
    color: 'text-accent',
    bgColor: 'bg-accent/10 border-accent/30',
  },
  buy_cash: {
    label: 'Buy with Cash',
    icon: <Banknote className="w-5 h-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/30',
  },
  delay: {
    label: 'Delay Purchase',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/30',
  },
  split: {
    label: 'Split Payment',
    icon: <Split className="w-5 h-5" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10 border-purple-400/30',
  },
  avoid: {
    label: 'Avoid Purchase',
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/30',
  },
};

export default function PurchaseAdvisorPage() {
  const { settings, creditScores, transactions, expenses, purchaseDecisions, addPurchaseDecision } =
    useAppStore();

  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [currentDecision, setCurrentDecision] = useState<PurchaseDecision | null>(null);

  const snapshot = useMemo(
    () => calculateFinancialSnapshot(settings, creditScores, transactions, expenses),
    [settings, creditScores, transactions, expenses]
  );

  const handleAnalyse = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || !item) return;

    const decision = generatePurchaseDecision(item, amt, settings, snapshot);
    setCurrentDecision(decision);
    addPurchaseDecision(decision);
  };

  const handleClear = () => {
    setItem('');
    setAmount('');
    setCurrentDecision(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Purchase Decision Advisor</h1>
        <p className="text-sm text-muted mt-1">
          Get AI-powered advice on whether to buy, delay, or avoid a purchase
          based on your credit optimisation goals
        </p>
      </div>

      {/* Input Form */}
      <div className="card">
        <h3 className="text-sm font-medium mb-4">Analyse a Purchase</h3>
        <form onSubmit={handleAnalyse} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                What do you want to buy?
              </label>
              <input
                type="text"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Microwave, Laptop, Software subscription"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Cost (R)
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
            <button type="submit" className="btn-primary flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Analyse Purchase
            </button>
            {currentDecision && (
              <button type="button" onClick={handleClear} className="btn-secondary">
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Current Decision Result */}
      {currentDecision && (
        <div className="space-y-4">
          {/* Recommendation */}
          {(() => {
            const config = RECOMMENDATION_CONFIG[currentDecision.recommendation];
            return (
              <div className={`card border ${config.bgColor}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={config.color}>{config.icon}</div>
                  <div>
                    <div className={`text-lg font-bold ${config.color}`}>
                      {config.label}
                    </div>
                    <div className="text-xs text-muted">
                      {currentDecision.item} — {formatCurrency(currentDecision.amount)}
                    </div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed">
                  {currentDecision.reasoning}
                </p>
              </div>
            );
          })()}

          {/* Impact Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
                Credit Score Impact
              </h4>
              <p className="text-sm">{currentDecision.creditImpact}</p>
            </div>
            <div className="card">
              <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
                Utilisation Impact
              </h4>
              <p className="text-sm">{currentDecision.utilisationImpact}</p>
            </div>
            <div className="card">
              <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
                Cash Flow Impact
              </h4>
              <p className="text-sm">{currentDecision.cashFlowImpact}</p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {purchaseDecisions.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-muted mb-4">
            Decision History
          </h3>
          <div className="space-y-3">
            {purchaseDecisions.slice(0, 10).map((dec) => {
              const config = RECOMMENDATION_CONFIG[dec.recommendation];
              return (
                <div
                  key={dec.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#1a2332]"
                >
                  <div className="flex items-center gap-3">
                    <div className={config.color}>{config.icon}</div>
                    <div>
                      <div className="text-sm font-medium">{dec.item}</div>
                      <div className="text-xs text-muted">
                        {new Date(dec.date).toLocaleDateString('en-ZA')} —{' '}
                        {formatCurrency(dec.amount)}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${
                    dec.recommendation === 'buy_credit' || dec.recommendation === 'buy_cash'
                      ? 'badge-green'
                      : dec.recommendation === 'delay' || dec.recommendation === 'split'
                      ? 'badge-yellow'
                      : 'badge-red'
                  }`}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Context Card */}
      <div className="card bg-[#1a2332] border-accent/20">
        <h4 className="text-sm font-medium mb-2">How This Works</h4>
        <p className="text-xs text-muted leading-relaxed">
          The Purchase Decision Advisor analyses your planned purchase against
          your current credit utilisation, income, disposable income, and credit
          score goals. It considers the impact on your FNB credit card
          utilisation ratio and overall financial trajectory toward your target
          score of {settings.targetScore}. All recommendations prioritise your
          credit score optimisation above all else.
        </p>
      </div>
    </div>
  );
}
