import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MANUS_API_KEY = process.env.MANUS_API_KEY;
const MANUS_API_URL = 'https://api.manus.ai/v1/tasks';

export async function POST(request: NextRequest) {
  const tmpFile = join(tmpdir(), `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);

  try {
    console.log('[PDF Parser] Starting PDF upload processing');
    
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.log('[PDF Parser] No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    console.log(`[PDF Parser] File received: ${file.name} (${file.size} bytes)`);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Write the uploaded file to a temporary location
    const buffer = await file.arrayBuffer();
    writeFileSync(tmpFile, Buffer.from(buffer));
    console.log(`[PDF Parser] File written to temp location: ${tmpFile}`);

    // Read the file as base64 for the API
    const fileBuffer = readFileSync(tmpFile);
    const base64File = `data:application/pdf;base64,${fileBuffer.toString('base64')}`;
    console.log(`[PDF Parser] File converted to base64 (${base64File.length} characters)`);

    // Create a Manus task to process the PDF
    const taskInstructions = `You are an expert FNB (First National Bank, South Africa) statement parser.
I'm uploading an FNB bank statement PDF (Current, Credit Card, or Savings).

CRITICAL INSTRUCTIONS:
1. Identify the account type: "current_account", "credit_card", or "savings_account".
2. Extract all transactions precisely. FNB statements often have multiple pages; ensure you capture every single transaction.
3. Handle negative/positive amounts correctly based on the "Balance" column and transaction description.
4. Categorize transactions into these specific categories: 
   housing, utilities, groceries, transport, entertainment, dining, shopping, health, insurance, subscriptions, savings, investments, debt_payment, income, transfer, bank_charges, fuel, mobile_data, other.
5. Extract summary data: opening balance, closing balance, statement period, account number, statement date.
6. For credit card statements, extract the credit limit and available balance.
7. For savings accounts, ensure you capture interest earned.

Return the complete parsed data as a JSON object with this exact structure:

{
  "statementType": "current_account" | "credit_card" | "savings_account",
  "accountNumber": "string",
  "statementNumber": "string",
  "statementDate": "string",
  "periodStart": "string",
  "periodEnd": "string",
  "openingBalance": number,
  "closingBalance": number,
  "totalDebits": number,
  "totalCredits": number,
  "creditLimit": number (optional),
  "availableBalance": number (optional),
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "type": "debit" | "credit",
      "category": "string",
      "isSubscription": boolean
    }
  ]
}

IMPORTANT: Provide ONLY the JSON object. No markdown code blocks, no preamble. Start with { and end with }.
Use the 'gemini-2.5-flash' model for speed and efficiency.`;

    // Create the task payload with credit-efficient model
    const taskPayload = {
      prompt: taskInstructions,
      model: 'gemini-2.5-flash',
      attachments: [
        {
          filename: file.name,
          fileData: base64File
        }
      ]
    };

    console.log(`[PDF Parser] Calling Manus API at ${MANUS_API_URL}`);

    // Call the Manus API to create a task
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
      console.error(`[PDF Parser] Manus API error (${response.status}):`, errorText);
      return NextResponse.json({ error: 'Failed to create Manus task', details: errorText }, { status: response.status });
    }

    const taskData = await response.json();
    const taskId = taskData.task_id || taskData.id;

    return NextResponse.json({
      success: true,
      message: 'PDF sent to Manus for processing',
      taskId: taskId,
      status: 'processing',
      taskUrl: `https://manus.im/app/${taskId}`
    });
  } catch (error) {
    console.error('[PDF Parser] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Failed to process PDF', details: errorMessage }, { status: 500 });
  } finally {
    try {
      unlinkSync(tmpFile);
    } catch (err) {
      console.log('[PDF Parser] Could not clean up temp file:', err);
    }
  }
}
