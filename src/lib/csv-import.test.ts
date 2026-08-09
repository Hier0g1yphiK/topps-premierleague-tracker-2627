import { describe, it, expect } from 'vitest';
import { parseCSV, validateRow, processCSVFile, ParsedRow } from './csv-import';

describe('parseCSV', () => {
  it('parses a valid CSV with all fields', () => {
    const csv = `card_number,set_name,set_card_number,player,team,notes
1,Base,B1,Erling Haaland,Manchester City,Top scorer
2,Foil,F1,Bukayo Saka,Arsenal,`;

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      card_number: '1',
      set_name: 'Base',
      set_card_number: 'B1',
      player: 'Erling Haaland',
      team: 'Manchester City',
      notes: 'Top scorer',
      parallel_name: 'Base',
    });
    expect(rows[1]).toEqual({
      card_number: '2',
      set_name: 'Foil',
      set_card_number: 'F1',
      player: 'Bukayo Saka',
      team: 'Arsenal',
      notes: null,
      parallel_name: 'Base',
    });
  });

  it('returns empty array for empty content', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('returns empty array for header-only CSV', () => {
    const csv = 'card_number,set_name,set_card_number,player,team,notes';
    expect(parseCSV(csv)).toEqual([]);
  });

  it('handles quoted fields with commas', () => {
    const csv = `card_number,set_name,set_card_number,player,team,notes
1,Base,B1,"Last, First",Manchester City,"Some, notes"`;

    const rows = parseCSV(csv);
    expect(rows[0].player).toBe('Last, First');
    expect(rows[0].notes).toBe('Some, notes');
  });

  it('handles quoted fields with escaped quotes', () => {
    const csv = `card_number,set_name,set_card_number,player,team,notes
1,Base,B1,Player,Team,"He said ""hello"""`;

    const rows = parseCSV(csv);
    expect(rows[0].notes).toBe('He said "hello"');
  });

  it('handles Windows-style line endings', () => {
    const csv = "card_number,set_name,set_card_number,player,team,notes\r\n1,Base,B1,Player,Team,Note\r\n";

    const rows = parseCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].card_number).toBe('1');
  });
});

describe('validateRow', () => {
  const validRow: ParsedRow = {
    card_number: '42',
    set_name: 'Base',
    set_card_number: 'B1',
    player: 'Erling Haaland',
    team: 'Manchester City',
    notes: null,
    parallel_name: 'Base',
  };

  it('accepts a valid row', () => {
    const result = validateRow(validRow, 1);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects missing card_number', () => {
    const result = validateRow({ ...validRow, card_number: '' }, 1);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 1, reason: 'card_number is required' });
  });

  it('rejects whitespace-only card_number', () => {
    const result = validateRow({ ...validRow, card_number: '   ' }, 2);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 2, reason: 'card_number is required' });
  });

  it('rejects non-integer card_number', () => {
    const result = validateRow({ ...validRow, card_number: '3.5' }, 3);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 3, reason: 'card_number must be a positive integer' });
  });

  it('rejects zero card_number', () => {
    const result = validateRow({ ...validRow, card_number: '0' }, 4);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 4, reason: 'card_number must be a positive integer' });
  });

  it('rejects negative card_number', () => {
    const result = validateRow({ ...validRow, card_number: '-1' }, 5);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 5, reason: 'card_number must be a positive integer' });
  });

  it('rejects non-numeric card_number', () => {
    const result = validateRow({ ...validRow, card_number: 'abc' }, 6);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 6, reason: 'card_number must be a positive integer' });
  });

  it('rejects empty set_name', () => {
    const result = validateRow({ ...validRow, set_name: '' }, 7);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 7, reason: 'set_name is required' });
  });

  it('rejects whitespace-only set_name', () => {
    const result = validateRow({ ...validRow, set_name: '   ' }, 8);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 8, reason: 'set_name is required' });
  });

  it('rejects empty player', () => {
    const result = validateRow({ ...validRow, player: '' }, 9);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 9, reason: 'player is required' });
  });

  it('rejects whitespace-only player', () => {
    const result = validateRow({ ...validRow, player: '   ' }, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 10, reason: 'player is required' });
  });

  it('rejects empty set_card_number', () => {
    const result = validateRow({ ...validRow, set_card_number: '' }, 11);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual({ row: 11, reason: 'set_card_number is required' });
  });

  it('accepts alphanumeric set_card_number', () => {
    const result = validateRow({ ...validRow, set_card_number: 'A12b' }, 12);
    expect(result.valid).toBe(true);
  });

  it('does not reject for missing team (optional)', () => {
    const result = validateRow({ ...validRow, team: '' }, 13);
    expect(result.valid).toBe(true);
  });

  it('does not reject for null notes (optional)', () => {
    const result = validateRow({ ...validRow, notes: null }, 14);
    expect(result.valid).toBe(true);
  });
});

describe('processCSVFile', () => {
  function createFile(content: string, name = 'cards.csv', type = 'text/csv'): File {
    return new File([content], name, { type });
  }

  it('processes a valid CSV file', async () => {
    const csv = `card_number,set_name,set_card_number,player,team,notes
1,Base,B1,Player One,Team A,Note
2,Foil,F2,Player Two,Team B,`;

    const result = await processCSVFile(createFile(csv));
    expect(result.validRows).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects non-CSV file by type', async () => {
    const result = await processCSVFile(
      createFile('not csv', 'image.png', 'image/png')
    );
    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toBe('File is not a valid CSV');
  });

  it('accepts CSV file by extension even without correct MIME type', async () => {
    const csv = `card_number,set_name,set_card_number,player,team,notes
1,Base,B1,Player,Team,`;

    const result = await processCSVFile(createFile(csv, 'data.csv', ''));
    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it('returns info message for header-only CSV', async () => {
    const csv = 'card_number,set_name,set_card_number,player,team,notes';
    const result = await processCSVFile(createFile(csv));
    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toBe('No cards found in file');
  });

  it('separates valid rows and error rows', async () => {
    const csv = `card_number,set_name,set_card_number,player,team,notes
1,Base,B1,Valid Player,Team A,
abc,Base,B2,Another Player,Team B,
3,,B3,Third Player,Team C,`;

    const result = await processCSVFile(createFile(csv));
    expect(result.validRows).toHaveLength(1);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].reason).toBe('card_number must be a positive integer');
    expect(result.errors[1].reason).toBe('set_name is required');
  });

  it('rejects file with missing required headers', async () => {
    const csv = `card_number,player
1,Player One`;

    const result = await processCSVFile(createFile(csv));
    expect(result.validRows).toHaveLength(0);
    expect(result.errors[0].reason).toBe('File is not a valid CSV');
  });
});
