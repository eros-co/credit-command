'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, PiggyBank, Wallet, CreditCard as CreditCardIcon } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/calculations';

export default function SettingsPage() {
  const { settings, updateSettings } = useAppStore();
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setForm(settings);
  };

  const disposableIncome = form.monthlyIncome - form.monthlyRent;
  const debtToIncomeRatio = form.creditCardBalance > 0
    ? Math.round((form.creditCardBalance / form.monthlyIncome) * 100)
    : 0;

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Financial Profile</h1>
        <p className="text-sm text-muted mt-1">
          Configure your FNB account balances and credit goals for accurate AI advice
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal */}
        <div className="card">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-accent" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Display Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Account Balances */}
        <div className="card">
          <h3 className="text-sm font-medium mb-4">FNB Account Balances</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1 flex items-center gap-1">
                <Wallet className="w-3 h-3" /> Current/Debit (R)
              </label>
              <input
                type="number"
                value={form.debitBalance}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setForm({ ...form, debitBalance: isNaN(val) ? 0 : val });
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 flex items-center gap-1">
                <PiggyBank className="w-3 h-3" /> Savings Account (R)
              </label>
              <input
                type="number"
                value={form.savingsBalance}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setForm({ ...form, savingsBalance: isNaN(val) ? 0 : val });
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 flex items-center gap-1">
                <CreditCardIcon className="w-3 h-3" /> Credit Card Balance (R)
              </label>
              <input
                type="number"
                value={form.creditCardBalance}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setForm({ ...form, creditCardBalance: isNaN(val) ? 0 : val });
                }}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/10 text-sm">
            <span className="text-muted">Total Liquidity: </span>
            <span className="text-emerald-400 font-bold">
              {formatCurrency(form.debitBalance + form.savingsBalance)}
            </span>
          </div>
        </div>

        {/* Income & Expenses */}
        <div className="card">
          <h3 className="text-sm font-medium mb-4">Monthly Income & Rent</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                Monthly Gross Income (R)
              </label>
              <input
                type="number"
                value={form.monthlyIncome}
                onChange={(e) =>
                  setForm({ ...form, monthlyIncome: parseInt(e.target.value) || 0 })
                }
                min={0}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Monthly Rent/Bond (R)
              </label>
              <input
                type="number"
                value={form.monthlyRent}
                onChange={(e) =>
                  setForm({ ...form, monthlyRent: parseInt(e.target.value) || 0 })
                }
                min={0}
                className="w-full"
              />
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[#1a2332] text-sm flex justify-between">
            <div>
              <span className="text-muted">Disposable: </span>
              <span className="text-emerald-400 font-medium">
                {formatCurrency(disposableIncome)}
              </span>
            </div>
            <div>
              <span className="text-muted">DTI Ratio: </span>
              <span className={`font-medium ${debtToIncomeRatio <= 36 ? 'text-emerald-400' : 'text-red-400'}`}>
                {debtToIncomeRatio}%
              </span>
            </div>
          </div>
        </div>

        {/* Credit Limits & Goals */}
        <div className="card">
          <h3 className="text-sm font-medium mb-4">Credit Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                Credit Limit (R)
              </label>
              <input
                type="number"
                value={form.creditLimit}
                onChange={(e) =>
                  setForm({ ...form, creditLimit: parseInt(e.target.value) || 0 })
                }
                min={0}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Target Credit Score
              </label>
              <input
                type="number"
                value={form.targetScore}
                onChange={(e) =>
                  setForm({ ...form, targetScore: parseInt(e.target.value) || 740 })
                }
                min={300}
                max={999}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Target Date
              </label>
              <input
                type="date"
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saved ? 'Saved Successfully!' : 'Save Financial Profile'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset Changes
          </button>
        </div>
      </form>
    </div>
  );
}
