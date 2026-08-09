import type { CardParallel } from '../types';
import type { Card } from '../types';

const DB_NAME = 'pl-tracker-cache';
const DB_VERSION = 2;
const CARDS_STORE = 'cards';
const CARDS_CACHE_KEY = 'all-cards';
const PARALLELS_STORE = 'card-parallels';
const PARALLELS_CACHE_KEY = 'all-parallels';
const PENDING_TOGGLES_STORE = 'pending-parallel-toggles';

export interface PendingToggle {
  parallelId: string;
  collected: boolean;
  date_collected: string | null;
  timestamp: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion;

      if (oldVersion < 1) {
        db.createObjectStore(CARDS_STORE);
      }
      if (oldVersion < 2) {
        db.createObjectStore(PARALLELS_STORE);
        db.createObjectStore(PENDING_TOGGLES_STORE, { autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Stores the full card array in IndexedDB for offline access.
 */
export async function saveCardsToCache(cards: Card[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CARDS_STORE, 'readwrite');
    const store = tx.objectStore(CARDS_STORE);
    store.put(cards, CARDS_CACHE_KEY);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Retrieves cached cards from IndexedDB.
 * Returns an empty array if nothing is cached.
 */
export async function loadCardsFromCache(): Promise<Card[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CARDS_STORE, 'readonly');
    const store = tx.objectStore(CARDS_STORE);
    const request = store.get(CARDS_CACHE_KEY);

    request.onsuccess = () => {
      db.close();
      resolve(request.result ?? []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Removes all cached card data from IndexedDB.
 */
export async function clearCache(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CARDS_STORE, 'readwrite');
    const store = tx.objectStore(CARDS_STORE);
    store.clear();

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Stores the full parallels array in IndexedDB for offline access.
 */
export async function saveParallelsToCache(parallels: CardParallel[]): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PARALLELS_STORE, 'readwrite');
    const store = tx.objectStore(PARALLELS_STORE);
    store.put(parallels, PARALLELS_CACHE_KEY);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Retrieves cached parallels from IndexedDB.
 * Returns an empty array if nothing is cached.
 */
export async function loadParallelsFromCache(): Promise<CardParallel[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PARALLELS_STORE, 'readonly');
    const store = tx.objectStore(PARALLELS_STORE);
    const request = store.get(PARALLELS_CACHE_KEY);

    request.onsuccess = () => {
      db.close();
      resolve(request.result ?? []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Saves a pending parallel toggle to IndexedDB for later sync.
 */
export async function savePendingParallelToggle(toggle: PendingToggle): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_TOGGLES_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_TOGGLES_STORE);
    store.add(toggle);

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Retrieves all pending parallel toggles from IndexedDB.
 * Returns an empty array if none are pending.
 */
export async function loadPendingParallelToggles(): Promise<PendingToggle[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_TOGGLES_STORE, 'readonly');
    const store = tx.objectStore(PENDING_TOGGLES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result ?? []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

/**
 * Clears all pending parallel toggles from IndexedDB after successful sync.
 */
export async function clearPendingParallelToggles(): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENDING_TOGGLES_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_TOGGLES_STORE);
    store.clear();

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
