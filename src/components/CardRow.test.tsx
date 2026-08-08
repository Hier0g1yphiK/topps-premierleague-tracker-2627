import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardRowDesktop, CardRowMobile } from './CardRow';
import type { Card } from '../types';

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

describe('CardRowMobile', () => {
  it('renders card data for an uncollected card', () => {
    const card = makeCard();
    render(<CardRowMobile card={card} onToggleCollected={vi.fn()} isToggling={false} />);

    expect(screen.getByText(/Bukayo Saka/)).toBeInTheDocument();
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText(/Premium/)).toBeInTheDocument();
  });

  it('shows green background for collected cards', () => {
    const card = makeCard({ collected: true });
    const { container } = render(
      <CardRowMobile card={card} onToggleCollected={vi.fn()} isToggling={false} />
    );

    const mobileCard = container.firstElementChild;
    expect(mobileCard).toHaveClass('bg-green-50');
  });

  it('shows white/default background for uncollected cards', () => {
    const card = makeCard({ collected: false });
    const { container } = render(
      <CardRowMobile card={card} onToggleCollected={vi.fn()} isToggling={false} />
    );

    const mobileCard = container.firstElementChild;
    expect(mobileCard).toHaveClass('bg-white');
  });

  it('calls onToggleCollected when button is clicked', () => {
    const card = makeCard();
    const onToggle = vi.fn();
    render(<CardRowMobile card={card} onToggleCollected={onToggle} isToggling={false} />);

    const button = screen.getByRole('button', { name: /mark as collected/i });
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(card);
  });

  it('does not call onToggleCollected when isToggling is true', () => {
    const card = makeCard();
    const onToggle = vi.fn();
    render(<CardRowMobile card={card} onToggleCollected={onToggle} isToggling={true} />);

    const button = screen.getByRole('button', { name: /mark as collected/i });
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows reduced opacity when isToggling', () => {
    const card = makeCard();
    const { container } = render(
      <CardRowMobile card={card} onToggleCollected={vi.fn()} isToggling={true} />
    );

    const mobileCard = container.firstElementChild;
    expect(mobileCard).toHaveClass('opacity-50');
  });

  it('has accessible aria-label for toggle action', () => {
    const uncollected = makeCard({ collected: false });
    const { rerender } = render(
      <CardRowMobile card={uncollected} onToggleCollected={vi.fn()} isToggling={false} />
    );

    expect(screen.getByRole('button', { name: 'Mark as collected' })).toBeInTheDocument();

    const collected = makeCard({ collected: true });
    rerender(<CardRowMobile card={collected} onToggleCollected={vi.fn()} isToggling={false} />);

    expect(screen.getByRole('button', { name: 'Mark as uncollected' })).toBeInTheDocument();
  });

  it('ensures tap target is at least 44x44px', () => {
    const card = makeCard();
    render(<CardRowMobile card={card} onToggleCollected={vi.fn()} isToggling={false} />);

    const button = screen.getByRole('button', { name: /mark as collected/i });
    expect(button).toHaveClass('min-w-[44px]');
    expect(button).toHaveClass('min-h-[44px]');
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
    const card = makeCard();
    renderInTable(<CardRowDesktop card={card} onToggleCollected={vi.fn()} isToggling={false} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('P-7')).toBeInTheDocument();
    expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
  });

  it('shows green background for collected cards', () => {
    const card = makeCard({ collected: true });
    renderInTable(<CardRowDesktop card={card} onToggleCollected={vi.fn()} isToggling={false} />);

    const row = screen.getByRole('button');
    expect(row).toHaveClass('bg-green-50');
  });

  it('shows default background for uncollected cards', () => {
    const card = makeCard({ collected: false });
    renderInTable(<CardRowDesktop card={card} onToggleCollected={vi.fn()} isToggling={false} />);

    const row = screen.getByRole('button');
    expect(row).toHaveClass('bg-white');
  });

  it('calls onToggleCollected when row is clicked', () => {
    const card = makeCard();
    const onToggle = vi.fn();
    renderInTable(<CardRowDesktop card={card} onToggleCollected={onToggle} isToggling={false} />);

    const row = screen.getByRole('button');
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledWith(card);
  });

  it('does not call onToggleCollected when isToggling is true', () => {
    const card = makeCard();
    const onToggle = vi.fn();
    renderInTable(<CardRowDesktop card={card} onToggleCollected={onToggle} isToggling={true} />);

    const row = screen.getByRole('button');
    fireEvent.click(row);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows reduced opacity when isToggling', () => {
    const card = makeCard();
    renderInTable(<CardRowDesktop card={card} onToggleCollected={vi.fn()} isToggling={true} />);

    const row = screen.getByRole('button');
    expect(row).toHaveClass('opacity-50');
  });

  it('has accessible aria-label for toggle action', () => {
    const card = makeCard({ collected: false });
    renderInTable(<CardRowDesktop card={card} onToggleCollected={vi.fn()} isToggling={false} />);

    expect(screen.getByRole('button', { name: 'Mark as collected' })).toBeInTheDocument();
  });

  it('responds to keyboard Enter to toggle', () => {
    const card = makeCard();
    const onToggle = vi.fn();
    renderInTable(<CardRowDesktop card={card} onToggleCollected={onToggle} isToggling={false} />);

    const row = screen.getByRole('button');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledWith(card);
  });
});
