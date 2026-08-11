/**
 * Migration script: Remove "Base" rows from card_parallels table.
 *
 * For each card_parallels row where parallel_name = 'Base':
 *   1. If collected = true, set cards.collected = true on the corresponding card
 *      (preserves any progress already logged via the old "Base parallel" path).
 *   2. Delete the card_parallels row.
 *
 * Usage:
 *   node scripts/migrate-base-parallels.mjs
 *
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (or as env vars).
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config(); // Load .env

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Fetching card_parallels rows with parallel_name = "Base"...');

  const { data: baseParallels, error: fetchError } = await supabase
    .from('card_parallels')
    .select('id, card_id, collected')
    .eq('parallel_name', 'Base');

  if (fetchError) {
    console.error('Error fetching Base parallels:', fetchError.message);
    process.exit(1);
  }

  if (!baseParallels || baseParallels.length === 0) {
    console.log('No Base parallel rows found. Nothing to migrate.');
    return;
  }

  console.log(`Found ${baseParallels.length} Base parallel row(s).`);

  // Step 1: For collected Base parallels, mark the corresponding card as collected
  const collectedCardIds = baseParallels
    .filter((p) => p.collected === true)
    .map((p) => p.card_id);

  if (collectedCardIds.length > 0) {
    console.log(`Marking ${collectedCardIds.length} card(s) as collected (preserving progress)...`);

    const { error: updateError } = await supabase
      .from('cards')
      .update({ collected: true, date_collected: new Date().toISOString().split('T')[0] })
      .in('id', collectedCardIds);

    if (updateError) {
      console.error('Error updating cards.collected:', updateError.message);
      process.exit(1);
    }
  }

  // Step 2: Delete all Base parallel rows
  const baseIds = baseParallels.map((p) => p.id);
  console.log(`Deleting ${baseIds.length} Base parallel row(s)...`);

  const { error: deleteError } = await supabase
    .from('card_parallels')
    .delete()
    .in('id', baseIds);

  if (deleteError) {
    console.error('Error deleting Base parallels:', deleteError.message);
    process.exit(1);
  }

  console.log('Migration complete!');
  console.log(`  - Cards marked as collected: ${collectedCardIds.length}`);
  console.log(`  - Base parallel rows deleted: ${baseIds.length}`);
}

migrate().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
