'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Wallet,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  formatCurrency,
  getCategoryLabel,
  getCategoryColor,
} from '@/lib/calculations';
import type { Expense, TransactionCategory } from '@/lib/types';

const CATEGORIES: TransactionCategory[] = [
  'housing',
  'utilities',
  'groceries',
  'transport',
  'entertainment',
  'dining',
  'shopping',
  'health',
  'insurance',
  'subscriptions',
  'savings',
  'investments',
  'debt_payment',
  'other',
];

export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense, settings } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('other');
  const [frequency, setFrequency] = useState<Expense['frequency']>('monthly');
  const [isSub, setIsSub] = useState(false);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || !name) return;

    addExpense({
      id: uuidv4(),
      name,
      amount: amt,
      category,
      frequency,
      isSubscription: isSub,
      startDate: new Date().toISOString(),
      notes: notes || undefined,
    });

    setName('');
    setAmount('');
    setCategory('other');
    setFrequency('monthly');
    setIsSub(false);
    setNotes('');
    setShowForm(false);
  };

  const monthlyExpenses = expenses.filter((e) => e.frequency === 'monthly');
  const subscriptions = expenses.filter((e) => e.isSubscription);
  const totalMonthly = monthlyExpenses.reduce((s, e) => s + e.amount, 0);
  const totalSubs = subscriptions.reduce((s, e) => s + e.amount, 0);
  const incomeRatio = Math.round((totalMonthly / settings.monthlyIncome) * 100);

  // Generate insights
  const insights: { type: 'warning' | 'success' | 'tip'; text: string }[] = [];

  if (totalSubs > settings.monthlyIncome * 0.05) {
    insights.push({
      type: 'warning',
      text: `Subscription costs of ${formatCurrency(totalSubs)} represent ${Math.round(
        (totalSubs / settings.monthlyIncome) * 100
      )}% of your income. Review and cancel non-essential subscriptions.`,
    });
  }

  if (totalMonthly > settings.monthlyIncome * 0.7) {
    insights.push({
      type: 'warning',
      text: `Total monthly expenses of ${formatCurrency(totalMonthly)} are ${incomeRatio}% of your income. This leaves little room for savings and credit payments.`,
    });
  } else if (totalMonthly <= settings.monthlyIncome * 0.5) {
    insights.push({
      type: 'success',
      text: `Good discipline. Monthly expenses at ${incomeRatio}% of income leaves healthy room for savings and credit optimisation.`,
    });
  }

  // Check for expenses that could be moved to credit card
  const cashExpenses = expenses.filter(
    (e) =>
      e.frequency === 'monthly' &&
      !e.isSubscription &&
      e.amount < settings.creditLimit * 0.05
  );
  if (cashExpenses.length > 0) {
    insights.push({
      type: 'tip',
      text: `Consider paying ${cashExpenses.length} recurring expense(s) with your credit card and paying the full balance monthly — this builds payment history.`,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense & Subscription Manager</h1>
          <p className="text-sm text-muted mt-1">
            Track recurring expenses and get optimisation insights
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="card">
          <h3 className="text-sm font-medium mb-4">New Expense</h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-xs text-muted mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Netflix"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Amount (R)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min={0}
                step={0.01}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Category</label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TransactionCategory)
                }
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Frequency</label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as Expense['frequency'])
                }
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
                <option value="once">One-time</option>
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSub}
                  onChange={(e) => setIsSub(e.target.checked)}
                  className="!w-4 !h-4"
                />
                <span className="text-sm">Subscription</span>
              </label>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <div className="md:col-span-3 flex gap-3">
              <button type="submit" className="btn-primary">
                Save Expense
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Monthly Expenses
          </div>
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(totalMonthly)}
          </div>
          <div className="text-xs text-muted mt-1">{incomeRatio}% of income</div>
        </div>
        <div className="card">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Subscriptions
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {formatCurrency(totalSubs)}
          </div>
          <div className="text-xs text-muted mt-1">
            {subscriptions.length} active subscription(s)
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Remaining
          </div>
          <div
            className={`text-3xl font-bold ${
              settings.monthlyIncome - settings.monthlyRent - totalMonthly > 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {formatCurrency(
              settings.monthlyIncome - settings.monthlyRent - totalMonthly
            )}
          </div>
          <div className="text-xs text-muted mt-1">
            After rent and expenses
          </div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium mb-4">
            Expense Intelligence
          </h3>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-3">
                {insight.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                ) : insight.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                )}
                <p className="text-sm">{insight.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense List */}
      {expenses.length > 0 ? (
        <div className="card">
          <h3 className="text-sm font-medium text-muted mb-4">
            All Expenses
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Frequency
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-right py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-right py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="border-b border-card-border/50 hover:bg-white/[0.02]"
                  >
                    <td className="py-3 px-4 font-medium">{exp.name}</td>
                    <td className="py-3 px-4">
                      <span
                        className="badge text-xs"
                        style={{
                          background: `${getCategoryColor(exp.category)}20`,
                          color: getCategoryColor(exp.category),
                        }}
                      >
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted capitalize">
                      {exp.frequency}
                    </td>
                    <td className="py-3 px-4">
                      {exp.isSubscription ? (
                        <span className="badge badge-purple">Subscription</span>
                      ) : (
                        <span className="text-muted">Expense</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card text-center py-16">
          <Wallet className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Expenses Tracked</h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            Add your recurring expenses and subscriptions to get intelligent
            optimisation insights.
          </p>
        </div>
      )}
    </div>
  );
}
