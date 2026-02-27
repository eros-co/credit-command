import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MANUS_API_KEY = process.env.MANUS_API_KEY || 'sk-sinvDZ-cU0wfimql8b9qZl7DJkDgWtxnAk8wkU4daqQXU-Hr_JQTMLDjtSIKEY-yoqWiMtWoHHkyNGYQV9m6ScQZcF4k';
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
      prompt: taskInstructions,
      attachments: [
        {
          filename: file.name,
          fileData: base64File
        }
      ]
    };

    console.log(`[PDF Parser] Calling Manus API at ${MANUS_API_URL}`);
    console.log(`[PDF Parser] API Key: ${MANUS_API_KEY.substring(0, 20)}...`);

    // Call the Manus API to create a task
    const response = await fetch(MANUS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API_KEY': MANUS_API_KEY
      },
      body: JSON.stringify(taskPayload)
    });

    console.log(`[PDF Parser] Manus API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PDF Parser] Manus API error (${response.status}):`, errorText);
      console.error(`[PDF Parser] Response headers:`, Object.fromEntries(response.headers));
      
      return NextResponse.json(
        { 
          error: 'Failed to create Manus task',
          details: errorText,
          statusCode: response.status,
          message: `HTTP ${response.status}: ${errorText.substring(0, 200)}`
        },
        { status: response.status }
      );
    }

    const taskData = await response.json();
    console.log(`[PDF Parser] Task created successfully:`, taskData);
    
    const taskId = taskData.task_id || taskData.id;
    console.log(`[PDF Parser] Task ID:`, taskId);

    return NextResponse.json({
      success: true,
      message: 'PDF sent to Manus for processing',
      taskId: taskId,
      status: 'processing',
      estimatedTime: '30-60 seconds',
      taskUrl: taskData.task_url || `https://manus.im/app/${taskId}`
    });
  } catch (error) {
    console.error('[PDF Parser] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to process PDF',
        details: errorMessage
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary file
    try {
      unlinkSync(tmpFile);
      console.log('[PDF Parser] Temp file cleaned up');
    } catch (err) {
      console.log('[PDF Parser] Could not clean up temp file:', err);
    }
  }
}
