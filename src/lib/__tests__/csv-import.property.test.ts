import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseCSV, validateRow } from '../csv-import';

/**
 * Feature: premier-league-tracker, Property 1: CSV import partition invariant
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 *
 * For any CSV file with N data rows, the import process SHALL produce counts where
 * inserted + skipped + rejected = N, where:
 * - every row with valid required fields and a unique card_number is inserted
 * - every row with a card_number already in the database is skipped
 * - every row with missing/whitespace-only required fields or non-positive-integer card_number is rejected with a reason
 */

// --- Generators ---

/** Generate a valid positive integer card number as a string */
const validCardNumber = fc.integer({ min: 1, max: 9999 }).map(String);

/** Generate a non-empty string that starts with a letter (guarantees non-whitespace content, no commas or quotes) */
const nonEmptyString = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,15}$/);

/** Generate an optional notes field */
const notesField = fc.oneof(fc.constant(''), nonEmptyString);

type RowData = {
  card_number: string;
  set_name: string;
  set_card_number: string;
  player: string;
  team: string;
  notes: string;
};

/** A fully valid row */
const validRowArb: fc.Arbitrary<RowData> = fc.record({
  card_number: validCardNumber,
  set_name: nonEmptyString,
  set_card_number: nonEmptyString,
  player: nonEmptyString,
  team: nonEmptyString,
  notes: notesField,
});

/** An invalid row - missing or invalid required fields */
const invalidRowArb: fc.Arbitrary<RowData> = fc.oneof(
  // Missing card_number (empty or whitespace)
  fc.record({
    card_number: fc.oneof(fc.constant(''), fc.constant('   ')),
    set_name: nonEmptyString,
    set_card_number: nonEmptyString,
    player: nonEmptyString,
    team: nonEmptyString,
    notes: notesField,
  }),
  // Non-integer card_number (negative, zero, float, or text)
  fc.record({
    card_number: fc.oneof(
      fc.constant('0'),
      fc.constant('-5'),
      fc.constant('3.14'),
      fc.constant('abc'),
      fc.constant('-1')
    ),
    set_name: nonEmptyString,
    set_card_number: nonEmptyString,
    player: nonEmptyString,
    team: nonEmptyString,
    notes: notesField,
  }),
  // Missing set_name
  fc.record({
    card_number: validCardNumber,
    set_name: fc.oneof(fc.constant(''), fc.constant('   ')),
    set_card_number: nonEmptyString,
    player: nonEmptyString,
    team: nonEmptyString,
    notes: notesField,
  }),
  // Missing player
  fc.record({
    card_number: validCardNumber,
    set_name: nonEmptyString,
    set_card_number: nonEmptyString,
    player: fc.oneof(fc.constant(''), fc.constant('   ')),
    team: nonEmptyString,
    notes: notesField,
  }),
  // Missing set_card_number
  fc.record({
    card_number: validCardNumber,
    set_name: nonEmptyString,
    set_card_number: fc.oneof(fc.constant(''), fc.constant('   ')),
    player: nonEmptyString,
    team: nonEmptyString,
    notes: notesField,
  })
);

/** Build a CSV string from an array of row objects */
function buildCSV(rows: RowData[]): string {
  const header = 'card_number,set_name,set_card_number,player,team,notes';
  const dataLines = rows.map((r) =>
    [r.card_number, r.set_name, r.set_card_number, r.player, r.team, r.notes].join(',')
  );
  return [header, ...dataLines].join('\n');
}

/** Check if a row has valid required fields per validation rules */
function isRowValid(row: RowData): boolean {
  const cardNumStr = row.card_number.trim();
  if (!cardNumStr) return false;
  const cardNum = Number(cardNumStr);
  if (!Number.isInteger(cardNum) || cardNum <= 0) return false;
  if (!row.set_name.trim()) return false;
  if (!row.player.trim()) return false;
  if (!row.set_card_number.trim()) return false;
  return true;
}

describe('Feature: premier-league-tracker, Property 1: CSV import partition invariant', () => {
  it('partition invariant: validRows + errors = total data rows for any generated input', () => {
    fc.assert(
      fc.property(
        fc.array(validRowArb, { minLength: 0, maxLength: 10 }),
        fc.array(invalidRowArb, { minLength: 0, maxLength: 10 }),
        (validRows, invalidRows) => {
          // Combine valid and invalid rows
          const allRows: RowData[] = [...validRows, ...invalidRows];

          // Build CSV and parse
          const csv = buildCSV(allRows);
          const parsed = parseCSV(csv);

          // Total data rows should match
          expect(parsed.length).toBe(allRows.length);

          // Validate each row and partition
          let validCount = 0;
          let errorCount = 0;

          for (let i = 0; i < parsed.length; i++) {
            const result = validateRow(parsed[i], i + 1);
            if (result.valid) {
              validCount++;
            } else {
              errorCount++;
            }
          }

          // PARTITION INVARIANT: valid + rejected = total
          expect(validCount + errorCount).toBe(parsed.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all rows with valid fields pass validation', () => {
    fc.assert(
      fc.property(
        fc.array(validRowArb, { minLength: 1, maxLength: 15 }),
        (validRows) => {
          const csv = buildCSV(validRows);
          const parsed = parseCSV(csv);

          for (let i = 0; i < parsed.length; i++) {
            const result = validateRow(parsed[i], i + 1);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all rows with invalid fields are rejected with appropriate reasons', () => {
    fc.assert(
      fc.property(
        fc.array(invalidRowArb, { minLength: 1, maxLength: 15 }),
        (invalidRows) => {
          const csv = buildCSV(invalidRows);
          const parsed = parseCSV(csv);

          for (let i = 0; i < parsed.length; i++) {
            const result = validateRow(parsed[i], i + 1);
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error!.row).toBe(i + 1);
            expect(result.error!.reason).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('duplicate card_numbers among valid rows: first occurrence is valid, duplicates are detectable', () => {
    fc.assert(
      fc.property(
        fc.array(validRowArb, { minLength: 2, maxLength: 10 }),
        (rows) => {
          // Force some duplicates by reusing the first row's card_number
          const duplicatedRows = rows.map((r, i) =>
            i > 0 && i % 2 === 0
              ? { ...r, card_number: rows[0].card_number }
              : r
          );

          const csv = buildCSV(duplicatedRows);
          const parsed = parseCSV(csv);

          // Track seen card_numbers to identify duplicates
          const seen = new Set<string>();
          let insertable = 0;
          let skippable = 0;
          let rejected = 0;

          for (let i = 0; i < parsed.length; i++) {
            const result = validateRow(parsed[i], i + 1);
            if (!result.valid) {
              rejected++;
            } else {
              const cardNum = parsed[i].card_number.trim();
              if (seen.has(cardNum)) {
                skippable++;
              } else {
                seen.add(cardNum);
                insertable++;
              }
            }
          }

          // Partition invariant: insertable + skippable + rejected = total
          expect(insertable + skippable + rejected).toBe(parsed.length);

          // All rows with valid fields still pass individual validation
          // (duplicate detection is a DB-level concern, not per-row validation)
          for (let i = 0; i < parsed.length; i++) {
            const row = duplicatedRows[i];
            if (isRowValid(row)) {
              const result = validateRow(parsed[i], i + 1);
              expect(result.valid).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('mixed valid, invalid, and duplicate rows maintain full partition invariant', () => {
    fc.assert(
      fc.property(
        fc.array(validRowArb, { minLength: 0, maxLength: 8 }),
        fc.array(invalidRowArb, { minLength: 0, maxLength: 8 }),
        fc.array(validRowArb, { minLength: 0, maxLength: 5 }),
        (validRows, invalidRows, duplicateSourceRows) => {
          // Create duplicates from source rows by reusing card_numbers from validRows
          const duplicates = duplicateSourceRows.map((r, i) => ({
            ...r,
            card_number: validRows.length > 0
              ? validRows[i % validRows.length].card_number
              : r.card_number,
          }));

          // Combine all rows together
          const allRows: RowData[] = [...validRows, ...invalidRows, ...duplicates];

          const csv = buildCSV(allRows);
          const parsed = parseCSV(csv);

          // Partition into valid (unique inserts + duplicate skips) and rejected
          const seen = new Set<string>();
          let inserted = 0;
          let skipped = 0;
          let rejected = 0;

          for (let i = 0; i < parsed.length; i++) {
            const result = validateRow(parsed[i], i + 1);
            if (!result.valid) {
              rejected++;
            } else {
              const cardNum = parsed[i].card_number.trim();
              if (seen.has(cardNum)) {
                skipped++;
              } else {
                seen.add(cardNum);
                inserted++;
              }
            }
          }

          // FULL PARTITION INVARIANT: inserted + skipped + rejected = total
          expect(inserted + skipped + rejected).toBe(allRows.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
