import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdatePrompt } from './UpdatePrompt';

describe('UpdatePrompt', () => {
  it('renders nothing when show is false', () => {
    const { container } = render(<UpdatePrompt show={false} onReload={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the update message when show is true', () => {
    render(<UpdatePrompt show={true} onReload={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('A new version of the app is available.')).toBeInTheDocument();
  });

  it('renders a Reload button', () => {
    render(<UpdatePrompt show={true} onReload={vi.fn()} />);
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  it('calls onReload when Reload button is clicked', () => {
    const onReload = vi.fn();
    render(<UpdatePrompt show={true} onReload={onReload} />);

    fireEvent.click(screen.getByRole('button', { name: /reload/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('renders a dismiss button', () => {
    render(<UpdatePrompt show={true} onReload={vi.fn()} />);
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('hides the prompt when dismiss button is clicked', () => {
    render(<UpdatePrompt show={true} onReload={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('has accessible role and aria-live attributes', () => {
    render(<UpdatePrompt show={true} onReload={vi.fn()} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('has minimum tap target sizes for buttons', () => {
    render(<UpdatePrompt show={true} onReload={vi.fn()} />);
    const reloadBtn = screen.getByRole('button', { name: /reload/i });
    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });

    // Check min-h and min-w classes are applied
    expect(reloadBtn.className).toContain('min-h-[44px]');
    expect(reloadBtn.className).toContain('min-w-[44px]');
    expect(dismissBtn.className).toContain('min-h-[44px]');
    expect(dismissBtn.className).toContain('min-w-[44px]');
  });
});
