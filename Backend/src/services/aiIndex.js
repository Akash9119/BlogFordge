/**
 * Keeping the vector index in step with the posts collection.
 *
 * The forge moment is a publish, not an embedding job — so these run detached.
 * A slow or dead AI service must never make "Publish post" hang or fail, and it
 * must never take the process down with it: `server.js` treats an unhandled
 * rejection as fatal, so every function here resolves, always. Whatever is
 * missed while the service is down is repaired by `npm run ai:reindex`.
 */

const env = require('../config/env');
const aiService = require('./aiService');

/* eslint-disable no-console */

/** Index (or re-index) one post. Safe to call for any status — the service decides. */
async function reindexPost(postId, reason) {
  if (!env.ai.enabled) return;
  try {
    const result = await aiService.ingestPost(String(postId));
    console.log(`[ai] ${reason}: post ${postId} -> ${result?.action ?? 'ok'} (${result?.chunks ?? 0} chunks)`);
  } catch (err) {
    console.error(`[ai] ${reason}: failed to index post ${postId} — ${err.message}`);
  }
}

/** Drop a post's vectors — archived or deleted content must stop being retrievable. */
async function dropPost(postId, reason) {
  if (!env.ai.enabled) return;
  try {
    const result = await aiService.removePost(String(postId));
    console.log(`[ai] ${reason}: dropped ${result?.chunks ?? 0} chunks for post ${postId}`);
  } catch (err) {
    console.error(`[ai] ${reason}: failed to drop vectors for post ${postId} — ${err.message}`);
  }
}

/**
 * Fire and forget, explicitly. `void` documents that the caller is not waiting;
 * the promise cannot reject, so there is nothing to catch here.
 */
const detach = (promise) => {
  void promise;
};

module.exports = {
  onPublished: (postId) => detach(reindexPost(postId, 'publish')),
  onUpdated: (postId) => detach(reindexPost(postId, 'update')),
  onArchived: (postId) => detach(dropPost(postId, 'archive')),
  onDeleted: (postId) => detach(dropPost(postId, 'delete')),
  reindexPost,
  dropPost,
};
