import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MANUS_API_KEY = process.env.MANUS_API_KEY || 'sk-sinvDZ-cU0wfimql8b9qZl7DJkDgWtxnAk8wkU4daqQXU-Hr_JQTMLDjtSIKEY-yoqWiMtWoHHkyNGYQV9m6ScQZcF4k';
const MANUS_API_URL = 'https://api.manus.ai/v1/tasks';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://credit-command.vercel.app/api/manus-webhook';

export async function POST(request: NextRequest) {
  const tmpFile = join(tmpdir(), `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Write the uploaded file to a temporary location
    const buffer = await file.arrayBuffer();
    writeFileSync(tmpFile, Buffer.from(buffer));

    // Read the file as base64 for the API
    const fileBuffer = readFileSync(tmpFile);
    const base64File = fileBuffer.toString('base64');

    // Create a Manus task to process the PDF
    const taskInstructions = `You are an FNB (First National Bank) statement parser. I'm uploading an FNB Private Wealth bank statement PDF.

Please:
1. Extract all transaction data from the PDF
2. Identify whether it's a Current Account or Credit Card statement
3. Parse each transaction with: date, description, amount, type (debit/credit)
4. Categorize transactions into: Food & Dining, Transport, Subscriptions, Fuel, Investments & Trading, Loan Repayments, Mobile & Data, Bank Charges, Utilities, Healthcare, Entertainment, Shopping, Insurance, Education, Salary/Income, Rent, Other
5. Extract summary data: opening balance, closing balance, statement period, account number
6. Return the complete parsed data as a JSON object

The PDF file is attached. Please process it and provide the structured JSON output.`;

    // Create the task payload
    const taskPayload = {
      instructions: taskInstructions,
      attachments: [
        {
          file_name: file.name,
          file_data: base64File,
          file_type: 'application/pdf'
        }
      ]
    };

    // Call the Manus API to create a task
    const response = await fetch(MANUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API_KEY': MANUS_API_KEY
      },
      body: JSON.stringify(taskPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Manus API error details:", errorText);
      return NextResponse.json(
        { 
          error: 'Failed to create Manus task',
          details: errorText,
          statusCode: response.status,
          status: response.status
        },
        { status: response.status }
      );
    }

    const taskData = await response.json();

    return NextResponse.json({
      success: true,
      message: 'PDF sent to Manus for processing',
      taskId: taskData.id,
      status: 'processing',
      estimatedTime: '30-60 seconds',
      taskUrl: taskData.task_url || `https://manus.im/app/${taskData.id}`
    });
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary file
    try {
      unlinkSync(tmpFile);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}
