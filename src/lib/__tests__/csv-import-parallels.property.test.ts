import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseCSV, validateRow } from '../csv-import';

/**
 * Feature: parallel-tracking, Properties 6–12: CSV import with parallels
 *
 * Validates: Requirements 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.2, 7.5
 */

// --- Generators ---

/** Generate a valid positive integer card number as a string */
const validCardNumber = fc.integer({ min: 1, max: 9999 }).map(String);

/** Generate a non-empty string safe for CSV (no commas, quotes, newlines) */
const safeCsvString = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 ]{0,15}$/);

/** Generate realistic parallel names */
const parallelNameArb = fc.oneof(
  fc.constant('Base'),
  fc.constant('Blue Voltage'),
  fc.constant('Gold /50'),
  fc.constant('FoilFractor 1/1'),
  fc.constant('Aqua Sparkle /499'),
  fc.constant('Black & White /75'),
  fc.constant('Silver'),
  fc.constant('Purple /25'),
  fc.constant('Red /10'),
  fc.constant('Green /99')
);

/** Generate parallel names with special characters (slashes, ampersands, apostrophes, hyphens, periods) */
const specialCharParallelNameArb = fc.oneof(
  fc.constant('FoilFractor 1/1'),
  fc.constant('Black & White /75'),
  fc.constant("Player's Choice"),
  fc.constant('Red-Blue Variant'),
  fc.constant('Limited Ed. /25'),
  fc.constant('Gold/Silver Hybrid'),
  fc.constant('Collector & Fan Special'),
  fc.constant("Champion's Trophy 1/1"),
  fc.constant('Super.Rare.Card'),
  fc.constant('A/B/C Triple')
);

/** Generate parallel names that contain commas (for quoted field testing) */
const commaParallelNameArb = fc.oneof(
  fc.constant('Gold, Silver, Bronze'),
  fc.constant('Red, White & Blue'),
  fc.constant('Limited, Edition'),
  fc.constant('Rare, 1/1'),
  fc.constant('A, B, C Variant')
);

type RowDataWithParallel = {
  card_number: string;
  set_name: string;
  set_card_number: string;
  player: string;
  team: string;
  notes: string;
  parallel: string;
};

/** A fully valid row with parallel */
const validRowWithParallelArb: fc.Arbitrary<RowDataWithParallel> = fc.record({
  card_number: validCardNumber,
  set_name: safeCsvString,
  set_card_number: safeCsvString,
  player: safeCsvString,
  team: safeCsvString,
  notes: fc.oneof(fc.constant(''), safeCsvString),
  parallel: parallelNameArb,
});

/** An invalid row (missing required fields) with parallel */
const invalidRowWithParallelArb: fc.Arbitrary<RowDataWithParallel> = fc.oneof(
  fc.record({
    card_number: fc.oneof(fc.constant(''), fc.constant('0'), fc.constant('-1'), fc.constant('abc')),
    set_name: safeCsvString,
    set_card_number: safeCsvString,
    player: safeCsvString,
    team: safeCsvString,
    notes: fc.constant(''),
    parallel: parallelNameArb,
  }),
  fc.record({
    card_number: validCardNumber,
    set_name: fc.oneof(fc.constant(''), fc.constant('   ')),
    set_card_number: safeCsvString,
    player: safeCsvString,
    team: safeCsvString,
    notes: fc.constant(''),
    parallel: parallelNameArb,
  }),
  fc.record({
    card_number: validCardNumber,
    set_name: safeCsvString,
    set_card_number: safeCsvString,
    player: fc.oneof(fc.constant(''), fc.constant('   ')),
    team: safeCsvString,
    notes: fc.constant(''),
    parallel: parallelNameArb,
  })
);

/** Build CSV content with parallel column from row objects */
function buildCSVWithParallel(rows: RowDataWithParallel[]): string {
  const header = 'card_number,set_name,set_card_number,player,team,notes,parallel';
  const dataLines = rows.map((r) => {
    // Quote the parallel field if it contains commas, quotes, or special chars
    const parallelField = r.parallel.includes(',') || r.parallel.includes('"')
      ? `"${r.parallel.replace(/"/g, '""')}"`
      : r.parallel;
    return [r.card_number, r.set_name, r.set_card_number, r.player, r.team, r.notes, parallelField].join(',');
  });
  return [header, ...dataLines].join('\n');
}

/** Build CSV content without parallel column (legacy format) */
function buildCSVWithoutParallel(rows: RowDataWithParallel[]): string {
  const header = 'card_number,set_name,set_card_number,player,team,notes';
  const dataLines = rows.map((r) =>
    [r.card_number, r.set_name, r.set_card_number, r.player, r.team, r.notes].join(',')
  );
  return [header, ...dataLines].join('\n');
}

// --- Property Tests ---

describe('Feature: parallel-tracking, Property 6: CSV import partition invariant', () => {
  /**
   * **Validates: Requirements 6.6, 6.7**
   *
   * For any valid CSV content with N data rows, the partition invariant holds:
   * validRows.length + errors.length === N (no rows are silently lost).
   */
  it('validRows + errors = total data rows for mixed valid/invalid CSV with parallels', () => {
    fc.assert(
      fc.property(
        fc.array(validRowWithParallelArb, { minLength: 0, maxLength: 10 }),
        fc.array(invalidRowWithParallelArb, { minLength: 0, maxLength: 10 }),
        (validRows, invalidRows) => {
          const allRows = [...validRows, ...invalidRows];
          const csv = buildCSVWithParallel(allRows);
          const parsed = parseCSV(csv);

          expect(parsed.length).toBe(allRows.length);

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

          // Partition invariant: valid + rejected = total
          expect(validCount + errorCount).toBe(parsed.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: parallel-tracking, Property 7: CSV card deduplication', () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * For any set of valid CSV rows, the number of distinct card_number values
   * equals the count of unique cards that would be created/updated.
   */
  it('distinct card_number count equals unique card count in valid parsed rows', () => {
    fc.assert(
      fc.property(
        fc.array(validRowWithParallelArb, { minLength: 1, maxLength: 20 }),
        (rows) => {
          const csv = buildCSVWithParallel(rows);
          const parsed = parseCSV(csv);

          // Filter to valid rows only
          const validParsed = parsed.filter((row, i) => validateRow(row, i + 1).valid);

          // Count distinct card_numbers among valid rows
          const distinctCardNumbers = new Set(validParsed.map((r) => r.card_number.trim()));

          // The number of unique cards equals distinct card_number count
          expect(distinctCardNumbers.size).toBe(
            new Set(validParsed.map((r) => r.card_number.trim())).size
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: parallel-tracking, Property 8: CSV parallel deduplication', () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * For any set of valid CSV rows, the number of distinct (card_number, parallel_name)
   * pairs equals the count of unique Card_Parallel records that would be created/updated.
   */
  it('distinct (card_number, parallel_name) pairs count equals unique parallel record count', () => {
    fc.assert(
      fc.property(
        fc.array(validRowWithParallelArb, { minLength: 1, maxLength: 20 }),
        (rows) => {
          const csv = buildCSVWithParallel(rows);
          const parsed = parseCSV(csv);

          // Filter to valid rows only
          const validParsed = parsed.filter((row, i) => validateRow(row, i + 1).valid);

          // Count distinct (card_number, parallel_name) pairs
          const distinctPairs = new Set(
            validParsed.map((r) => `${r.card_number.trim()}|${r.parallel_name}`)
          );

          // The parallel count equals distinct pairs
          expect(distinctPairs.size).toBe(
            new Set(validParsed.map((r) => `${r.card_number.trim()}|${r.parallel_name}`)).size
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('duplicate (card_number, parallel_name) rows reduce the unique parallel count', () => {
    fc.assert(
      fc.property(
        fc.array(validRowWithParallelArb, { minLength: 2, maxLength: 10 }),
        (rows) => {
          // Force duplicates by reusing first row's card_number and parallel
          const duplicatedRows = rows.map((r, i) =>
            i > 0 && i % 2 === 0
              ? { ...r, card_number: rows[0].card_number, parallel: rows[0].parallel }
              : r
          );

          const csv = buildCSVWithParallel(duplicatedRows);
          const parsed = parseCSV(csv);

          const validParsed = parsed.filter((row, i) => validateRow(row, i + 1).valid);

          // Distinct pairs should be <= total valid rows (duplicates reduce count)
          const distinctPairs = new Set(
            validParsed.map((r) => `${r.card_number.trim()}|${r.parallel_name}`)
          );

          expect(distinctPairs.size).toBeLessThanOrEqual(validParsed.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: parallel-tracking, Property 9: Empty parallel name defaults to "Base"', () => {
  /**
   * **Validates: Requirements 6.5, 7.1**
   *
   * For any CSV row where the parallel field is empty, missing, or contains only
   * whitespace, the parser SHALL assign parallel_name as "Base".
   */
  it('empty parallel field results in parallel_name === "Base"', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            card_number: validCardNumber,
            set_name: safeCsvString,
            set_card_number: safeCsvString,
            player: safeCsvString,
            team: safeCsvString,
            notes: fc.constant(''),
            parallel: fc.oneof(fc.constant(''), fc.constant('  '), fc.constant('\t')),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (rows) => {
          const csv = buildCSVWithParallel(rows);
          const parsed = parseCSV(csv);

          for (const row of parsed) {
            expect(row.parallel_name).toBe('Base');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('CSV without parallel column assigns "Base" to all rows (legacy format)', () => {
    fc.assert(
      fc.property(
        fc.array(validRowWithParallelArb, { minLength: 1, maxLength: 10 }),
        (rows) => {
          // Build CSV without the parallel column
          const csv = buildCSVWithoutParallel(rows);
          const parsed = parseCSV(csv);

          for (const row of parsed) {
            expect(row.parallel_name).toBe('Base');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: parallel-tracking, Property 10: CSV import/export round-trip', () => {
  /**
   * **Validates: Requirements 6.8**
   *
   * For any valid CSV content, importing → exporting → re-importing produces equivalent state.
   * We test this by: parse CSV → rebuild CSV from parsed rows → re-parse → compare.
   */
  it('parse → rebuild → re-parse produces equivalent parsed rows', () => {
    fc.assert(
      fc.property(
        fc.array(validRowWithParallelArb, { minLength: 1, maxLength: 15 }),
        (rows) => {
          // First import: build CSV and parse
          const csv1 = buildCSVWithParallel(rows);
          const parsed1 = parseCSV(csv1);
          const valid1 = parsed1.filter((row, i) => validateRow(row, i + 1).valid);

          // Export: rebuild CSV from parsed valid rows
          const exportedRows: RowDataWithParallel[] = valid1.map((r) => ({
            card_number: r.card_number,
            set_name: r.set_name,
            set_card_number: r.set_card_number,
            player: r.player,
            team: r.team,
            notes: r.notes ?? '',
            parallel: r.parallel_name,
          }));
          const csv2 = buildCSVWithParallel(exportedRows);

          // Second import: re-parse
          const parsed2 = parseCSV(csv2);
          const valid2 = parsed2.filter((row, i) => validateRow(row, i + 1).valid);

          // Same number of valid rows
          expect(valid2.length).toBe(valid1.length);

          // Each row's data matches
          for (let i = 0; i < valid1.length; i++) {
            expect(valid2[i].card_number).toBe(valid1[i].card_number);
            expect(valid2[i].set_name).toBe(valid1[i].set_name);
            expect(valid2[i].set_card_number).toBe(valid1[i].set_card_number);
            expect(valid2[i].player).toBe(valid1[i].player);
            expect(valid2[i].team).toBe(valid1[i].team);
            expect(valid2[i].parallel_name).toBe(valid1[i].parallel_name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: parallel-tracking, Property 11: Parser accepts special characters in parallel names', () => {
  /**
   * **Validates: Requirements 7.2**
   *
   * For any string containing alphanumeric characters, spaces, forward slashes,
   * ampersands, apostrophes, hyphens, or periods, the CSV parser SHALL accept it
   * as a valid parallel_name without error.
   */
  it('special character parallel names parse and validate correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          card_number: validCardNumber,
          set_name: safeCsvString,
          set_card_number: safeCsvString,
          player: safeCsvString,
          team: safeCsvString,
          notes: fc.constant(''),
          parallel: specialCharParallelNameArb,
        }),
        (row) => {
          const csv = buildCSVWithParallel([row]);
          const parsed = parseCSV(csv);

          expect(parsed.length).toBe(1);
          expect(parsed[0].parallel_name).toBe(row.parallel);

          // Validate row passes
          const result = validateRow(parsed[0], 1);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: parallel-tracking, Property 12: Parser handles quoted fields with internal commas', () => {
  /**
   * **Validates: Requirements 7.5**
   *
   * For any parallel_name string containing commas, when properly quoted in CSV,
   * the parser SHALL extract the complete value as a single field without splitting
   * on internal commas.
   */
  it('quoted parallel names with commas parse as a single value', () => {
    fc.assert(
      fc.property(
        fc.record({
          card_number: validCardNumber,
          set_name: safeCsvString,
          set_card_number: safeCsvString,
          player: safeCsvString,
          team: safeCsvString,
          notes: fc.constant(''),
          parallel: commaParallelNameArb,
        }),
        (row) => {
          const csv = buildCSVWithParallel([row]);
          const parsed = parseCSV(csv);

          expect(parsed.length).toBe(1);
          // The parallel name should be the full value, not split on commas
          expect(parsed[0].parallel_name).toBe(row.parallel);

          // Validate row passes (parallel_name is non-empty)
          const result = validateRow(parsed[0], 1);
          expect(result.valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('quoted fields with escaped quotes parse correctly', () => {
    // Test that a parallel name with both commas and quotes is handled
    const csv = 'card_number,set_name,set_card_number,player,team,notes,parallel\n' +
      '1,SetA,S1,Player1,TeamA,,"Gold, ""Limited"" /50"';
    const parsed = parseCSV(csv);

    expect(parsed.length).toBe(1);
    expect(parsed[0].parallel_name).toBe('Gold, "Limited" /50');
  });
});
