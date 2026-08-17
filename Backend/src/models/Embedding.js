const mongoose = require('mongoose');

/**
 * Vector chunks for RAG — one document per (post, chunk).
 *
 * The AI service **owns** this collection: it does the chunking, the embedding,
 * and every write. Node declares it for exactly two reasons — cascading a post
 * deletion, and counting the corpus for the AI Reports screen — both of which
 * must keep working when the AI service is down. `strict: false` because the
 * authoritative shape lives in ai-service/app/vectorstore.py, and Node has no
 * business enforcing a schema it does not write.
 */
const embeddingSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    chunkIndex: { type: Number, required: true },
    text: { type: String },
    contentHash: { type: String },
    model: { type: String },
  },
  { strict: false, timestamps: false, collection: 'embeddings' }
);

embeddingSchema.index({ post: 1, chunkIndex: 1 }, { unique: true });

module.exports = mongoose.model('Embedding', embeddingSchema);
