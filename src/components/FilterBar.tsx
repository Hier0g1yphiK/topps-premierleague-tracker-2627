import { useState, useEffect } from 'react';
import type { FilterState } from '../types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface FilterBarProps {
  setNames: string[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterBar({ setNames, filters, onFilterChange }: FilterBarProps) {
  const [localSearchText, setLocalSearchText] = useState(filters.searchText);
  const debouncedSearchText = useDebouncedValue(localSearchText, 300);

  // Sync local search text when external filters change (e.g. reset)
  useEffect(() => {
    setLocalSearchText(filters.searchText);
  }, [filters.searchText]);

  // Fire onFilterChange when debounced search text changes
  useEffect(() => {
    if (debouncedSearchText !== filters.searchText) {
      onFilterChange({ ...filters, searchText: debouncedSearchText });
    }
  }, [debouncedSearchText]);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocalSearchText(e.target.value.slice(0, 100));
  }

  function handleSetNameChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    onFilterChange({ ...filters, setName: value === '' ? null : value });
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    onFilterChange({
      ...filters,
      collectedStatus: e.target.value as FilterState['collectedStatus'],
    });
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
      <input
        type="text"
        value={localSearchText}
        onChange={handleSearchChange}
        maxLength={100}
        placeholder="Search by player or team..."
        aria-label="Search by player or team"
        className="w-full md:flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      />

      <select
        value={filters.setName ?? ''}
        onChange={handleSetNameChange}
        aria-label="Filter by set"
        className="w-full md:w-48 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        <option value="">All Sets</option>
        {setNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={filters.collectedStatus}
        onChange={handleStatusChange}
        aria-label="Filter by collected status"
        className="w-full md:w-40 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
      >
        <option value="all">All</option>
        <option value="collected">Collected</option>
        <option value="missing">Missing</option>
      </select>
    </div>
  );
}
