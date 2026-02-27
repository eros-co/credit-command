import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

export const runtime = 'nodejs';
export const maxDuration = 60;

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

    // Call the fnb-pdf-processor skill via Python script
    const skillPath = '/home/ubuntu/skills/fnb-pdf-processor/scripts/process_fnb_pdf.py';
    const command = `python3 ${skillPath} ${tmpFile}`;

    let output: string;
    try {
      output = execSync(command, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error: any) {
      console.error('Skill execution error:', error.message);
      return NextResponse.json(
        { error: `Failed to parse PDF: ${error.message}` },
        { status: 500 }
      );
    }

    // Parse the skill output
    let result;
    try {
      result = JSON.parse(output);
    } catch (parseError) {
      console.error('Failed to parse skill output:', output);
      return NextResponse.json(
        { error: 'Failed to parse skill output' },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Unknown error' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}` },
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
