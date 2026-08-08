/**
 * Mock implementation of 'virtual:pwa-register' for testing.
 * In production, vite-plugin-pwa provides this virtual module.
 * In tests, this mock is resolved via the vitest.config.ts alias.
 */

type RegisterSWOptions = {
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: Error) => void;
};

// Store callbacks so tests can trigger them
let _options: RegisterSWOptions = {};
let _updateFn = (_reloadPage?: boolean) => Promise.resolve();

export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void> {
  _options = options || {};
  return _updateFn;
}

// Test helpers — not part of the real API
export function __setUpdateFn(fn: (reloadPage?: boolean) => Promise<void>) {
  _updateFn = fn;
}

export function __getOptions(): RegisterSWOptions {
  return _options;
}

export function __triggerNeedRefresh() {
  _options.onNeedRefresh?.();
}

export function __triggerOfflineReady() {
  _options.onOfflineReady?.();
}

export function __reset() {
  _options = {};
  _updateFn = (_reloadPage?: boolean) => Promise.resolve();
}
