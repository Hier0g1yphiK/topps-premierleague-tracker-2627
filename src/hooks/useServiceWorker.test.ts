import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useServiceWorker } from './useServiceWorker';
import {
  __triggerNeedRefresh,
  __setUpdateFn,
  __reset,
  __getOptions,
} from '../test/__mocks__/virtual-pwa-register';

describe('useServiceWorker', () => {
  afterEach(() => {
    __reset();
    vi.restoreAllMocks();
  });

  it('returns needsRefresh as false initially', async () => {
    const { result } = renderHook(() => useServiceWorker());

    // Wait for the async import to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.needsRefresh).toBe(false);
    expect(typeof result.current.updateServiceWorker).toBe('function');
  });

  it('sets needsRefresh to true when onNeedRefresh callback fires', async () => {
    const { result } = renderHook(() => useServiceWorker());

    // Wait for the async import to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.needsRefresh).toBe(false);

    // Trigger the onNeedRefresh callback
    act(() => {
      __triggerNeedRefresh();
    });

    expect(result.current.needsRefresh).toBe(true);
  });

  it('calls updateSW(true) when updateServiceWorker is invoked', async () => {
    const mockUpdateSW = vi.fn().mockResolvedValue(undefined);
    __setUpdateFn(mockUpdateSW);

    const { result } = renderHook(() => useServiceWorker());

    // Wait for the async import to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Trigger need refresh to enable the update path
    act(() => {
      __triggerNeedRefresh();
    });

    expect(result.current.needsRefresh).toBe(true);

    // Trigger the update
    act(() => {
      result.current.updateServiceWorker();
    });

    expect(mockUpdateSW).toHaveBeenCalledWith(true);
  });

  it('registers with registerSW providing onNeedRefresh and onOfflineReady', async () => {
    renderHook(() => useServiceWorker());

    // Wait for the async import to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const opts = __getOptions();
    expect(opts.onNeedRefresh).toBeTypeOf('function');
    expect(opts.onOfflineReady).toBeTypeOf('function');
  });

  it('exposes updateServiceWorker as a stable function reference', async () => {
    const { result, rerender } = renderHook(() => useServiceWorker());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const firstRef = result.current.updateServiceWorker;
    rerender();
    const secondRef = result.current.updateServiceWorker;

    expect(firstRef).toBe(secondRef);
  });
});
