import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardRowDesktop, CardRowMobile } from './CardRow';
import type { Card, CardParallel } from '../types';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    user_id: null,
    card_number: 42,
    set_name: 'Premium',
    set_card_number: 'P-7',
    player: 'Bukayo Saka',
    team: 'Arsenal',
    notes: null,
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeParallel(overrides: Partial<CardParallel> = {}): CardParallel {
  return {
    id: 'parallel-1',
    card_id: 'card-1',
    parallel_name: 'Base',
    collected: false,
    date_collected: null,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const defaultProps = () => ({
  card: makeCard(),
  onToggleCollected: vi.fn(),
  isToggling: false,
  parallels: [
    makeParallel({ id: 'p-1', parallel_name: 'Base', collected: true }),
    makeParallel({ id: 'p-2', parallel_name: 'Blue Voltage', collected: false }),
    makeParallel({ id: 'p-3', parallel_name: 'Gold /50', collected: false }),
  ],
  onToggleParallel: vi.fn(),
  togglingParallelIds: new Set<string>(),
});

describe('CardRowMobile', () => {
  it('renders card data', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    expect(screen.getByText(/Bukayo Saka/)).toBeInTheDocument();
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText(/Premium/)).toBeInTheDocument();
  });

  it('shows parallel count indicator (e.g., "Parallels: 1/3")', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    expect(screen.getByText('Parallels: 1/3')).toBeInTheDocument();
  });

  it('shows expand button with correct aria-label', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    const expandBtn = screen.getByRole('button', { name: 'Expand parallels' });
    expect(expandBtn).toBeInTheDocument();
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking expand shows ParallelPanel and updates aria', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    const expandBtn = screen.getByRole('button', { name: 'Expand parallels' });
    fireEvent.click(expandBtn);

    // After expand, button label changes
    const collapseBtn = screen.getByRole('button', { name: 'Collapse parallels' });
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

    // ParallelPanel renders with region role
    expect(screen.getByRole('region', { name: 'Parallel variants' })).toBeInTheDocument();
  });

  it('card-level toggle delegates to Base parallel when one exists', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark as collected/i });
    fireEvent.click(toggleBtn);

    // Should call onToggleParallel with the Base parallel, not onToggleCollected
    expect(props.onToggleParallel).toHaveBeenCalledWith(
      expect.objectContaining({ parallel_name: 'Base' })
    );
    expect(props.onToggleCollected).not.toHaveBeenCalled();
  });

  it('card-level toggle calls onToggleCollected when no Base parallel exists', () => {
    const props = defaultProps();
    props.parallels = [
      makeParallel({ id: 'p-2', parallel_name: 'Blue Voltage', collected: false }),
      makeParallel({ id: 'p-3', parallel_name: 'Gold /50', collected: true }),
    ];
    render(<CardRowMobile {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark as collected/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleCollected).toHaveBeenCalledWith(props.card);
    expect(props.onToggleParallel).not.toHaveBeenCalled();
  });

  it('does not toggle when isToggling is true', () => {
    const props = defaultProps();
    props.isToggling = true;
    render(<CardRowMobile {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark as collected/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleParallel).not.toHaveBeenCalled();
    expect(props.onToggleCollected).not.toHaveBeenCalled();
  });

  it('shows reduced opacity when isToggling', () => {
    const props = defaultProps();
    props.isToggling = true;
    const { container } = render(<CardRowMobile {...props} />);

    const mobileCard = container.firstElementChild;
    expect(mobileCard).toHaveClass('opacity-50');
  });
});

describe('CardRowDesktop', () => {
  function renderInTable(ui: React.ReactElement) {
    return render(
      <table>
        <tbody>{ui}</tbody>
      </table>
    );
  }

  it('renders card data in table cells', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('P-7')).toBeInTheDocument();
    expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
  });

  it('shows parallel count (e.g., "1/3")', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('shows expand button with correct aria-label', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    const expandBtn = screen.getByRole('button', { name: 'Expand parallels' });
    expect(expandBtn).toBeInTheDocument();
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking expand button shows parallel panel', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    const expandBtn = screen.getByRole('button', { name: 'Expand parallels' });
    fireEvent.click(expandBtn);

    const collapseBtn = screen.getByRole('button', { name: 'Collapse parallels' });
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

    expect(screen.getByRole('region', { name: 'Parallel variants' })).toBeInTheDocument();
  });

  it('card-level toggle delegates to Base parallel', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark as collected/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleParallel).toHaveBeenCalledWith(
      expect.objectContaining({ parallel_name: 'Base' })
    );
    expect(props.onToggleCollected).not.toHaveBeenCalled();
  });

  it('card-level toggle falls back to onToggleCollected without Base parallel', () => {
    const props = defaultProps();
    props.parallels = [
      makeParallel({ id: 'p-2', parallel_name: 'Blue Voltage', collected: false }),
    ];
    renderInTable(<CardRowDesktop {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark as collected/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleCollected).toHaveBeenCalledWith(props.card);
    expect(props.onToggleParallel).not.toHaveBeenCalled();
  });

  it('has keyboard accessible expand (Enter key on button)', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    const expandBtn = screen.getByRole('button', { name: 'Expand parallels' });
    fireEvent.keyDown(expandBtn, { key: 'Enter' });

    expect(screen.getByRole('button', { name: 'Collapse parallels' })).toBeInTheDocument();
  });

  it('has keyboard accessible expand (Space key on button)', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    const expandBtn = screen.getByRole('button', { name: 'Expand parallels' });
    fireEvent.keyDown(expandBtn, { key: ' ' });

    expect(screen.getByRole('button', { name: 'Collapse parallels' })).toBeInTheDocument();
  });

  it('does not toggle when isToggling is true', () => {
    const props = defaultProps();
    props.isToggling = true;
    renderInTable(<CardRowDesktop {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark as collected/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleParallel).not.toHaveBeenCalled();
    expect(props.onToggleCollected).not.toHaveBeenCalled();
  });
});
