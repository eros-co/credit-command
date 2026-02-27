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
  Zap,
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
  'bank_charges',
  'fuel',
  'mobile_data',
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

  if (totalSubs > settings.monthlyIncome * 0.08) {
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

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense & Subscription Command</h1>
          <p className="text-sm text-muted mt-1">
            Manage your recurring costs across all FNB accounts
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
        <div className="card border-accent/20 bg-accent/5">
          <h3 className="text-sm font-bold mb-4">New Recurring Expense</h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-xs text-muted mb-1 uppercase font-bold">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Netflix, Gym, Rent"
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 uppercase font-bold">Amount (R)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min={0}
                step={0.01}
                required
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 uppercase font-bold">Category</label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TransactionCategory)
                }
                className="w-full"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {getCategoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 uppercase font-bold">Frequency</label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as Expense['frequency'])
                }
                className="w-full"
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
                <option value="once">One-time</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer bg-black/20 px-3 py-2 rounded border border-white/5">
                <input
                  type="checkbox"
                  checked={isSub}
                  onChange={(e) => setIsSub(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs font-bold uppercase">Is Subscription</span>
              </label>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 uppercase font-bold">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes"
                className="w-full"
              />
            </div>
            <div className="md:col-span-3 flex gap-3 pt-2">
              <button type="submit" className="btn-primary px-6">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2 font-bold">
            Total Monthly Burn
          </div>
          <div className="text-3xl font-bold text-foreground">
            {formatCurrency(totalMonthly)}
          </div>
          <div className="text-xs text-muted mt-1">{incomeRatio}% of gross income</div>
        </div>
        <div className="card">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2 font-bold">
            Subscription Load
          </div>
          <div className="text-3xl font-bold text-purple-400">
            {formatCurrency(totalSubs)}
          </div>
          <div className="text-xs text-muted mt-1">
            {subscriptions.length} active subscription(s)
          </div>
        </div>
        <div className="card">
          <div className="text-[10px] text-muted uppercase tracking-wider mb-2 font-bold">
            Remaining Cash Flow
          </div>
          <div
            className={`text-3xl font-bold ${
              settings.monthlyIncome - totalMonthly > 0
                ? 'text-emerald-400'
                : 'text-red-400'
            }`}
          >
            {formatCurrency(settings.monthlyIncome - totalMonthly)}
          </div>
          <div className="text-xs text-muted mt-1">
            Monthly surplus for savings/investing
          </div>
        </div>
      </div>

      {/* Intelligence */}
      <div className="card bg-accent/5 border-accent/20">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-accent" />
          Expense Intelligence
        </h3>
        <div className="space-y-3">
          {insights.length > 0 ? insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 bg-black/20 p-3 rounded border border-white/5">
              {insight.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
              ) : insight.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              )}
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          )) : (
            <p className="text-xs text-muted">No specific insights yet. Add more expenses to get AI-powered advice.</p>
          )}
        </div>
      </div>

      {/* Expense List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-bold">Recurring Expense Registry</h3>
        </div>
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-white/5 text-muted uppercase tracking-wider">
                  <th className="px-4 py-3 font-bold">Name</th>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold">Frequency</th>
                  <th className="px-4 py-3 font-bold">Type</th>
                  <th className="px-4 py-3 font-bold text-right">Amount</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium">{exp.name}</td>
                    <td className="px-4 py-3">
                      <span 
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={{ backgroundColor: `${getCategoryColor(exp.category)}20`, color: getCategoryColor(exp.category) }}
                      >
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted">{exp.frequency}</td>
                    <td className="px-4 py-3">
                      {exp.isSubscription ? (
                        <span className="text-purple-400 font-bold uppercase text-[10px]">Subscription</span>
                      ) : (
                        <span className="text-muted text-[10px]">Standard</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => deleteExpense(exp.id)}
                        className="p-1.5 text-muted hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-muted italic">
            No expenses registered yet.
          </div>
        )}
      </div>
    </div>
  );
}
