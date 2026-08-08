import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionIndicator } from './ConnectionIndicator';

describe('ConnectionIndicator', () => {
  const mockRetry = vi.fn();

  it('displays connected state with green indicator', () => {
    render(<ConnectionIndicator status="connected" onRetry={mockRetry} />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('displays reconnecting state with pulsing indicator', () => {
    render(<ConnectionIndicator status="reconnecting" onRetry={mockRetry} />);
    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('displays disconnected state with retry button', () => {
    render(<ConnectionIndicator status="disconnected" onRetry={mockRetry} />);
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    render(<ConnectionIndicator status="disconnected" onRetry={mockRetry} />);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('retry button has minimum 44x44px tap target', () => {
    render(<ConnectionIndicator status="disconnected" onRetry={mockRetry} />);
    const button = screen.getByRole('button', { name: /retry/i });
    expect(button.className).toContain('min-w-[44px]');
    expect(button.className).toContain('min-h-[44px]');
  });
});
