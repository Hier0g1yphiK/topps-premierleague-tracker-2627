import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deriveCardCollectedStatus } from '../parallel-filters';
import type { CardParallel } from '../../types';

/**
 * Feature: parallel-tracking, Property 3: Card-level status derivation from Base parallel
 * Validates: Requirements 4.1, 4.2, 4.4
 *
 * For any Card with associated parallels, the card-level collected status SHALL be
 * true if and only if a parallel named "Base" exists for that card AND that parallel
 * has collected === true. In all other cases (no Base parallel, or Base parallel with
 * collected === false), the card-level status SHALL be false.
 */

// --- Arbitraries ---

const isoDateArbitrary = fc.integer({ min: 1704067200000, max: 1830297600000 }).map(
  (ts) => new Date(ts).toISOString().split('T')[0]
);

const isoTimestampArbitrary = fc.integer({ min: 1704067200000, max: 1830297600000 }).map(
  (ts) => new Date(ts).toISOString()
);

/** Generates realistic parallel names excluding "Base" */
const nonBaseParallelNameArbitrary = fc.oneof(
  fc.constant('Blue Voltage'),
  fc.constant('Gold /50'),
  fc.constant('FoilFractor 1/1'),
  fc.constant('Aqua Sparkle /499'),
  fc.constant('Black & White /75'),
  fc.constant('Red Orbit'),
  fc.constant('Purple /150'),
  fc.constant('Silver'),
  fc.constant('Green Shimmer /99'),
  fc.constant('base'),  // lowercase — should NOT be treated as "Base"
  fc.constant('BASE'),  // uppercase — should NOT be treated as "Base"
  fc.constant('BÀSE'),  // accented — should NOT be treated as "Base"
);

/** Generates a CardParallel with a specified parallel_name */
function arbCardParallel(parallelName: fc.Arbitrary<string>): fc.Arbitrary<CardParallel> {
  return fc.record({
    id: fc.uuid(),
    card_id: fc.uuid(),
    parallel_name: parallelName,
    collected: fc.boolean(),
    date_collected: fc.option(isoDateArbitrary, { nil: null }),
    created_at: isoTimestampArbitrary,
  });
}

/** Generates a "Base" parallel with explicit collected value */
function arbBaseParallel(collected: boolean): fc.Arbitrary<CardParallel> {
  return fc.record({
    id: fc.uuid(),
    card_id: fc.uuid(),
    parallel_name: fc.constant('Base'),
    collected: fc.constant(collected),
    date_collected: collected
      ? isoDateArbitrary.map((d) => d as string | null)
      : fc.constant(null as string | null),
    created_at: isoTimestampArbitrary,
  });
}

/** Generates an array of non-Base parallels */
const nonBaseParallelsArbitrary = fc.array(arbCardParallel(nonBaseParallelNameArbitrary), {
  minLength: 0,
  maxLength: 10,
});

// --- Property Tests ---

describe('Feature: parallel-tracking, Property 3: Card-level status derivation from Base parallel', () => {
  it('returns true when "Base" parallel exists and is collected', () => {
    /**
     * Validates: Requirements 4.1
     */
    fc.assert(
      fc.property(
        arbBaseParallel(true),
        nonBaseParallelsArbitrary,
        fc.nat({ max: 20 }),
        (baseParallel, otherParallels, insertionIndex) => {
          // Insert Base parallel at a random position among others
          const parallels = [...otherParallels];
          const idx = insertionIndex % (parallels.length + 1);
          parallels.splice(idx, 0, baseParallel);

          const result = deriveCardCollectedStatus(parallels);
          expect(result).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns false when "Base" parallel exists but is not collected', () => {
    /**
     * Validates: Requirements 4.2
     */
    fc.assert(
      fc.property(
        arbBaseParallel(false),
        nonBaseParallelsArbitrary,
        fc.nat({ max: 20 }),
        (baseParallel, otherParallels, insertionIndex) => {
          // Insert uncollected Base parallel at a random position
          const parallels = [...otherParallels];
          const idx = insertionIndex % (parallels.length + 1);
          parallels.splice(idx, 0, baseParallel);

          const result = deriveCardCollectedStatus(parallels);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns false when no "Base" parallel exists, regardless of other parallels status', () => {
    /**
     * Validates: Requirements 4.2
     */
    fc.assert(
      fc.property(nonBaseParallelsArbitrary, (parallels) => {
        // Ensure no parallel has exactly the name "Base"
        const noBase = parallels.filter((p) => p.parallel_name !== 'Base');

        const result = deriveCardCollectedStatus(noBase);
        expect(result).toBe(false);
      }),
      { numRuns: 200 }
    );
  });

  it('is case-sensitive: only "Base" (exact) triggers true, not "base" or "BASE"', () => {
    /**
     * Validates: Requirements 4.1, 4.2
     *
     * Ensures the function ONLY considers "Base" (case-sensitive), not "base" or "BASE".
     */
    const caseMismatchNames = fc.oneof(
      fc.constant('base'),
      fc.constant('BASE'),
      fc.constant('bAsE'),
      fc.constant('basE'),
      fc.constant('Base '),   // trailing space
      fc.constant(' Base'),   // leading space
    );

    fc.assert(
      fc.property(
        arbCardParallel(caseMismatchNames).map((p) => ({ ...p, collected: true })),
        nonBaseParallelsArbitrary,
        (wrongCaseParallel, otherParallels) => {
          // Create parallels array with the wrong-case "base" (collected) and no exact "Base"
          const parallels = [wrongCaseParallel, ...otherParallels].filter(
            (p) => p.parallel_name !== 'Base'
          );

          const result = deriveCardCollectedStatus(parallels);
          expect(result).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('result is true iff "Base" parallel exists and is collected (biconditional)', () => {
    /**
     * Validates: Requirements 4.1, 4.2, 4.4
     *
     * Universal biconditional property: for any array of parallels (with at most one "Base"
     * entry, reflecting the database unique constraint), the result is true if and only if
     * a parallel with parallel_name === "Base" and collected === true exists.
     */
    const maybeBaseParallel = fc.option(
      fc.record({
        id: fc.uuid(),
        card_id: fc.uuid(),
        parallel_name: fc.constant('Base'),
        collected: fc.boolean(),
        date_collected: fc.option(isoDateArbitrary, { nil: null }),
        created_at: isoTimestampArbitrary,
      }),
      { nil: undefined }
    );

    fc.assert(
      fc.property(
        nonBaseParallelsArbitrary,
        maybeBaseParallel,
        fc.nat({ max: 20 }),
        (otherParallels, baseParallel, insertionIndex) => {
          // Build parallels with at most one "Base" entry (mirrors DB unique constraint)
          const parallels = otherParallels.filter((p) => p.parallel_name !== 'Base');

          if (baseParallel !== undefined) {
            const idx = insertionIndex % (parallels.length + 1);
            parallels.splice(idx, 0, baseParallel);
          }

          const result = deriveCardCollectedStatus(parallels);

          const hasCollectedBase =
            baseParallel !== undefined && baseParallel.collected === true;

          expect(result).toBe(hasCollectedBase);
        }
      ),
      { numRuns: 200 }
    );
  });
});
