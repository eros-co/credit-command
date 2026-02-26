'use client';

import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  TrendingUp,
  Plus,
  Trash2,
  Info,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { getScoreColor, formatCurrency } from '@/lib/calculations';
import type { CreditScoreEntry } from '@/lib/types';

const BUREAUS = [
  { value: 'experian', label: 'Experian (0-740)', max: 740 },
  { value: 'transunion', label: 'TransUnion (0-999)', max: 999 },
  { value: 'xds', label: 'XDS (300-950)', max: 950 },
] as const;

export default function CreditScorePage() {
  const { creditScores, addCreditScore, deleteCreditScore, settings } =
    useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [score, setScore] = useState('');
  const [bureau, setBureau] = useState<CreditScoreEntry['bureau']>('experian');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scoreNum = parseInt(score);
    if (isNaN(scoreNum)) return;

    addCreditScore({
      id: uuidv4(),
      date,
      score: scoreNum,
      bureau,
      notes: notes || undefined,
    });

    setScore('');
    setNotes('');
    setShowForm(false);
  };

  const chartData = useMemo(
    () =>
      creditScores.map((s) => ({
        date: new Date(s.date).toLocaleDateString('en-ZA', {
          day: 'numeric',
          month: 'short',
        }),
        score: s.score,
        bureau: s.bureau,
      })),
    [creditScores]
  );

  const latestScore = creditScores.length > 0 ? creditScores[creditScores.length - 1] : null;
  const previousScore = creditScores.length > 1 ? creditScores[creditScores.length - 2] : null;
  const scoreChange = latestScore && previousScore ? latestScore.score - previousScore.score : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credit Score Tracker</h1>
          <p className="text-sm text-muted mt-1">
            Track your credit score across South African bureaus
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Score
        </button>
      </div>

      {/* Add Score Form */}
      {showForm && (
        <div className="card">
          <h3 className="text-sm font-medium mb-4">Record New Score</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Bureau</label>
              <select
                value={bureau}
                onChange={(e) =>
                  setBureau(e.target.value as CreditScoreEntry['bureau'])
                }
              >
                {BUREAUS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Score</label>
              <input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="e.g. 680"
                min={0}
                max={BUREAUS.find((b) => b.value === bureau)?.max || 999}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. After paying off balance"
              />
            </div>
            <div className="md:col-span-4 flex gap-3">
              <button type="submit" className="btn-primary">
                Save Score
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

      {/* Score Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card glow-blue">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Latest Score
          </div>
          <div
            className={`text-4xl font-bold ${
              latestScore ? getScoreColor(latestScore.score) : 'text-muted'
            }`}
          >
            {latestScore?.score || '—'}
          </div>
          <div className="text-xs text-muted mt-1">
            {latestScore
              ? `${latestScore.bureau.charAt(0).toUpperCase() + latestScore.bureau.slice(1)} • ${new Date(
                  latestScore.date
                ).toLocaleDateString('en-ZA')}`
              : 'No scores recorded'}
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Change
          </div>
          <div
            className={`text-4xl font-bold ${
              scoreChange > 0
                ? 'text-emerald-400'
                : scoreChange < 0
                ? 'text-red-400'
                : 'text-muted'
            }`}
          >
            {scoreChange > 0 ? '+' : ''}
            {creditScores.length >= 2 ? scoreChange : '—'}
          </div>
          <div className="text-xs text-muted mt-1">
            {scoreChange > 0
              ? 'Points gained since last entry'
              : scoreChange < 0
              ? 'Points lost since last entry'
              : 'Since last entry'}
          </div>
        </div>

        <div className="card">
          <div className="text-xs text-muted uppercase tracking-wider mb-2">
            Target Gap
          </div>
          <div
            className={`text-4xl font-bold ${
              latestScore && latestScore.score >= settings.targetScore
                ? 'text-emerald-400'
                : 'text-accent'
            }`}
          >
            {latestScore
              ? latestScore.score >= settings.targetScore
                ? 'Done!'
                : `${settings.targetScore - latestScore.score}`
              : '—'}
          </div>
          <div className="text-xs text-muted mt-1">
            Points to reach {settings.targetScore}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="text-sm font-medium text-muted mb-4">Score History</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis domain={['dataMin - 20', 'dataMax + 20']} stroke="#64748b" fontSize={12} />
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
                fill="url(#scoreGrad2)"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-muted text-sm">
            Add your first credit score to see the trend chart.
          </div>
        )}
      </div>

      {/* SA Bureau Info */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium">
            South African Credit Bureau Scoring
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-[#1a2332]">
            <h4 className="text-sm font-medium text-accent mb-2">Experian</h4>
            <p className="text-xs text-muted">
              Score range: 0 – 740. A score of 740 is the maximum and
              represents exceptional creditworthiness. Used by ClearScore.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#1a2332]">
            <h4 className="text-sm font-medium text-accent mb-2">TransUnion</h4>
            <p className="text-xs text-muted">
              Score range: 0 – 999. A score of 740 places you in the
              &apos;Good&apos; to &apos;Very Good&apos; category.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-[#1a2332]">
            <h4 className="text-sm font-medium text-accent mb-2">XDS</h4>
            <p className="text-xs text-muted">
              Score range: 300 – 950. A score of 740 is firmly in the
              &apos;Good&apos; to &apos;Very Good&apos; range.
            </p>
          </div>
        </div>
      </div>

      {/* Score History Table */}
      {creditScores.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-medium text-muted mb-4">
            Score History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border">
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Bureau
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Score
                  </th>
                  <th className="text-left py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Notes
                  </th>
                  <th className="text-right py-3 px-4 text-xs text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...creditScores].reverse().map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-card-border/50 hover:bg-white/[0.02]"
                  >
                    <td className="py-3 px-4">
                      {new Date(entry.date).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="py-3 px-4 capitalize">{entry.bureau}</td>
                    <td className={`py-3 px-4 font-medium ${getScoreColor(entry.score)}`}>
                      {entry.score}
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {entry.notes || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteCreditScore(entry.id)}
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
      )}
    </div>
  );
}
