import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { detectAndParse } from '@/lib/fnb-parser';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const tmpDir = '/tmp';
  let tmpFilePath: string | null = null;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    // Convert file to buffer and save to temp file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    tmpFilePath = join(tmpDir, `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);
    writeFileSync(tmpFilePath, buffer);

    // Use pdftotext command-line tool to extract text
    let fullText: string;
    try {
      fullText = execSync(`pdftotext "${tmpFilePath}" -`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to extract text from PDF. Please ensure the PDF is valid.' },
        { status: 400 }
      );
    }

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json({ error: 'Could not extract text from PDF' }, { status: 400 });
    }

    // Detect type and parse
    const parsed = detectAndParse(fullText);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  } finally {
    // Clean up temp file
    if (tmpFilePath) {
      try {
        unlinkSync(tmpFilePath);
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }
}
