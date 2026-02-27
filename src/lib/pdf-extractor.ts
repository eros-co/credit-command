/**
 * Simple PDF text extractor using pdftotext system utility
 * This is the most reliable method for serverless environments
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const tmpFile = join(tmpdir(), `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`);

  try {
    // Write buffer to temporary file
    writeFileSync(tmpFile, buffer);

    // Use pdftotext to extract text
    const text = execSync(`pdftotext "${tmpFile}" -`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });

    return text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up temporary file
    try {
      unlinkSync(tmpFile);
    } catch (err) {
      // Ignore cleanup errors
    }
  }
}
