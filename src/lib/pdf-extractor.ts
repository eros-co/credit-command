/**
 * PDF text extractor with FlateDecode decompression support
 * Handles compressed PDF streams to extract readable text
 */

import { inflateSync } from 'zlib';

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const text = extractTextFromPDFBinary(buffer);
    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from PDF');
    }
    return text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractTextFromPDFBinary(buffer: Buffer): string {
  try {
    const bufferStr = buffer.toString('latin1');
    const textChunks: string[] = [];

    // Extract text from uncompressed streams first
    const textRegex = /BT([\s\S]*?)ET/g;
    let match;

    while ((match = textRegex.exec(bufferStr)) !== null) {
      const textContent = match[1];

      // Extract text from Tj and TJ operators
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      const tjMatches = textContent.matchAll(tjRegex);

      for (const tjMatch of tjMatches) {
        let text = decodeTextString(tjMatch[1]);
        if (text) textChunks.push(text);
      }

      // Extract from TJ operator arrays
      const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
      const tjArrayMatches = textContent.matchAll(tjArrayRegex);

      for (const tjArrayMatch of tjArrayMatches) {
        const arrayContent = tjArrayMatch[1];
        const stringRegex = /\(([^)]*)\)/g;
        const stringMatches = arrayContent.matchAll(stringRegex);

        for (const stringMatch of stringMatches) {
          let text = decodeTextString(stringMatch[1]);
          if (text) textChunks.push(text);
        }
      }
    }

    // Try to extract from FlateDecode compressed streams
    const streamRegex = /<<([^>]*)>>\s*stream\s*([\s\S]*?)\s*endstream/g;
    let streamMatch;

    while ((streamMatch = streamRegex.exec(bufferStr)) !== null) {
      const streamDict = streamMatch[1];
      const streamData = streamMatch[2];

      // Check if this stream is FlateDecode compressed
      if (streamDict.includes('FlateDecode')) {
        try {
          // Find the binary data end (before "endstream")
          const binaryStart = bufferStr.indexOf(streamData);
          const binaryEnd = bufferStr.indexOf('endstream', binaryStart);
          const binaryChunk = buffer.slice(binaryStart, binaryEnd);

          // Try to decompress
          const decompressed = inflateSync(binaryChunk).toString('latin1');

          // Extract text from decompressed data
          const decompTextRegex = /BT([\s\S]*?)ET/g;
          let decompMatch;

          while ((decompMatch = decompTextRegex.exec(decompressed)) !== null) {
            const decompTextContent = decompMatch[1];

            // Extract Tj operators
            const decompTjRegex = /\(([^)]*)\)\s*Tj/g;
            const decompTjMatches = decompTextContent.matchAll(decompTjRegex);

            for (const decompTjMatch of decompTjMatches) {
              let text = decodeTextString(decompTjMatch[1]);
              if (text) textChunks.push(text);
            }

            // Extract TJ operators
            const decompTjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
            const decompTjArrayMatches = decompTextContent.matchAll(decompTjArrayRegex);

            for (const decompTjArrayMatch of decompTjArrayMatches) {
              const decompArrayContent = decompTjArrayMatch[1];
              const decompStringRegex = /\(([^)]*)\)/g;
              const decompStringMatches = decompArrayContent.matchAll(decompStringRegex);

              for (const decompStringMatch of decompStringMatches) {
                let text = decodeTextString(decompStringMatch[1]);
                if (text) textChunks.push(text);
              }
            }
          }
        } catch (decompError) {
          // Silently skip if decompression fails
          console.debug('Decompression failed for stream:', decompError);
        }
      }
    }

    // Join all text chunks with spaces
    let result = textChunks.join(' ');

    // Clean up the result
    result = result
      .replace(/\s+/g, ' ') // Collapse multiple spaces
      .trim();

    return result;
  } catch (error) {
    console.error('Binary PDF extraction error:', error);
    throw error;
  }
}

function decodeTextString(encoded: string): string {
  try {
    let text = encoded;

    // Decode escape sequences
    text = text.replace(/\\n/g, '\n');
    text = text.replace(/\\r/g, '\r');
    text = text.replace(/\\t/g, '\t');
    text = text.replace(/\\\(/g, '(');
    text = text.replace(/\\\)/g, ')');
    text = text.replace(/\\\\/g, '\\');

    // Decode octal sequences
    text = text.replace(/\\(\d{1,3})/g, (match, octal) => {
      try {
        return String.fromCharCode(parseInt(octal, 8));
      } catch {
        return match;
      }
    });

    // Filter out non-printable characters
    text = text
      .split('')
      .filter(char => {
        const code = char.charCodeAt(0);
        return (code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9;
      })
      .join('');

    return text.trim();
  } catch (error) {
    console.debug('Text decode error:', error);
    return '';
  }
}
