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
    parallel_name: 'Blue Voltage',
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

  it('shows base toggle button reading from card.collected', () => {
    const props = defaultProps();
    props.card = makeCard({ collected: true });
    render(<CardRowMobile {...props} />);

    expect(
      screen.getByRole('button', { name: 'Mark base as uncollected' })
    ).toBeInTheDocument();
  });

  it('shows uncollected state when card.collected is false', () => {
    const props = defaultProps();
    props.card = makeCard({ collected: false });
    render(<CardRowMobile {...props} />);

    expect(
      screen.getByRole('button', { name: 'Mark base as collected' })
    ).toBeInTheDocument();
  });

  it('shows parallels dropdown trigger with collected count', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    // All parallels: Blue Voltage (uncollected) + Gold /50 (uncollected) = 0/2
    expect(
      screen.getByRole('button', { name: /0 of 2 parallels collected/i })
    ).toBeInTheDocument();
  });

  it('base toggle always calls onToggleCollected', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark base as/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleCollected).toHaveBeenCalledWith(props.card);
    expect(props.onToggleParallel).not.toHaveBeenCalled();
  });

  it('base toggle calls onToggleCollected even when parallels exist', () => {
    const props = defaultProps();
    props.parallels = [
      makeParallel({ id: 'p-2', parallel_name: 'Blue Voltage', collected: false }),
      makeParallel({ id: 'p-3', parallel_name: 'Gold /50', collected: true }),
    ];
    render(<CardRowMobile {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark base as/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleCollected).toHaveBeenCalledWith(props.card);
    expect(props.onToggleParallel).not.toHaveBeenCalled();
  });

  it('does not toggle base when isToggling is true', () => {
    const props = defaultProps();
    props.isToggling = true;
    render(<CardRowMobile {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark base as/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleCollected).not.toHaveBeenCalled();
    expect(props.onToggleParallel).not.toHaveBeenCalled();
  });

  it('shows reduced opacity when isToggling is true', () => {
    const props = defaultProps();
    props.isToggling = true;
    const { container } = render(<CardRowMobile {...props} />);

    const mobileCard = container.firstElementChild;
    expect(mobileCard).toHaveClass('opacity-50');
  });

  it('clicking parallels dropdown opens variant list', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    const dropdownBtn = screen.getByRole('button', { name: /0 of 2 parallels collected/i });
    fireEvent.click(dropdownBtn);

    // Should show all parallels in the dropdown
    expect(screen.getByText('Blue Voltage')).toBeInTheDocument();
    expect(screen.getByText('Gold /50')).toBeInTheDocument();
  });

  it('toggling a parallel in the dropdown calls onToggleParallel', () => {
    const props = defaultProps();
    render(<CardRowMobile {...props} />);

    // Open dropdown
    const dropdownBtn = screen.getByRole('button', { name: /0 of 2 parallels collected/i });
    fireEvent.click(dropdownBtn);

    // Click on "Blue Voltage"
    const blueVoltageBtn = screen.getByRole('option', { name: 'Blue Voltage' });
    fireEvent.click(blueVoltageBtn);

    expect(props.onToggleParallel).toHaveBeenCalledWith(
      expect.objectContaining({ parallel_name: 'Blue Voltage' })
    );
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

  it('shows base toggle reading from card.collected', () => {
    const props = defaultProps();
    props.card = makeCard({ collected: true });
    renderInTable(<CardRowDesktop {...props} />);

    expect(
      screen.getByRole('button', { name: 'Mark base as uncollected' })
    ).toBeInTheDocument();
  });

  it('shows parallels dropdown with collected count for all parallels', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    // All parallels: Blue Voltage (uncollected) + Gold /50 (uncollected) = 0/2
    expect(
      screen.getByRole('button', { name: /0 of 2 parallels collected/i })
    ).toBeInTheDocument();
  });

  it('clicking parallels dropdown opens variant list', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    const dropdownBtn = screen.getByRole('button', { name: /0 of 2 parallels collected/i });
    fireEvent.click(dropdownBtn);

    expect(screen.getByText('Blue Voltage')).toBeInTheDocument();
    expect(screen.getByText('Gold /50')).toBeInTheDocument();
  });

  it('base toggle always calls onToggleCollected', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark base as/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleCollected).toHaveBeenCalledWith(props.card);
    expect(props.onToggleParallel).not.toHaveBeenCalled();
  });

  it('base toggle calls onToggleCollected even when parallels exist', () => {
    const props = defaultProps();
    props.parallels = [
      makeParallel({ id: 'p-2', parallel_name: 'Blue Voltage', collected: false }),
    ];
    renderInTable(<CardRowDesktop {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark base as/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleCollected).toHaveBeenCalledWith(props.card);
    expect(props.onToggleParallel).not.toHaveBeenCalled();
  });

  it('does not toggle base when isToggling is true', () => {
    const props = defaultProps();
    props.isToggling = true;
    renderInTable(<CardRowDesktop {...props} />);

    const toggleBtn = screen.getByRole('button', { name: /mark base as/i });
    fireEvent.click(toggleBtn);

    expect(props.onToggleCollected).not.toHaveBeenCalled();
    expect(props.onToggleParallel).not.toHaveBeenCalled();
  });

  it('toggling a parallel in the dropdown calls onToggleParallel', () => {
    const props = defaultProps();
    renderInTable(<CardRowDesktop {...props} />);

    // Open dropdown
    const dropdownBtn = screen.getByRole('button', { name: /0 of 2 parallels collected/i });
    fireEvent.click(dropdownBtn);

    // Click on "Gold /50"
    const goldBtn = screen.getByRole('option', { name: 'Gold /50' });
    fireEvent.click(goldBtn);

    expect(props.onToggleParallel).toHaveBeenCalledWith(
      expect.objectContaining({ parallel_name: 'Gold /50' })
    );
  });

  it('shows dash when no parallels exist', () => {
    const props = defaultProps();
    props.parallels = [];
    renderInTable(<CardRowDesktop {...props} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
