import { render, screen, fireEvent, act } from '@testing-library/react';
import { FilterBar } from './FilterBar';
import type { FilterState } from '../types';

describe('FilterBar', () => {
  const defaultFilters: FilterState = {
    searchText: '',
    setName: null,
    collectedStatus: 'all',
    parallelStatus: 'all',
  };

  const setNames = ['Base', 'Crystal', 'Foil'];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input, set dropdown, and status dropdown', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    expect(screen.getByPlaceholderText('Search by player or team...')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by set')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by collected status')).toBeInTheDocument();
  });

  it('renders set names in the dropdown with "All Sets" as default', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    const setSelect = screen.getByLabelText('Filter by set') as HTMLSelectElement;
    expect(setSelect.value).toBe('');

    const options = Array.from(setSelect.options).map((o) => o.text);
    expect(options).toEqual(['All Sets', 'Base', 'Crystal', 'Foil']);
  });

  it('renders collected status options', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    const statusSelect = screen.getByLabelText('Filter by collected status') as HTMLSelectElement;
    const options = Array.from(statusSelect.options).map((o) => o.text);
    expect(options).toEqual(['All', 'Collected', 'Missing']);
  });

  it('calls onFilterChange immediately when set name changes', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    fireEvent.change(screen.getByLabelText('Filter by set'), {
      target: { value: 'Crystal' },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      setName: 'Crystal',
    });
  });

  it('calls onFilterChange immediately when collected status changes', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    fireEvent.change(screen.getByLabelText('Filter by collected status'), {
      target: { value: 'collected' },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      collectedStatus: 'collected',
    });
  });

  it('debounces search text changes by 300ms', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    const searchInput = screen.getByPlaceholderText('Search by player or team...');
    fireEvent.change(searchInput, { target: { value: 'Salah' } });

    // Not called immediately
    expect(onFilterChange).not.toHaveBeenCalled();

    // Called after 300ms
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      searchText: 'Salah',
    });
  });

  it('enforces maxLength of 100 characters on search input', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    const searchInput = screen.getByPlaceholderText('Search by player or team...') as HTMLInputElement;
    expect(searchInput.maxLength).toBe(100);
  });

  it('sets setName to null when "All Sets" is selected', () => {
    const onFilterChange = vi.fn();
    const filtersWithSet: FilterState = {
      ...defaultFilters,
      setName: 'Crystal',
    };

    render(
      <FilterBar setNames={setNames} filters={filtersWithSet} onFilterChange={onFilterChange} />
    );

    fireEvent.change(screen.getByLabelText('Filter by set'), {
      target: { value: '' },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      ...filtersWithSet,
      setName: null,
    });
  });

  it('renders parallel status dropdown', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    expect(screen.getByLabelText('Filter by parallel status')).toBeInTheDocument();
  });

  it('renders parallel status options', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    const parallelSelect = screen.getByLabelText('Filter by parallel status') as HTMLSelectElement;
    const options = Array.from(parallelSelect.options).map((o) => o.text);
    expect(options).toEqual(['All', 'Has uncollected parallels', 'All parallels collected']);
  });

  it('calls onFilterChange when parallel status changes', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    fireEvent.change(screen.getByLabelText('Filter by parallel status'), {
      target: { value: 'has_uncollected' },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      parallelStatus: 'has_uncollected',
    });
  });

  it('calls onFilterChange with all_collected when selected', () => {
    const onFilterChange = vi.fn();
    render(
      <FilterBar setNames={setNames} filters={defaultFilters} onFilterChange={onFilterChange} />
    );

    fireEvent.change(screen.getByLabelText('Filter by parallel status'), {
      target: { value: 'all_collected' },
    });

    expect(onFilterChange).toHaveBeenCalledWith({
      ...defaultFilters,
      parallelStatus: 'all_collected',
    });
  });
});
