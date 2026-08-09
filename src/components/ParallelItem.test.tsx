import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ParallelItem } from './ParallelItem';
import type { CardParallel } from '../types';

function makeParallel(overrides: Partial<CardParallel> = {}): CardParallel {
  return {
    id: 'p-1',
    card_id: 'c-1',
    parallel_name: 'Base',
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ParallelItem', () => {
  it('renders the parallel_name text', () => {
    const parallel = makeParallel({ parallel_name: 'Blue Voltage' });
    render(<ParallelItem parallel={parallel} onToggle={vi.fn()} isToggling={false} />);

    expect(screen.getByText('Blue Voltage')).toBeInTheDocument();
  });

  it('shows checkmark indicator when collected', () => {
    const parallel = makeParallel({ collected: true });
    render(<ParallelItem parallel={parallel} onToggle={vi.fn()} isToggling={false} />);

    const button = screen.getByRole('button');
    // Green checkmark has bg-green-500 class
    const checkmark = button.querySelector('.bg-green-500');
    expect(checkmark).toBeInTheDocument();
  });

  it('shows empty circle when uncollected', () => {
    const parallel = makeParallel({ collected: false });
    render(<ParallelItem parallel={parallel} onToggle={vi.fn()} isToggling={false} />);

    const button = screen.getByRole('button');
    // Empty circle has border-2 and border-gray-300 classes
    const circle = button.querySelector('.border-gray-300');
    expect(circle).toBeInTheDocument();
    // Should not have green background
    const checkmark = button.querySelector('.bg-green-500');
    expect(checkmark).not.toBeInTheDocument();
  });

  it('calls onToggle when button is clicked', () => {
    const parallel = makeParallel();
    const onToggle = vi.fn();
    render(<ParallelItem parallel={parallel} onToggle={onToggle} isToggling={false} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(parallel);
  });

  it('shows loading spinner when isToggling is true', () => {
    const parallel = makeParallel();
    render(<ParallelItem parallel={parallel} onToggle={vi.fn()} isToggling={true} />);

    expect(screen.getByLabelText('Toggling')).toBeInTheDocument();
  });

  it('button is disabled when isToggling', () => {
    const parallel = makeParallel();
    const onToggle = vi.fn();
    render(<ParallelItem parallel={parallel} onToggle={onToggle} isToggling={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('has appropriate aria-label on the toggle button', () => {
    const parallel = makeParallel({ parallel_name: 'Gold /50' });
    render(<ParallelItem parallel={parallel} onToggle={vi.fn()} isToggling={false} />);

    expect(
      screen.getByRole('button', { name: 'Toggle Gold /50 collected' })
    ).toBeInTheDocument();
  });

  it('button meets minimum 44x44px tap target', () => {
    const parallel = makeParallel();
    render(<ParallelItem parallel={parallel} onToggle={vi.fn()} isToggling={false} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('min-w-[44px]');
    expect(button).toHaveClass('min-h-[44px]');
  });
});
