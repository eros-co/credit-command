'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { syncStatementToStore } from '@/lib/sync-utils';
import { formatCurrency, getCategoryColor, getCategoryLabel } from '@/lib/calculations';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';

interface UploadedStatement {
  id: string;
  fileName: string;
  status: 'processing' | 'completed' | 'error';
  taskId?: string;
  parsed?: any;
  error?: string;
  uploadedAt: number;
}

const STORAGE_KEY = 'credit-command-statements';

// Utility to strip Markdown code fences from JSON strings
function stripMarkdownFences(text: string): string {
  // Remove markdown code fences (```json ... ``` or ``` ... ```)
  return text
    .replace(/^```(?:json)?\s*\n?/gm, '')
    .replace(/\n?```\s*$/gm, '')
    .trim();
}

export default function StatementsPage() {
  const [statements, setStatements] = useState<UploadedStatement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as UploadedStatement[];
        setStatements(parsed);
        if (parsed.length > 0) setSelected(parsed[0].id);

        parsed.forEach(stmt => {
          if (stmt.status === 'processing' && stmt.taskId) {
            startPolling(stmt.id, stmt.taskId);
          }
        });
      } catch (e) { console.error(e); }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statements));
  }, [statements]);

  const startPolling = useCallback((stmtId: string, taskId: string) => {
    if (pollingRef.current.has(stmtId)) return;

    const interval = setInterval(async () => {
      try {
        // Check our webhook result store first
        const resultRes = await fetch(`/api/statement-results?taskId=${taskId}`);
        if (resultRes.ok) {
          const resultData = await resultRes.json();
          if (resultData.result) {
            handleCompletion(stmtId, resultData.result);
            clearInterval(interval);
            pollingRef.current.delete(stmtId);
            return;
          }
        }

        // Fallback to direct task status check
        const res = await fetch(`/api/manus-task-status?taskId=${taskId}`);
        const data = await res.json();

        if (data.status === 'completed' || data.status === 'success') {
          try {
            let resultData = data.result;

            // If result is a string, strip markdown fences and parse
            if (typeof resultData === 'string') {
              const cleanedJson = stripMarkdownFences(resultData);
              resultData = JSON.parse(cleanedJson);
            }

            handleCompletion(stmtId, resultData);
            clearInterval(interval);
            pollingRef.current.delete(stmtId);
          } catch (parseErr) {
            console.error(`[Statements] JSON parse error for task ${taskId}:`, parseErr);
            console.error(`[Statements] Raw result:`, data.result);
            handleError(stmtId, `Failed to parse statement data: ${parseErr instanceof Error ? parseErr.message : 'Unknown error'}`);
            clearInterval(interval);
            pollingRef.current.delete(stmtId);
          }
        } else if (data.status === 'failed' || data.status === 'error') {
          handleError(stmtId, data.error || 'Processing failed');
          clearInterval(interval);
          pollingRef.current.delete(stmtId);
        }
      } catch (err) {
        console.error(`[Statements] Polling error for task ${taskId}:`, err);
      }
    }, 5000);

    pollingRef.current.set(stmtId, interval);
  }, []);

  const handleCompletion = async (stmtId: string, parsed: any) => {
    setStatements(prev => prev.map(s => s.id === stmtId ? { ...s, status: 'completed', parsed } : s));
    syncStatementToStore(parsed);

    // Automatically generate AI insights
    try {
      const store = useAppStore.getState();
      const currentMonth = new Date().toISOString().slice(0, 7);

      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          settings: store.settings,
          snapshot: { /* simplified snapshot or we can omit it since Manus has raw data */
            ...store.settings,
            currentScore: store.creditScores.length > 0 ? store.creditScores[store.creditScores.length - 1].score : store.settings.targetScore - 100
          },
          creditScores: store.creditScores,
          transactions: store.transactions,
          expenses: store.expenses
        }),
      });

      const data = await res.json();
      if (data.success && data.taskId) {
        const taskId = data.taskId;
        // Background poll for the AI report task
        const reportInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/manus-task-status?taskId=${taskId}`);
            const statusData = await statusRes.json();

            if (statusData.status === 'completed' || statusData.status === 'success') {
              clearInterval(reportInterval);
              let resultData = statusData.result;
              if (typeof resultData === 'string') {
                const cleaned = resultData.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
                resultData = JSON.parse(cleaned);
              }
              if (!resultData.id) resultData.id = crypto.randomUUID();
              if (!resultData.month) resultData.month = currentMonth;

              store.addMonthlyReport(resultData);
            } else if (statusData.status === 'failed' || statusData.status === 'error') {
              clearInterval(reportInterval);
            }
          } catch (e) { }
        }, 5000);
      }
    } catch (err) {
      console.error('Failed to trigger background AI report generation', err);
    }
  };

  const handleError = (stmtId: string, error: string) => {
    setStatements(prev => prev.map(s => s.id === stmtId ? { ...s, status: 'error', error } : s));
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (fileArray.length === 0) return;
    setUploading(true);

    for (const file of fileArray) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/parse-statement', { method: 'POST', body: formData });
        const json = await res.json();

        const stmtId = crypto.randomUUID();
        const stmt: UploadedStatement = {
          id: stmtId,
          fileName: file.name,
          status: json.success ? 'processing' : 'error',
          taskId: json.taskId,
          error: json.success ? undefined : json.error,
          uploadedAt: Date.now(),
        };

        setStatements(prev => [stmt, ...prev]);
        setSelected(stmtId);
        if (json.success && json.taskId) startPolling(stmtId, json.taskId);
      } catch (err) { console.error(err); }
    }
    setUploading(false);
  };

  const deleteStatement = (id: string) => {
    setStatements(prev => prev.filter(s => s.id !== id));
    if (selected === id) setSelected(null);
  };

  const current = statements.find(s => s.id === selected);
  const parsed = current?.parsed;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">FNB Statement Command</h1>
          <p className="text-sm text-muted mt-1">Upload Current, Credit, or Savings PDFs for multi-account analysis</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary flex items-center gap-2"
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Upload Statements
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={e => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          accept=".pdf"
          multiple
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: List of Statements */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted px-1">Uploaded Statements</h3>
          {statements.length === 0 ? (
            <div className="card text-center py-10 border-dashed">
              <FileText className="w-8 h-8 text-muted mx-auto mb-2 opacity-20" />
              <p className="text-xs text-muted">No statements uploaded yet</p>
            </div>
          ) : (
            statements.map(stmt => (
              <div
                key={stmt.id}
                onClick={() => setSelected(stmt.id)}
                className={`card p-3 cursor-pointer transition-all border ${selected === stmt.id ? 'border-accent bg-accent/5' : 'border-white/5 hover:border-white/10'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {stmt.status === 'completed' ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> :
                      stmt.status === 'processing' ? <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" /> :
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    <span className="text-xs font-medium truncate">{stmt.fileName}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteStatement(stmt.id); }} className="text-muted hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[10px] text-muted mt-1">
                  {new Date(stmt.uploadedAt).toLocaleDateString()} • {stmt.status.toUpperCase()}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Main: Statement Analysis */}
        <div className="lg:col-span-3 space-y-6">
          {!current ? (
            <div className="card h-64 flex flex-col items-center justify-center text-muted border-dashed">
              <Upload className="w-10 h-10 mb-4 opacity-10" />
              <p className="text-sm">Select or upload a statement to view analysis</p>
            </div>
          ) : current.status === 'processing' ? (
            <div className="card h-64 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
              <div className="text-center">
                <h3 className="font-bold">AI Parsing in Progress...</h3>
                <p className="text-sm text-muted">Manus is extracting transactions from your FNB PDF</p>
              </div>
            </div>
          ) : current.status === 'error' ? (
            <div className="card h-64 flex flex-col items-center justify-center border-red-500/20 bg-red-500/5">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <h3 className="font-bold">Parsing Failed</h3>
              <p className="text-sm text-muted mt-1">{current.error || 'An unexpected error occurred'}</p>
              <button onClick={() => deleteStatement(current.id)} className="btn-secondary mt-6">Dismiss</button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Account Type</div>
                  <div className="text-sm font-bold capitalize">{parsed.statementType.replace('_', ' ')}</div>
                </div>
                <div className="card p-4">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Closing Balance</div>
                  <div className={`text-sm font-bold ${parsed.closingBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(parsed.closingBalance)}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Total Debits</div>
                  <div className="text-sm font-bold text-accent">{formatCurrency(parsed.totalDebits)}</div>
                </div>
                <div className="card p-4">
                  <div className="text-[10px] text-muted uppercase tracking-wider mb-1">Total Credits</div>
                  <div className="text-sm font-bold text-emerald-400">{formatCurrency(parsed.totalCredits)}</div>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Transaction History</h3>
                  <span className="text-xs text-muted">{parsed.transactions.length} items</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-white/5 text-muted uppercase tracking-wider">
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">Description</th>
                        <th className="px-4 py-3 font-medium">Category</th>
                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsed.transactions.map((tx: any, i: number) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-muted">{tx.date}</td>
                          <td className="px-4 py-3 font-medium truncate max-w-[200px]">{tx.description}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px]">
                              {tx.category}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-bold ${tx.type === 'debit' ? 'text-accent' : 'text-emerald-400'}`}>
                            {tx.type === 'debit' ? '-' : '+'}{formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
