'use strict';

/**
 * scripts/regenerate-embeddings.js
 * ─────────────────────────────────
 * One-time migration: re-generate description_embedding for all Job documents
 * using the current embedding model (gemini-embedding-001, 3072-dim).
 *
 * Usage:
 *   node scripts/regenerate-embeddings.js
 *
 * Requires MONGODB_URI in .env (or environment).
 * Set NODE_ENV=production to use real API keys; leave unset for mock embeddings.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const Job = require('../models/Job');
const { generateEmbedding } = require('../services/embeddings');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobboard';

async function regenerateEmbeddings() {
  console.log('🔗 Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.');

  // Fetch all jobs, including the hidden embedding field
  const jobs = await Job.find({}).select('+description_embedding').lean();
  console.log(`📄 Found ${jobs.length} job(s) to process.`);

  let updated = 0;
  let failed = 0;

  for (const job of jobs) {
    try {
      const embedding = await generateEmbedding(job.description);

      await Job.updateOne(
        { _id: job._id },
        { $set: { description_embedding: embedding } }
      );

      console.log(
        `  ✔ [${updated + 1}/${jobs.length}] Job "${job.title}" → ${embedding.length} dims`
      );
      updated++;
    } catch (err) {
      console.error(`  ✘ Job "${job.title}" (${job._id}): ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done. Updated: ${updated}, Failed: ${failed}`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

regenerateEmbeddings().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
