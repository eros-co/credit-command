import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MANUS_API_KEY = process.env.MANUS_API_KEY;
const MANUS_API_URL = 'https://api.manus.ai/v1/tasks';

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        // Create the task payload with Manus 1.6 Lite model
        const taskInstructions = `You are an expert AI Financial Advisor.
Based on the provided user financial data, generate a highly insightful, real-time monthly financial report. 
Do NOT just regurgitate the numbers. Analyze the transactions, expenses, and balances to provide actionable, specific advice.
Tell the user exactly how much to put into savings, which card to use for spending, and what specific expenses to reduce to improve their financial health.

USER DATA:
${JSON.stringify(data, null, 2)}

Provide the report strictly as a JSON object matching this TypeScript interface:

interface MonthlyReport {
  id: string; // generate a unique UUID
  month: string; // e.g. "2026-02"
  generatedAt: string; // ISO date string
  healthScore: number; // calculated 0-100 indicating overall financial health
  scoreChange: number; // estimated score change this month
  predictedNextScore: number; // predicted credit score next month
  summary: string; // A highly intelligent executive summary of their financial state
  creditTrajectory: string; // e.g. "Positive trajectory. Score improved..."
  riskFactors: string[]; // List of real risks based on their actual transactions/balances
  smartMoves: string[]; // Specific, actionable moves for the next 30 days
  spendingAdjustments: string[]; // Specific categories/transactions to reduce
  creditUsagePlan: string; // Specific advice on which card to use, what to reduce, how to manage balances.
  warnings: string[]; // Critical alerts
}

CRITICAL: Return ONLY valid JSON matching the structure. Do not use Markdown code blocks or any other formatting.`;

        const taskPayload = {
            prompt: taskInstructions,
            model: 'manus 1.6 Lite'
        };

        const response = await fetch(MANUS_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'API_KEY': MANUS_API_KEY || ''
            },
            body: JSON.stringify(taskPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: 'Failed to create Manus task', details: errorText }, { status: response.status });
        }

        const taskData = await response.json();
        const taskId = taskData.task_id || taskData.id;

        return NextResponse.json({
            success: true,
            taskId: taskId,
            status: 'processing'
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: 'Failed to generate report', details: errorMessage }, { status: 500 });
    }
}
