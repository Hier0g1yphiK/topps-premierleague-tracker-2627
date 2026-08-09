import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportModal } from './ImportModal';

// Mock supabase - dynamically returns data based on upsert input
const mockSelect = vi.fn();
const mockUpsert = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Mock csv-import
vi.mock('../lib/csv-import', () => ({
  processCSVFile: vi.fn(),
}));

import { processCSVFile } from '../lib/csv-import';

const mockProcessCSVFile = vi.mocked(processCSVFile);

describe('ImportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onImportComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: mock returns all records as inserted
    mockSelect.mockResolvedValue({ data: [{ id: '1' }], error: null });
  });

  it('does not render when isOpen is false', () => {
    render(<ImportModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal with title and file input when isOpen is true', () => {
    render(<ImportModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Import Cards from CSV')).toBeInTheDocument();
    expect(screen.getByLabelText('Choose CSV file to import')).toBeInTheDocument();
  });

  it('restricts file input to .csv files', () => {
    render(<ImportModal {...defaultProps} />);
    const input = screen.getByLabelText('Choose CSV file to import');
    expect(input).toHaveAttribute('accept', '.csv');
  });

  it('has an accessible close button', () => {
    render(<ImportModal {...defaultProps} />);
    expect(screen.getByLabelText('Close import modal')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ImportModal {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Close import modal'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner during processing', async () => {
    mockProcessCSVFile.mockImplementation(
      () => new Promise(() => {}) // never resolves to keep processing state
    );

    render(<ImportModal {...defaultProps} />);
    const input = screen.getByLabelText('Choose CSV file to import');

    const file = new File(['card_number,set_name,set_card_number,player,team\n1,Set A,1,Player 1,Team 1'], 'cards.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Processing your CSV file...')).toBeInTheDocument();
    });
  });

  it('displays import summary after successful import', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null });
    mockProcessCSVFile.mockResolvedValue({
      validRows: [
        { card_number: '1', set_name: 'Set A', set_card_number: '1', player: 'Player 1', team: 'Team 1', notes: null },
        { card_number: '2', set_name: 'Set A', set_card_number: '2', player: 'Player 2', team: 'Team 1', notes: null },
      ],
      errors: [{ row: 3, reason: 'card_number is required' }],
    });

    render(<ImportModal {...defaultProps} />);
    const input = screen.getByLabelText('Choose CSV file to import');

    const file = new File(['content'], 'cards.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // inserted
      expect(screen.getByText('Cards Inserted')).toBeInTheDocument();
      expect(screen.getByText('Skipped')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // rejected
      expect(screen.getByText('Rejected')).toBeInTheDocument();
      expect(screen.getByText('Parallels Created')).toBeInTheDocument();
    });
  });

  it('displays per-row errors in the error list', async () => {
    mockProcessCSVFile.mockResolvedValue({
      validRows: [],
      errors: [
        { row: 1, reason: 'card_number is required' },
        { row: 3, reason: 'player is required' },
      ],
    });

    render(<ImportModal {...defaultProps} />);
    const input = screen.getByLabelText('Choose CSV file to import');

    const file = new File(['content'], 'cards.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Row 1: card_number is required')).toBeInTheDocument();
      expect(screen.getByText('Row 3: player is required')).toBeInTheDocument();
    });
  });

  it('calls onImportComplete with summary after import finishes', async () => {
    mockSelect.mockResolvedValue({ data: [{ id: '1' }], error: null });
    mockProcessCSVFile.mockResolvedValue({
      validRows: [
        { card_number: '1', set_name: 'Set A', set_card_number: '1', player: 'Player 1', team: 'Team 1', notes: null },
      ],
      errors: [],
    });

    render(<ImportModal {...defaultProps} />);
    const input = screen.getByLabelText('Choose CSV file to import');

    const file = new File(['content'], 'cards.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(defaultProps.onImportComplete).toHaveBeenCalledWith({
        inserted: 1,
        parallelsCreated: 0,
        skipped: 0,
        rejected: 0,
        errors: [],
      });
    });
  });

  it('resets to idle state when "Import Another File" is clicked', async () => {
    mockProcessCSVFile.mockResolvedValue({
      validRows: [],
      errors: [{ row: 1, reason: 'card_number is required' }],
    });

    render(<ImportModal {...defaultProps} />);
    const input = screen.getByLabelText('Choose CSV file to import');

    const file = new File(['content'], 'cards.csv', { type: 'text/csv' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Import Another File')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Another File'));
    expect(screen.getByLabelText('Choose CSV file to import')).toBeInTheDocument();
  });
});
