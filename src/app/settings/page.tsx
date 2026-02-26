'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Configure your financial profile and system preferences
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
              <label className="block text-xs text-muted mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Income & Expenses */}
        <div className="card">
          <h3 className="text-sm font-medium mb-4">Income & Fixed Expenses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                Monthly Income (R)
              </label>
              <input
                type="number"
                value={form.monthlyIncome}
                onChange={(e) =>
                  setForm({ ...form, monthlyIncome: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
              <p className="text-xs text-muted mt-1">
                Your gross monthly income before deductions
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Monthly Rent (R)
              </label>
              <input
                type="number"
                value={form.monthlyRent}
                onChange={(e) =>
                  setForm({ ...form, monthlyRent: parseInt(e.target.value) || 0 })
                }
                min={0}
              />
              <p className="text-xs text-muted mt-1">
                Your monthly rental or bond payment
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[#1a2332] text-sm">
            <span className="text-muted">Disposable Income: </span>
            <span className="text-emerald-400 font-medium">
              {formatCurrency(disposableIncome)}
            </span>
            <span className="text-muted"> / month</span>
          </div>
        </div>

        {/* Credit Card */}
        <div className="card">
          <h3 className="text-sm font-medium mb-4">FNB Credit Card</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                Current Balance (R)
              </label>
              <input
                type="number"
                value={form.creditCardBalance}
                onChange={(e) =>
                  setForm({
                    ...form,
                    creditCardBalance: parseInt(e.target.value) || 0,
                  })
                }
                min={0}
              />
            </div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-[#1a2332] text-sm space-y-1">
            <div>
              <span className="text-muted">Utilisation: </span>
              <span
                className={`font-medium ${
                  form.creditLimit > 0
                    ? Math.round((form.creditCardBalance / form.creditLimit) * 100) <= 9
                      ? 'text-emerald-400'
                      : Math.round((form.creditCardBalance / form.creditLimit) * 100) <= 30
                      ? 'text-yellow-400'
                      : 'text-red-400'
                    : 'text-muted'
                }`}
              >
                {form.creditLimit > 0
                  ? `${Math.round((form.creditCardBalance / form.creditLimit) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <div>
              <span className="text-muted">Debt-to-Income: </span>
              <span
                className={`font-medium ${
                  debtToIncomeRatio <= 30
                    ? 'text-emerald-400'
                    : debtToIncomeRatio <= 50
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {debtToIncomeRatio}%
              </span>
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="card">
          <h3 className="text-sm font-medium mb-4">Credit Goals</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
