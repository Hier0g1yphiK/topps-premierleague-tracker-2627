import { useState, useRef, useEffect, useCallback } from 'react';
import type { ImportSummary } from '../types';
import { processCSVFile, type ParsedRow } from '../lib/csv-import';
import { supabase } from '../lib/supabase';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (summary: ImportSummary) => void;
}

type ModalState = 'idle' | 'processing' | 'complete';

export function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [state, setState] = useState<ModalState>('idle');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap: focus close button when modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setState('idle');
    setSummary(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  }, [onClose]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setState('processing');
    setSummary(null);

    try {
      const { validRows, errors } = await processCSVFile(file);
      const rejected = errors.length;

      let inserted = 0;
      let skipped = 0;
      let parallelsCreated = 0;

      if (validRows.length > 0) {
        const result = await batchUpsert(validRows);
        inserted = result.inserted;
        skipped = result.skipped;
        parallelsCreated = result.parallelsCreated;
      }

      const importSummary: ImportSummary = {
        inserted,
        parallelsCreated,
        skipped,
        rejected,
        errors,
      };

      setSummary(importSummary);
      setState('complete');
      onImportComplete(importSummary);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Import error:', err);
      const errorSummary: ImportSummary = {
        inserted: 0,
        parallelsCreated: 0,
        skipped: 0,
        rejected: 0,
        errors: [{ row: 0, reason: message || 'An unexpected error occurred during import' }],
      };
      setSummary(errorSummary);
      setState('complete');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="import-modal-title" className="text-lg font-semibold text-gray-900">
            Import Cards from CSV
          </h2>
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close import modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1">
          {state === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Select a CSV file to import cards. The file should contain columns:
                card_number, set_name (or set), set_card_number, player, team, and optionally notes and parallel.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                aria-label="Choose CSV file to import"
              />
            </div>
          )}

          {state === 'processing' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div
                className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"
                role="status"
                aria-label="Processing import"
              />
              <p className="text-sm text-gray-600">Processing your CSV file...</p>
            </div>
          )}

          {state === 'complete' && summary && (
            <div className="space-y-4">
              {/* Summary counts */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">{summary.inserted}</p>
                  <p className="text-xs text-green-600">Cards Inserted</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-md p-3 text-center">
                  <p className="text-2xl font-bold text-purple-700">{summary.parallelsCreated}</p>
                  <p className="text-xs text-purple-600">Parallels Created</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-700">{summary.skipped}</p>
                  <p className="text-xs text-yellow-600">Skipped</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-center">
                  <p className="text-2xl font-bold text-red-700">{summary.rejected}</p>
                  <p className="text-xs text-red-600">Rejected</p>
                </div>
              </div>

              {/* Error list */}
              {summary.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Errors ({summary.errors.length})
                  </h3>
                  <ul className="max-h-40 overflow-y-auto space-y-1 text-sm">
                    {summary.errors.map((error, index) => (
                      <li
                        key={index}
                        className="bg-red-50 border border-red-100 rounded px-3 py-1.5 text-red-700"
                      >
                        {error.row > 0 ? `Row ${error.row}: ` : ''}
                        {error.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Import another button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setState('idle');
                    setSummary(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100"
                >
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Batch upserts valid rows to Supabase, including card_parallels.
 * 1. Upserts cards (with ignoreDuplicates: false to get back ids for all rows)
 * 2. Maps card_number → card_id from upsert results
 * 3. Upserts card_parallels using (card_id, parallel_name) as unique key
 */
async function batchUpsert(
  rows: ParsedRow[]
): Promise<{ inserted: number; skipped: number; parallelsCreated: number }> {
  // Deduplicate cards by card_number (last occurrence wins for card fields)
  const cardMap = new Map<number, ParsedRow>();
  for (const row of rows) {
    const cardNum = parseInt(row.card_number, 10);
    if (!cardMap.has(cardNum)) {
      cardMap.set(cardNum, row);
    }
  }

  const uniqueCardRecords = Array.from(cardMap.values()).map((row) => ({
    card_number: parseInt(row.card_number, 10),
    set_name: row.set_name.trim(),
    set_card_number: row.set_card_number.trim(),
    player: row.player.trim(),
    team: row.team.trim(),
    notes: row.notes,
    collected: false,
    user_id: null,
  }));

  // Upsert cards with ignoreDuplicates: false so we get back ids for existing cards too
  const { data: cardData, error: cardError } = await supabase
    .from('cards')
    .upsert(uniqueCardRecords, { onConflict: 'user_id,card_number', ignoreDuplicates: false })
    .select('id, card_number');

  if (cardError) {
    throw new Error(`Supabase card upsert failed: ${cardError.message}`);
  }

  // Build card_number → id map
  const cardNumberToId = new Map<number, string>();
  if (cardData) {
    for (const card of cardData) {
      cardNumberToId.set(card.card_number, card.id);
    }
  }

  const inserted = cardData?.length ?? 0;
  const skipped = uniqueCardRecords.length - inserted;

  // Build parallel records from all valid rows
  const parallelRecords = rows
    .map((row) => {
      const cardId = cardNumberToId.get(parseInt(row.card_number, 10));
      if (!cardId) return null;
      return {
        card_id: cardId,
        parallel_name: row.parallel_name,
        collected: false,
      };
    })
    .filter((r): r is { card_id: string; parallel_name: string; collected: boolean } => r !== null);

  let parallelsCreated = 0;

  if (parallelRecords.length > 0) {
    const { data: parallelData, error: parallelError } = await supabase
      .from('card_parallels')
      .upsert(parallelRecords, { onConflict: 'card_id,parallel_name', ignoreDuplicates: true })
      .select('id');

    if (parallelError) {
      throw new Error(`Supabase parallel upsert failed: ${parallelError.message}`);
    }

    parallelsCreated = parallelData?.length ?? 0;
  }

  return { inserted, skipped, parallelsCreated };
}
