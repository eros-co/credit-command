'use client';

import { useState, useRef, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { ParsedStatement, ParsedTransaction } from '@/lib/fnb-parser';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining':          '#f97316',
  'Groceries':              '#22c55e',
  'Transport':              '#3b82f6',
  'Subscriptions':          '#a855f7',
  'Travel & Accommodation': '#06b6d4',
  'Fuel':                   '#eab308',
  'Investments & Trading':  '#10b981',
  'Loan Repayments':        '#ef4444',
  'Transfers':              '#6366f1',
  'Payments':               '#14b8a6',
  'Cash':                   '#f59e0b',
  'Online Payments':        '#8b5cf6',
  'Mobile & Data':          '#ec4899',
  'Work / Vodacom':         '#64748b',
  'Bank Charges':           '#dc2626',
  'Income':                 '#16a34a',
  'Other':                  '#94a3b8',
};

const fmt = (n: number) =>
  'R\u00a0' + Math.abs(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface UploadedStatement {
  id: string;
  fileName: string;
  parsed: ParsedStatement;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StatementsPage() {
  const [statements, setStatements] = useState<UploadedStatement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterType, setFilterType] = useState<'all' | 'debit' | 'credit'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (fileArray.length === 0) { setError('Please upload PDF files only.'); return; }
    setError(null);
    setUploading(true);

    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/parse-statement', { method: 'POST', body: formData });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(`Failed to parse ${file.name}: ${json.error ?? 'Unknown error'}`);
          continue;
        }
        const stmt: UploadedStatement = {
          id: crypto.randomUUID(),
          fileName: file.name,
          parsed: json.data as ParsedStatement,
        };
        setStatements(prev => [...prev, stmt]);
        setSelected(stmt.id);
      } catch (err) {
        setError(`Error processing ${file.name}: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }
    setUploading(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const current = statements.find(s => s.id === selected);
  const parsed = current?.parsed;

  const filteredTx: ParsedTransaction[] = (parsed?.transactions ?? []).filter(tx => {
    if (filterType === 'debit' && tx.type !== 'debit') return false;
    if (filterType === 'credit' && tx.type !== 'credit') return false;
    if (filterCategory !== 'All' && tx.category !== filterCategory) return false;
    if (searchQuery && !tx.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const categoryTotals: Record<string, number> = {};
  (parsed?.transactions ?? []).filter(t => t.amount > 0).forEach(tx => {
    categoryTotals[tx.category] = (categoryTotals[tx.category] ?? 0) + tx.amount;
  });
  const categoryData = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const dailyTotals: Record<string, number> = {};
  (parsed?.transactions ?? []).filter(t => t.amount > 0 && t.date).forEach(tx => {
    const day = tx.date.slice(0, 10);
    dailyTotals[day] = (dailyTotals[day] ?? 0) + tx.amount;
  });
  const dailyData = Object.entries(dailyTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date: date.slice(5), amount: parseFloat(amount.toFixed(2)) }));

  const allCategories = ['All', ...Array.from(new Set((parsed?.transactions ?? []).map(t => t.category))).sort()];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Bank Statements</h1>
          <p className="text-slate-400 text-sm mt-1">Upload your FNB Private Wealth PDF statements for automatic analysis</p>
        </div>
        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
          + Upload PDF
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-blue-500 bg-blue-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'}`}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => { if (e.target.files) handleFiles(e.target.files); }} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-300">Parsing PDF statement…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="text-4xl">📄</div>
            <div>
              <p className="text-white font-medium">Drop FNB PDF statements here or click to browse</p>
              <p className="text-slate-400 text-sm mt-1">Supports: FNB Private Wealth Current Account &amp; Credit Card PDFs</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">⚠ {error}</div>
      )}

      {/* Statement tabs */}
      {statements.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {statements.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selected === s.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {s.parsed.statementType === 'credit_card' ? '💳' : '🏦'}{' '}
              {s.parsed.statementType === 'credit_card' ? 'Credit Card' : 'Current Acc'}{' '}
              #{s.parsed.statementNumber}{' '}
              <span className="text-xs opacity-70">{(s.parsed.periodEnd || s.parsed.statementDate).slice(0, 7)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Analysis */}
      {parsed && (
        <>
          {/* Statement meta */}
          <div className="bg-slate-800/50 rounded-xl p-4 text-sm text-slate-300 flex flex-wrap gap-6">
            <div><span className="text-slate-500">Account:</span> <span className="text-white font-mono">{parsed.accountNumber}</span></div>
            <div><span className="text-slate-500">Statement:</span> <span className="text-white">#{parsed.statementNumber}</span></div>
            <div><span className="text-slate-500">Date:</span> <span className="text-white">{parsed.statementDate}</span></div>
            {parsed.periodStart && <div><span className="text-slate-500">Period:</span> <span className="text-white">{parsed.periodStart} → {parsed.periodEnd}</span></div>}
            <div><span className="text-slate-500">Type:</span> <span className="text-white capitalize">{parsed.statementType.replace('_', ' ')}</span></div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SCard label="Total Spent" value={fmt(parsed.totalDebits)} color="text-red-400" />
            <SCard label="Total Received" value={fmt(parsed.totalCredits)} color="text-green-400" />
            <SCard label="Opening Balance" value={fmt(parsed.openingBalance)} color={parsed.openingBalance < 0 ? 'text-red-400' : 'text-white'} />
            <SCard label="Closing Balance" value={fmt(parsed.closingBalance)} color={parsed.closingBalance < 0 ? 'text-red-400' : 'text-green-400'} />
          </div>

          {parsed.statementType === 'credit_card' && parsed.creditLimit && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SCard label="Credit Limit" value={fmt(parsed.creditLimit)} color="text-blue-400" />
              <SCard label="Available Balance" value={fmt(parsed.availableBalance ?? 0)} color="text-green-400" />
              <SCard
                label="Utilisation"
                value={`${((parsed.closingBalance / parsed.creditLimit) * 100).toFixed(1)}%`}
                color={parsed.closingBalance / parsed.creditLimit > 0.3 ? 'text-orange-400' : 'text-green-400'}
              />
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {categoryData.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">Spending by Category</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                      {categoryData.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.name] ?? '#94a3b8'} />)}
                    </Pie>
                    <Tooltip formatter={(v: number | undefined) => fmt(v ?? 0)} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {dailyData.length > 0 && (
              <div className="bg-slate-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">Daily Spending</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickFormatter={(v: number) => `R${v}`} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} formatter={(v: number | undefined) => [fmt(v ?? 0), 'Spent']} />
                    <Bar dataKey="amount" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Category grid */}
          {categoryData.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Category Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryData.map(cat => (
                  <div key={cat.name} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[cat.name] ?? '#94a3b8' }} />
                      <span className="text-slate-300 text-xs truncate">{cat.name}</span>
                    </div>
                    <p className="text-white font-semibold text-sm">{fmt(cat.value)}</p>
                    <p className="text-slate-500 text-xs">{((cat.value / parsed.totalDebits) * 100).toFixed(1)}% of spending</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions table */}
          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <h3 className="text-white font-semibold">Transactions ({filteredTx.length} of {parsed.transactions.length})</h3>
              <div className="flex gap-2 flex-wrap">
                <input type="text" placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-blue-500 w-40" />
                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-slate-700 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-600 focus:outline-none focus:border-blue-500">
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex rounded-lg overflow-hidden border border-slate-600">
                  {(['all', 'debit', 'credit'] as const).map(t => (
                    <button key={t} onClick={() => setFilterType(t)} className={`px-3 py-1.5 text-sm capitalize transition-colors ${filterType === t ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4 font-medium">Date</th>
                    <th className="text-left py-2 pr-4 font-medium">Description</th>
                    <th className="text-left py-2 pr-4 font-medium">Category</th>
                    <th className="text-right py-2 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-500">No transactions match your filters.</td></tr>
                  ) : filteredTx.map((tx, i) => (
                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                      <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">{tx.date ? tx.date.slice(0, 10) : '—'}</td>
                      <td className="py-2.5 pr-4 text-white max-w-xs"><span className="truncate block">{tx.description || tx.rawDescription}</span></td>
                      <td className="py-2.5 pr-4">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: (CATEGORY_COLORS[tx.category] ?? '#94a3b8') + '22', color: CATEGORY_COLORS[tx.category] ?? '#94a3b8', border: `1px solid ${(CATEGORY_COLORS[tx.category] ?? '#94a3b8')}44` }}>
                          {tx.category}
                        </span>
                      </td>
                      <td className={`py-2.5 text-right font-medium whitespace-nowrap ${tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {statements.length === 0 && !uploading && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-lg font-medium text-slate-400">No statements uploaded yet</p>
          <p className="text-sm mt-2">Upload your FNB Private Wealth PDF statements to get started</p>
        </div>
      )}
    </div>
  );
}

function SCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
