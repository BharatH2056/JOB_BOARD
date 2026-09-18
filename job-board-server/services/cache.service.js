'use strict';

/**
 * services/cache.service.js
 * ─────────────────────────
 * Redis caching service for /jobs/search results using ioredis / ioredis-mock.
 *
 * Responsibilities:
 *  - Caches vector search results by normalized query string with 10-minute (600s) TTL.
 *  - Invalidates search cache entries whenever a new job is created.
 *
 * Design decisions:
 *  - ONE shared Redis client is created at module load — never re-created per call.
 *  - If the real Redis connection fails, `redisAvailable` flips to false and all
 *    three public functions fall back silently (warn, never throw).
 *  - In test mode or when USE_REDIS_MOCK=true, ioredis-mock is used instead.
 */

const Redis     = require('ioredis');
const RedisMock = require('ioredis-mock');

const SEARCH_CACHE_PREFIX   = 'search:cache:';
const SEARCH_CACHE_TTL_SEC  = 600; // 10 minutes

// ── Single shared client ──────────────────────────────────────────────────────

let redisClient;
let redisAvailable = true; // flips false on first connection error

if (process.env.NODE_ENV === 'test' || process.env.USE_REDIS_MOCK === 'true') {
  redisClient    = new RedisMock();
  redisAvailable = true;
} else {
  try {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 1,
      enableOfflineQueue:   false,
      lazyConnect:          true,
    });

    // Mark unavailable on error — do NOT replace the client reference.
    // All calls that are already mid-flight will catch their own errors via try/catch.
    redisClient.on('error', (err) => {
      if (redisAvailable) {
        console.warn(`[CACHE SERVICE] Redis unavailable — caching disabled. (${err.message})`);
        redisAvailable = false;
      }
    });

    redisClient.on('connect', () => {
      if (!redisAvailable) {
        console.log('[CACHE SERVICE] Redis reconnected — caching re-enabled.');
      }
      redisAvailable = true;
    });
  } catch (err) {
    console.warn(`[CACHE SERVICE] Redis init failed — caching disabled. (${err.message})`);
    redisClient    = new RedisMock();
    redisAvailable = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Normalise a search query for cache key generation.
 * @param {string} query
 * @returns {string}
 */
const getCacheKey = (query) =>
  `${SEARCH_CACHE_PREFIX}${(query || '').trim().toLowerCase()}`;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get cached search results.
 * Returns null (never throws) if Redis is unavailable or the key is missing.
 *
 * @param {string} query
 * @returns {Promise<Object[]|null>}
 */
const getSearchCache = async (query) => {
  if (!redisAvailable) return null;
  try {
    const data = await redisClient.get(getCacheKey(query));
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('[CACHE SERVICE] getSearchCache error (ignored):', err.message);
    return null;
  }
};

/**
 * Set cached search results with 10-minute TTL.
 * Silently no-ops if Redis is unavailable (never throws).
 *
 * @param {string}   query
 * @param {Object[]} results
 */
const setSearchCache = async (query, results) => {
  if (!redisAvailable) return;
  try {
    await redisClient.setex(getCacheKey(query), SEARCH_CACHE_TTL_SEC, JSON.stringify(results));
  } catch (err) {
    console.warn('[CACHE SERVICE] setSearchCache error (ignored):', err.message);
  }
};

/**
 * Invalidate all search cache entries when a new job is created.
 * Silently no-ops if Redis is unavailable (never throws).
 * Called by createJob() — must NEVER crash the parent request.
 */
const invalidateSearchCache = async () => {
  if (!redisAvailable) return;
  try {
    const keys = await redisClient.keys(`${SEARCH_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (err) {
    console.warn('[CACHE SERVICE] invalidateSearchCache error (ignored):', err.message);
  }
};

module.exports = {
  redisClient,
  getSearchCache,
  setSearchCache,
  invalidateSearchCache,
};
