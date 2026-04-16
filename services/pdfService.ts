/**
 * ─────────────────────────────────────────────────────────────────
 *  PDF Text Extraction Service
 * ─────────────────────────────────────────────────────────────────
 *
 *  Client-side PDF text extraction using the browser's built-in
 *  FileReader API. For simple text-layer PDFs this works directly.
 *
 *  For scanned/image PDFs, we extract what we can and warn the user.
 *  A future upgrade path is to use pdf.js for full rendering.
 */

/** Maximum characters to send to the AI to avoid token overflow */
const MAX_CONTENT_LENGTH = 15000;

/**
 * Extracts plain text from a PDF file using a lightweight approach.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // Use dynamic import so it doesn't break SSR or initial bundle if not needed
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker to CDN to avoid complex Vite worker bundling setup
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const arrayBuffer = reader.result as ArrayBuffer;
        
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfPattern = await loadingTask.promise;
        let extractedText = '';

        for (let i = 1; i <= pdfPattern.numPages; i++) {
          const page = await pdfPattern.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
          extractedText += pageText + '\n\n';
        }

        extractedText = extractedText.replace(/\s+/g, ' ').trim();

        // Truncate to avoid token limits
        if (extractedText.length > MAX_CONTENT_LENGTH) {
          extractedText = extractedText.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated for processing]';
        }

        if (!extractedText || extractedText.length < 20) {
          resolve('[PDF text extraction yielded minimal content. This may be a scanned/image-based PDF. Please manually paste key text below.]');
        } else {
          resolve(extractedText);
        }
      } catch (err) {
        console.error('[PDF] Extraction error:', err);
        reject(new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the PDF file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validates a file is a PDF and within size limits
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE_MB = 10;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'Please select a PDF file.' };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: `File is too large (max ${MAX_SIZE_MB}MB).` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file is empty.' };
  }

  return { valid: true };
}
