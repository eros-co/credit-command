'use client';

import { useState, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  FileText,
  Upload,
  Trash2,
  Filter,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import {
  categoriseTransaction,
  formatCurrency,
  getCategoryLabel,
  getCategoryColor,
} from '@/lib/calculations';
import type { Transaction, TransactionCategory } from '@/lib/types';

export default function StatementsPage() {
  const { transactions, addTransactions, clearTransactions } = useAppStore();
  const [manualMode, setManualMode] = useState(false);
  const [manualDate, setManualDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [manualDesc, setManualDesc] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState<'debit' | 'credit'>('debit');
  const [manualSource, setManualSource] = useState<'bank' | 'credit_card'>(
    'credit_card'
  );
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleCSVUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());
        const newTransactions: Transaction[] = [];

        // Skip header row
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
          if (cols.length < 3) continue;

          const date = cols[0];
          const description = cols[1];
          const amount = Math.abs(parseFloat(cols[2]));
          if (isNaN(amount)) continue;

          const isDebit = parseFloat(cols[2]) < 0 || cols[3]?.toLowerCase() === 'debit';
          const category = categoriseTransaction(description);

          newTransactions.push({
            id: uuidv4(),
            date,
            description,
            amount,
            category,
            type: isDebit ? 'debit' : 'credit',
            source: 'credit_card',
            isSubscription: false,
          });
        }

        if (newTransactions.length > 0) {
          addTransactions(newTransactions);
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [addTransactions]
  );

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(manualAmount);
    if (isNaN(amount) || !manualDesc) return;

    const category = categoriseTransaction(manualDesc);
    addTransactions([
      {
        id: uuidv4(),
        date: manualDate,
        description: manualDesc,
        amount,
        category,
        type: manualType,
        source: manualSource,
        isSubscription: false,
      },
    ]);

    setManualDesc('');
    setManualAmount('');
  };

  // Analysis
  const debitTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'debit'),
    [transactions]
  );

  const categoryBreakdown = useMemo(() => {
    const map = new Map<TransactionCategory, number>();
    debitTransactions.forEach((t) => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({
        name: getCategoryLabel(category),
        value: amount,
        color: getCategoryColor(category),
        category,
      }))
      .sort((a, b) => b.value - a.value);
  }, [debitTransactions]);

  const totalSpending = debitTransactions.reduce((s, t) => s + t.amount, 0);

  const filteredTransactions = useMemo(
    () =>
      filterCategory === 'all'
        ? transactions
        : transactions.filter((t) => t.category === filterCategory),
    [transactions, filterCategory]
  );

  const categories = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.category))),
    [transactions]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statement Analysis</h1>
          <p className="text-sm text-muted mt-1">
            Upload statements or add transactions manually for analysis
          </p>
        </div>
        <div className="flex gap-3">
          <label className="btn-primary flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setManualMode(!manualMode)}
            className="btn-secondary"
          >
            {manualMode ? 'Hide Form' : 'Add Manual'}
          </button>
          {transactions.length > 0 && (
            <button onClick={clearTransactions} className="btn-danger">
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* CSV Format Info */}
      <div className="card bg-[#1a2332] border-accent/20">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-accent mt-0.5 shrink-0" />
          <div>
            <h4 className="text-sm font-medium mb-1">CSV Format</h4>
            <p className="text-xs text-muted">
              Upload a CSV file with columns: <code className="text-accent">Date, Description, Amount</code>.
              Negative amounts are treated as debits. You can also add an optional 4th column for type (debit/credit).
            </p>
          </div>
        </div>
      </div>

      {/* Manual Entry */}
      {manualMode && (
        <div className="card">
          <h3 className="text-sm font-medium mb-4">Add Transaction</h3>
          <form
            onSubmit={handleManualAdd}
            className="grid grid-cols-1 md:grid-cols-6 gap-4"
          >
            <div>
              <label className="block text-xs text-muted mb-1">Date</label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-muted mb-1">
                Description
              </label>
              <input
                type="text"
                value={manualDesc}
                onChange={(e) => setManualDesc(e.target.value)}
                placeholder="e.g. Woolworths Food"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Amount (R)</label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0"
                min={0}
                step={0.01}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Type</label>
              <select
                value={manualType}
                onChange={(e) =>
                  setManualType(e.target.value as 'debit' | 'credit')
                }
              >
                <option value="debit">Debit (Expense)</option>
                <option value="credit">Credit (Income)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Source</label>
              <select
                value={manualSource}
                onChange={(e) =>
                  setManualSource(e.target.value as 'bank' | 'credit_card')
                }
              >
                <option value="credit_card">Credit Card</option>
                <option value="bank">Bank Account</option>
              </select>
            </div>
            <div className="md:col-span-6">
              <button type="submit" className="btn-primary">
                Add Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Analysis */}
      {transactions.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">
                Total Transactions
              </div>
              <div className="text-3xl font-bold text-foreground">
                {transactions.length}
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">
                Total Spending
              </div>
              <div className="text-3xl font-bold text-red-400">
                {formatCurrency(totalSpending)}
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">
                Categories
              </div>
              <div className="text-3xl font-bold text-accent">
                {categoryBreakdown.length}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-medium">Spending by Category</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: '#1a2332',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryBreakdown.slice(0, 8).map((cat) => (
                  <div key={cat.category} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: cat.color }}
                    />
                    <span className="text-muted truncate">{cat.name}</span>
                    <span className="text-foreground ml-auto">
                      {formatCurrency(cat.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar Chart */}
            <div className="card">
              <h3 className="text-sm font-medium text-muted mb-4">
                Top Spending Categories
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={categoryBreakdown.slice(0, 8)}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#64748b"
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{
                      background: '#1a2332',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      color: '#e2e8f0',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {categoryBreakdown.slice(0, 8).map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transaction List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Transactions</h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="!w-auto text-xs"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {getCategoryLabel(cat)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-card-border">
                    <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                      Category
                    </th>
                    <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                      Source
                    </th>
                    <th className="text-right py-3 px-4 text-xs text-muted uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-b border-card-border/50 hover:bg-white/[0.02]"
                    >
                      <td className="py-2.5 px-4 text-muted">
                        {new Date(txn.date).toLocaleDateString('en-ZA')}
                      </td>
                      <td className="py-2.5 px-4">{txn.description}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className="badge text-xs"
                          style={{
                            background: `${getCategoryColor(txn.category)}20`,
                            color: getCategoryColor(txn.category),
                          }}
                        >
                          {getCategoryLabel(txn.category)}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-muted capitalize">
                        {txn.source.replace('_', ' ')}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-medium ${
                          txn.type === 'debit'
                            ? 'text-red-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {txn.type === 'debit' ? '-' : '+'}
                        {formatCurrency(txn.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {transactions.length === 0 && (
        <div className="card text-center py-16">
          <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            Upload a CSV bank or credit card statement, or add transactions
            manually to begin analysis.
          </p>
        </div>
      )}
    </div>
  );
}
