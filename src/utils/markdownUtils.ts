import React from 'react';

/**
 * Normalizes Markdown content before parsing:
 * 1. Resolves collapsed table rows where multiple rows are concatenated on a single line (e.g. "| col1 | col2 | |---|---| | val1 | val2 |").
 * 2. Ensures markdown tables have clean newline separation before and after the table block so CommonMark/GFM treats them as block-level elements.
 * 3. Normalizes inconsistent pipe delimiters and trailing spaces.
 */
export function normalizeMarkdown(content: string): string {
  if (!content || typeof content !== 'string') return '';

  let normalized = content;

  // 1. Repair collapsed table rows where multiple rows were placed on a single line:
  // Detect lines with multiple table row boundaries: "| |" or "|  |"
  // e.g. "| Type | Description | |-------|--------------| | int | Whole numbers |"
  normalized = normalized.replace(/(\|[^\n]+\|)/g, (match) => {
    // If there is "| |" or "|   |" in the line and contains table delimiter "|---" or multiple rows
    if (/\|\s*\|/.test(match)) {
      // Split on the boundary between rows: "| |" -> "|\n|"
      return match.replace(/\|\s*\|/g, '|\n|');
    }
    return match;
  });

  // 2. Ensure blank line before any table block (line starting with |) if the preceding line is non-empty text
  // This prevents CommonMark from interpreting the table as continuation of a previous paragraph.
  normalized = normalized.replace(/([^\n\r])(\r?\n)(\|[^\r\n]+\|)/g, (match, prev, newline, tableRow) => {
    // Do not add extra newline if prev was already another table row or empty
    if (prev.trim() === '' || prev.trim().endsWith('|')) {
      return match;
    }
    return `${prev}\n\n${tableRow}`;
  });

  // 3. Ensure blank line after any table block (line ending with |) if the following line is non-empty text
  normalized = normalized.replace(/(\|[^\r\n]+\|)(\r?\n)([^\r\n|])/g, (match, tableRow, newline, next) => {
    if (next.trim() === '' || next.trim().startsWith('|')) {
      return match;
    }
    return `${tableRow}\n\n${next}`;
  });

  return normalized;
}

/**
 * Standard ReactMarkdown component overrides for high-agency, anti-ai-slop markdown tables.
 * Perfectly styled for both Light Mode and True Black Dark Mode (#09090b / #121214 / #27272a).
 * Implemented with React.createElement to ensure pure TypeScript compatibility (.ts and .tsx).
 */
export const markdownTableComponents = {
  table: ({ children, ...props }: React.ComponentPropsWithoutRef<'table'>) =>
    React.createElement(
      'div',
      { className: 'table-container my-5 w-full overflow-x-auto rounded-xl border border-stone-200 dark:border-[#27272a] bg-white dark:bg-[#121214] shadow-sm' },
      React.createElement('table', { className: 'w-full min-w-full border-collapse text-left text-sm', ...props }, children)
    ),
  thead: ({ children, ...props }: React.ComponentPropsWithoutRef<'thead'>) =>
    React.createElement(
      'thead',
      { className: 'bg-stone-50/90 dark:bg-[#18181c] border-b border-stone-200 dark:border-[#27272a]', ...props },
      children
    ),
  th: ({ children, ...props }: React.ComponentPropsWithoutRef<'th'>) =>
    React.createElement(
      'th',
      { className: 'px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-zinc-200 border-b border-stone-200 dark:border-[#27272a] select-none', ...props },
      children
    ),
  td: ({ children, ...props }: React.ComponentPropsWithoutRef<'td'>) =>
    React.createElement(
      'td',
      { className: 'px-4 py-3 border-b border-stone-100 dark:border-[#27272a]/60 text-stone-600 dark:text-zinc-400 align-middle text-sm', ...props },
      children
    ),
  tr: ({ children, ...props }: React.ComponentPropsWithoutRef<'tr'>) =>
    React.createElement(
      'tr',
      { className: 'transition-colors hover:bg-stone-50/60 dark:hover:bg-white/[0.02] last:border-b-0', ...props },
      children
    ),
};
