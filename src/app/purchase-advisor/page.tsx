'use client';

import { useState, useMemo } from 'react';
import {
  ShoppingCart,
  CreditCard,
  Banknote,
  Clock,
  XCircle,
  Calendar,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  calculateFinancialSnapshot,
  formatCurrency,
  analyzePurchaseTimeline,
} from '@/lib/calculations';
import type { PurchaseDecision } from '@/lib/types';

const RECOMMENDATION_CONFIG: Record<
  PurchaseDecision['recommendation'],
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  buy_now: {
    label: 'Buy Now',
    icon: <Banknote className="w-5 h-5" />,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/30',
  },
  save_and_buy: {
    label: 'Save and Buy Later',
    icon: <Calendar className="w-5 h-5" />,
    color: 'text-accent',
    bgColor: 'bg-accent/10 border-accent/30',
  },
  delay: {
    label: 'Delay Purchase',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/30',
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

    const decision = analyzePurchaseTimeline(item, amt, snapshot, settings);
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
        <h1 className="text-2xl font-bold">Purchase & Timeline Advisor</h1>
        <p className="text-sm text-muted mt-1">
          Get a personalised savings plan and purchase timeline based on your FNB balances and credit goals
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
                placeholder="e.g. New iPhone, Solar Inverter, Laptop"
                required
                className="w-full"
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
                placeholder="e.g. 15000"
                min={0}
                step={0.01}
                required
                className="w-full"
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
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
                  {currentDecision.targetPurchaseDate && (
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                      <Calendar className="w-4 h-4 text-accent" />
                      <span className="text-sm font-medium">Target: {currentDecision.targetPurchaseDate}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm leading-relaxed mb-4">
                  {currentDecision.reasoning}
                </p>

                {/* Savings Plan Visualization */}
                {currentDecision.savingsPlan && currentDecision.savingsPlan.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                      <TrendingUp className="w-3 h-3 text-accent" />
                      Monthly Savings Plan
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {currentDecision.savingsPlan.map((plan, idx) => (
                        <div key={idx} className="bg-black/20 p-2 rounded border border-white/5 text-center">
                          <div className="text-[10px] text-muted uppercase">{plan.month}</div>
                          <div className="text-xs font-bold text-accent">{formatCurrency(plan.amount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Impact Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
                Credit Impact
              </h4>
              <p className="text-sm font-medium">{currentDecision.creditImpact}</p>
            </div>
            <div className="card">
              <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
                Utilisation Impact
              </h4>
              <p className="text-sm font-medium">{currentDecision.utilisationImpact}</p>
            </div>
            <div className="card">
              <h4 className="text-xs text-muted uppercase tracking-wider mb-2">
                Cash Flow Impact
              </h4>
              <p className="text-sm font-medium">{currentDecision.cashFlowImpact}</p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {purchaseDecisions.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-muted mb-4">
            Recent Analysis
          </h3>
          <div className="space-y-3">
            {purchaseDecisions.slice(0, 5).map((dec) => {
              const config = RECOMMENDATION_CONFIG[dec.recommendation];
              return (
                <div
                  key={dec.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#1a2332] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className={config.color}>{config.icon}</div>
                    <div>
                      <div className="text-sm font-medium">{dec.item}</div>
                      <div className="text-xs text-muted">
                        Target: {dec.targetPurchaseDate} — {formatCurrency(dec.amount)}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                    dec.recommendation === 'buy_now'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : dec.recommendation === 'save_and_buy'
                      ? 'bg-accent/20 text-accent'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Methodology Card */}
      <div className="card bg-accent/5 border-accent/20">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-accent shrink-0" />
          <div>
            <h4 className="text-sm font-medium mb-1">Our Recommendation Methodology</h4>
            <p className="text-xs text-muted leading-relaxed">
              We analyse your <strong>FNB Current, Credit, and Savings</strong> balances to determine liquidity. 
              Our algorithm prioritises maintaining an emergency fund (15% of cash) and calculates a 
              <strong> 30% Savings Rate</strong> from your monthly disposable income. 
              Recommendations are designed to reach your <strong>740 credit score goal</strong> by avoiding 
              high credit card utilisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
