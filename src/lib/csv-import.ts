import type { ImportError } from '../types';

export interface ParsedRow {
  card_number: string;
  set_name: string;
  set_card_number: string;
  player: string;
  team: string;
  notes: string | null;
}

const REQUIRED_HEADERS = ['card_number', 'set_name', 'set_card_number', 'player', 'team'];

/**
 * Parses CSV text content into an array of ParsedRow objects.
 * Expects headers in the first row: card_number, set_name, set_card_number, player, team, notes
 */
export function parseCSV(fileContent: string): ParsedRow[] {
  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j]?.trim() ?? '';
    }

    rows.push({
      card_number: row['card_number'] ?? '',
      set_name: row['set_name'] ?? '',
      set_card_number: row['set_card_number'] ?? '',
      player: row['player'] ?? '',
      team: row['team'] ?? '',
      notes: row['notes']?.trim() || null,
    });
  }

  return rows;
}

/**
 * Parses a single CSV line, handling quoted fields with commas inside.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Validates a single parsed row. Returns valid: true if the row passes all validation rules.
 * Row index is 1-based (row 1 = first data row after header).
 */
export function validateRow(
  row: ParsedRow,
  rowIndex: number
): { valid: boolean; error?: ImportError } {
  // card_number: required, must be a valid positive integer
  const cardNumStr = row.card_number.trim();
  if (!cardNumStr) {
    return {
      valid: false,
      error: { row: rowIndex, reason: 'card_number is required' },
    };
  }
  const cardNum = Number(cardNumStr);
  if (!Number.isInteger(cardNum) || cardNum <= 0) {
    return {
      valid: false,
      error: { row: rowIndex, reason: 'card_number must be a positive integer' },
    };
  }

  // set_name: required, non-whitespace
  if (!row.set_name.trim()) {
    return {
      valid: false,
      error: { row: rowIndex, reason: 'set_name is required' },
    };
  }

  // player: required, non-whitespace
  if (!row.player.trim()) {
    return {
      valid: false,
      error: { row: rowIndex, reason: 'player is required' },
    };
  }

  // set_card_number: required (may be alphanumeric)
  if (!row.set_card_number.trim()) {
    return {
      valid: false,
      error: { row: rowIndex, reason: 'set_card_number is required' },
    };
  }

  return { valid: true };
}

/**
 * Orchestrates CSV file parsing and validation.
 * Checks file type, reads content, parses, and validates each row.
 */
export async function processCSVFile(
  file: File
): Promise<{ validRows: ParsedRow[]; errors: ImportError[] }> {
  // Check file type
  const isCSVByType = file.type === 'text/csv';
  const isCSVByExtension = file.name.toLowerCase().endsWith('.csv');

  if (!isCSVByType && !isCSVByExtension) {
    return {
      validRows: [],
      errors: [{ row: 0, reason: 'File is not a valid CSV' }],
    };
  }

  // Read file content
  let content: string;
  try {
    content = await readFileAsText(file);
  } catch {
    return {
      validRows: [],
      errors: [{ row: 0, reason: 'File is not a valid CSV' }],
    };
  }

  // Check for unparseable content (e.g., binary content)
  if (containsBinaryContent(content)) {
    return {
      validRows: [],
      errors: [{ row: 0, reason: 'File is not a valid CSV' }],
    };
  }

  // Parse CSV
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return {
      validRows: [],
      errors: [{ row: 0, reason: 'File is not a valid CSV' }],
    };
  }

  // Validate headers - use parseCsvLine to handle quoted headers
  const headerValues = parseCsvLine(lines[0]);
  const headers = headerValues.map((h) => h.trim().toLowerCase());
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return {
      validRows: [],
      errors: [{ row: 0, reason: 'File is not a valid CSV' }],
    };
  }

  // Check for header-only CSV (no data rows)
  if (lines.length === 1) {
    return {
      validRows: [],
      errors: [{ row: 0, reason: 'No cards found in file' }],
    };
  }

  // Parse and validate rows
  const parsedRows = parseCSV(content);
  const validRows: ParsedRow[] = [];
  const errors: ImportError[] = [];

  for (let i = 0; i < parsedRows.length; i++) {
    const result = validateRow(parsedRows[i], i + 1);
    if (result.valid) {
      validRows.push(parsedRows[i]);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { validRows, errors };
}

/**
 * Simple heuristic to detect binary content in a string.
 */
function containsBinaryContent(content: string): boolean {
  // Check for null bytes or high density of non-printable characters
  const nonPrintable = content
    .slice(0, 1000)
    .split('')
    .filter((c) => {
      const code = c.charCodeAt(0);
      return code === 0 || (code < 32 && code !== 9 && code !== 10 && code !== 13);
    });

  return nonPrintable.length > 5;
}

/**
 * Reads a File as text, trying UTF-8 first. If the result contains replacement
 * characters (suggesting wrong encoding), falls back to Windows-1252.
 * Also strips the UTF-8 BOM if present.
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      let text = reader.result as string;
      // Strip UTF-8 BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }
      // If we see replacement characters, the file probably isn't UTF-8
      if (text.includes('\uFFFD')) {
        // Re-read as Windows-1252 (common for Excel-exported CSVs)
        const reader2 = new FileReader();
        reader2.onload = () => {
          let text2 = reader2.result as string;
          if (text2.charCodeAt(0) === 0xFEFF) {
            text2 = text2.slice(1);
          }
          resolve(text2);
        };
        reader2.onerror = () => reject(new Error('Failed to read file'));
        reader2.readAsText(file, 'windows-1252');
      } else {
        resolve(text);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'UTF-8');
  });
}
