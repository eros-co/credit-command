'use client';

import { useState, useMemo } from 'react';
import {
  Brain,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Shield,
  Zap,
  Target,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import {
  calculateFinancialSnapshot,
  formatCurrency,
  getScoreColor,
} from '@/lib/calculations';
import type { MonthlyReport } from '@/lib/types';

export default function AIReportPage() {
  const {
    settings,
    creditScores,
    transactions,
    expenses,
    monthlyReports,
    addMonthlyReport,
  } = useAppStore();

  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(
    null
  );

  const snapshot = useMemo(
    () =>
      calculateFinancialSnapshot(settings, creditScores, transactions, expenses),
    [settings, creditScores, transactions, expenses]
  );

  const currentMonth = new Date().toISOString().slice(0, 7);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: currentMonth,
          settings,
          snapshot,
          creditScores,
          transactions,
          expenses
        }),
      });

      const data = await res.json();
      if (!data.success) {
        console.error('Failed to start report generation:', data.error);
        setGenerating(false);
        return;
      }

      const taskId = data.taskId;
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/manus-task-status?taskId=${taskId}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'completed' || statusData.status === 'success') {
            clearInterval(interval);
            let resultData = statusData.result;

            if (typeof resultData === 'string') {
              const cleaned = resultData.replace(/^```(?:json)?\s*\n?/gm, '').replace(/\n?```\s*$/gm, '').trim();
              resultData = JSON.parse(cleaned);
            }

            // Ensure necessary fields are present
            if (!resultData.id) resultData.id = crypto.randomUUID();
            if (!resultData.month) resultData.month = currentMonth;

            addMonthlyReport(resultData);
            setSelectedReport(resultData);
            setGenerating(false);
          } else if (statusData.status === 'failed' || statusData.status === 'error') {
            clearInterval(interval);
            console.error('Report task failed:', statusData.error || statusData);
            setGenerating(false);
          }
        } catch (err) {
          console.error('Error polling status:', err);
        }
      }, 5000);

    } catch (err) {
      console.error('Error initiating report request:', err);
      setGenerating(false);
    }
  };

  const activeReport = selectedReport || (monthlyReports.length > 0 ? monthlyReports[0] : null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Financial Advisor Report</h1>
          <p className="text-sm text-muted mt-1">
            Comprehensive monthly financial intelligence briefing
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary flex items-center gap-2"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Brain className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Report Selector */}
      {monthlyReports.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {monthlyReports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${activeReport?.id === report.id
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'bg-[#1a2332] text-muted border border-card-border hover:border-accent/30'
                }`}
            >
              {report.month}
            </button>
          ))}
        </div>
      )}

      {activeReport ? (
        <div className="space-y-6">
          {/* Health Score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card glow-blue">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">
                Financial Health Score
              </div>
              <div className="text-4xl font-bold text-accent">
                {activeReport.healthScore}
                <span className="text-lg text-muted">/100</span>
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">
                Score Change
              </div>
              <div
                className={`text-4xl font-bold ${activeReport.scoreChange > 0
                  ? 'text-emerald-400'
                  : activeReport.scoreChange < 0
                    ? 'text-red-400'
                    : 'text-muted'
                  }`}
              >
                {activeReport.scoreChange > 0 ? '+' : ''}
                {activeReport.scoreChange}
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">
                Predicted Next Score
              </div>
              <div
                className={`text-4xl font-bold ${getScoreColor(
                  activeReport.predictedNextScore
                )}`}
              >
                {activeReport.predictedNextScore}
              </div>
            </div>
            <div className="card">
              <div className="text-xs text-muted uppercase tracking-wider mb-2">
                Report Date
              </div>
              <div className="text-lg font-bold text-foreground">
                {new Date(activeReport.generatedAt).toLocaleDateString('en-ZA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium">Executive Summary</h3>
            </div>
            <div className="prose prose-sm prose-invert max-w-none">
              {activeReport.summary.split('\n').map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/90 mb-2">
                  {line.replace(/\*\*/g, '')}
                </p>
              ))}
            </div>
          </div>

          {/* Credit Trajectory */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium">Credit Trajectory</h3>
            </div>
            <p className="text-sm leading-relaxed">
              {activeReport.creditTrajectory}
            </p>
          </div>

          {/* Two Column: Risk Factors & Smart Moves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Risk Factors */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-medium">Risk Factors</h3>
              </div>
              {activeReport.riskFactors.length > 0 ? (
                <div className="space-y-3">
                  {activeReport.riskFactors.map((risk, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-2 shrink-0" />
                      <p className="text-sm text-foreground/80">{risk}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No significant risk factors identified. Keep up the good work.
                </p>
              )}
            </div>

            {/* Smart Moves */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-medium">
                  Smart Moves for Next 30 Days
                </h3>
              </div>
              <div className="space-y-3">
                {activeReport.smartMoves.map((move, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground/80">{move}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Spending Adjustments */}
          {activeReport.spendingAdjustments.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-medium">Spending Adjustments</h3>
              </div>
              <div className="space-y-3">
                {activeReport.spendingAdjustments.map((adj, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 shrink-0" />
                    <p className="text-sm text-foreground/80">{adj}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Credit Usage Plan */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-medium">Credit Usage Plan</h3>
            </div>
            <p className="text-sm leading-relaxed">
              {activeReport.creditUsagePlan}
            </p>
          </div>

          {/* Warnings */}
          {activeReport.warnings.length > 0 && (
            <div className="card border border-red-400/30 bg-red-400/5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-medium text-red-400">Warnings</h3>
              </div>
              <div className="space-y-3">
                {activeReport.warnings.map((warning, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                    <p className="text-sm text-red-300">{warning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-16">
          <Brain className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Reports Generated</h3>
          <p className="text-sm text-muted max-w-md mx-auto mb-6">
            Generate your first monthly AI financial advisor report. The system
            will analyse your credit score, spending patterns, and financial
            behaviour to produce a comprehensive briefing.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary"
          >
            Generate First Report
          </button>
        </div>
      )}
    </div>
  );
}
