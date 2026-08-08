import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('Vitest setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to jsdom environment', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello';
    expect(div.textContent).toBe('Hello');
  });
});

describe('fast-check setup', () => {
  it('integer addition is commutative', () => {
    fc.assert(
      fc.property(fc.integer(), (a) => {
        const b = a + 1;
        expect(a + b).toBe(b + a);
      }),
      { numRuns: 100 }
    );
  });

  it('string concatenation length is sum of lengths', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const other = 'test';
        expect((s + other).length).toBe(s.length + other.length);
      }),
      { numRuns: 100 }
    );
  });

  it('sorting preserves array length', () => {
    fc.assert(
      fc.property(fc.array(fc.integer()), (arr) => {
        const sorted = [...arr].sort((a, b) => a - b);
        expect(sorted.length).toBe(arr.length);
      }),
      { numRuns: 100 }
    );
  });
});
