import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { OfflineBanner } from './OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders banner when isOffline is true', () => {
    render(<OfflineBanner isOffline={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    expect(
      screen.getByText(/Displayed data may be stale and changes will sync when connectivity is restored/)
    ).toBeInTheDocument();
  });

  it('does not render banner when isOffline is false and was never offline', () => {
    render(<OfflineBanner isOffline={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('auto-hides banner within 5 seconds after connectivity is restored', () => {
    const { rerender } = render(<OfflineBanner isOffline={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Go back online
    rerender(<OfflineBanner isOffline={false} />);

    // Banner should still be visible immediately
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Banner should now be hidden
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps banner visible if going offline again before timeout', () => {
    const { rerender } = render(<OfflineBanner isOffline={true} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Go back online
    rerender(<OfflineBanner isOffline={false} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Go offline again before the 5s timeout
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    rerender(<OfflineBanner isOffline={true} />);

    // Advance past original timeout
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Banner should still be visible (we're offline again)
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
