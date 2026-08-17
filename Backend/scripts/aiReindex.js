/**
 * Rebuild the RAG corpus from every published post.
 *
 * Ingest normally happens on publish, so this is for the two cases where that
 * hook could not run:
 *   - the blog already had published posts before the AI service existed;
 *   - the AI service was down when something was published or edited.
 *
 *   npm run ai:reindex            # index anything new or changed
 *   npm run ai:reindex -- --force # re-embed everything (costs tokens)
 *
 * It talks to the AI service directly, so the Express server does not need to
 * be running.
 */
/* eslint-disable no-console */
const env = require('../src/config/env');
const aiService = require('../src/services/aiService');

async function main() {
  if (!aiService.isEnabled()) {
    console.error('[ai] AI_SERVICE_URL is not set in Backend/.env — nothing to reindex.');
    process.exit(1);
  }

  const force = process.argv.includes('--force');
  console.log(`[ai] reindexing via ${env.ai.serviceUrl}${force ? ' (force: re-embedding everything)' : ''}`);

  const health = await aiService.health();
  if (!health?.ready) {
    console.error(`[ai] the AI service is not ready: ${health?.modelError || 'check its logs'}`);
    process.exit(1);
  }

  const started = Date.now();
  const summary = await aiService.backfill(force);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`[ai] done in ${seconds}s`);
  for (const [key, value] of Object.entries(summary)) {
    console.log(`       ${key.padEnd(16)} ${value}`);
  }
  if (summary.failed > 0) {
    console.error(`[ai] ${summary.failed} post(s) failed — check the AI service log.`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[ai] reindex failed:', err.message);
    process.exit(1);
  });
