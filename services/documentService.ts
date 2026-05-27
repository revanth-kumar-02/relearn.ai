import { Plan, Task } from '../types';
import { CheatSheet } from './gemini/cheatSheetService';

/**
 * ─────────────────────────────────────────────────────────────────
 *  Document Service
 * ─────────────────────────────────────────────────────────────────
 * 
 * Handles both PDF text extraction and Plan exporting (PDF).
 */

// ─── PDF EXTRACTION ───────────────────────────────────────────────

/** Maximum characters to send to the AI to avoid token overflow */
const MAX_CONTENT_LENGTH = 15000;

/**
 * Extracts plain text from a PDF file using a lightweight approach.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  
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

        if (extractedText.length > MAX_CONTENT_LENGTH) {
          extractedText = extractedText.substring(0, MAX_CONTENT_LENGTH) + '\n\n[Content truncated for processing]';
        }

        if (!extractedText || extractedText.length < 20) {
          resolve('[PDF text extraction yielded minimal content. This may be a scanned/image-based PDF. Please manually paste key text below.]');
        } else {
          resolve(extractedText);
        }
      } catch (err) {
        console.error('[DocumentService] PDF Extraction error:', err);
        reject(new Error('Failed to extract text from PDF.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read the PDF file.'));
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

  return { valid: true };
}

// ─── PDF EXPORTING ────────────────────────────────────────────────

/**
 * Generates and downloads a PDF export of a learning plan.
 */
export async function exportPlanAsPDF(
  plan: Plan,
  tasks: Task[],
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Loading PDF engine...');

  const { default: jsPDF } = await import('jspdf');

  onProgress?.('Generating PDF...');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const drawHorizontalLine = (yPos: number, color: [number, number, number] = [220, 220, 220]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  // ─── Cover ───
  doc.setFillColor(19, 164, 236);
  doc.rect(margin, y, 4, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(plan.title, contentWidth - 10);
  doc.text(titleLines, margin + 10, y + 8);
  y += Math.max(25, titleLines.length * 10 + 10);

  // Stats
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text(`${plan.subject || 'General'}  |  ${plan.difficulty || 'All Levels'}`, margin, y);
  y += 10;

  drawHorizontalLine(y);
  y += 10;

  // Tasks
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text('Learning Tasks', margin, y);
  y += 10;

  tasks.forEach((task, index) => {
    addNewPageIfNeeded(15);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`${index + 1}. ${task.title}`, margin, y);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`${task.durationMinutes} min  ·  ${task.status}`, pageWidth - margin - 30, y);
    
    y += 8;
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    doc.text('Generated by ReLearn.ai', margin, pageHeight - 10);
  }

  onProgress?.('Downloading...');
  const safeTitle = plan.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 40);
  doc.save(`ReLearn_${safeTitle}.pdf`);
}

/**
 * Generates and downloads a beautifully styled PDF of an AI Cheat Sheet.
 */
export async function exportCheatSheetAsPDF(
  cheatSheet: CheatSheet,
  onProgress?: (status: string) => void
): Promise<void> {
  onProgress?.('Loading PDF engine...');
  const { default: jsPDF } = await import('jspdf');
  onProgress?.('Generating PDF...');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  const drawHorizontalLine = (yPos: number, color: [number, number, number] = [220, 220, 220]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  };

  // Header Title
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(margin, y, 4, 15, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  const titleLines = doc.splitTextToSize(cheatSheet.title, contentWidth - 10);
  doc.text(titleLines, margin + 8, y + 6);
  y += Math.max(20, titleLines.length * 8 + 6);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(150, 150, 150);
  doc.text('RELEARN.AI MASTER REFERENCE  |  ADVANCED AI ENGINE', margin, y);
  y += 6;

  drawHorizontalLine(y, [79, 70, 229]);
  y += 10;

  // Sections
  cheatSheet.sections.forEach((section) => {
    addNewPageIfNeeded(30);

    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(section.heading.toUpperCase(), margin, y);
    y += 6;

    // Section Content
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);

    // Clean up basic markdown symbols for cleaner plain PDF rendering
    const cleanContent = section.content
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove ** bold
      .replace(/\*(.*?)\*/g, '$1')     // remove * italic
      .replace(/`(.*?)`/g, '$1')       // remove ` inline code
      .replace(/```[a-z]*([\s\S]*?)```/g, '$1') // remove ``` code blocks
      .trim();

    const contentLines = doc.splitTextToSize(cleanContent, contentWidth);
    
    // Render lines page by page if it overflows
    contentLines.forEach((line: string) => {
      addNewPageIfNeeded(6);
      doc.text(line, margin, y);
      y += 5;
    });

    y += 8; // spacing between sections
  });

  // Quick Reference
  if (cheatSheet.quickReference && cheatSheet.quickReference.length > 0) {
    addNewPageIfNeeded(40);
    drawHorizontalLine(y);
    y += 8;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text('QUICK REFERENCE', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    
    cheatSheet.quickReference.forEach((ref) => {
      addNewPageIfNeeded(8);
      const refLines = doc.splitTextToSize(`• ${ref.replace(/`(.*?)`/g, '$1')}`, contentWidth);
      refLines.forEach((line: string) => {
        addNewPageIfNeeded(6);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 1.5;
    });
    y += 6;
  }

  // Pitfalls to Avoid
  if (cheatSheet.commonMistakes && cheatSheet.commonMistakes.length > 0) {
    addNewPageIfNeeded(40);
    drawHorizontalLine(y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text('PITFALLS TO AVOID', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);

    cheatSheet.commonMistakes.forEach((mistake) => {
      addNewPageIfNeeded(8);
      const mistakeLines = doc.splitTextToSize(`• ${mistake.replace(/\*\*(.*?)\*\*/g, '$1')}`, contentWidth);
      mistakeLines.forEach((line: string) => {
        addNewPageIfNeeded(6);
        doc.text(line, margin, y);
        y += 5;
      });
      y += 1.5;
    });
  }

  // Footer for all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
    doc.text('ReLearn.ai Master Reference', margin, pageHeight - 10);
  }

  onProgress?.('Downloading...');
  const safeTitle = cheatSheet.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_').slice(0, 40);
  doc.save(`CheatSheet_${safeTitle}.pdf`);
}
