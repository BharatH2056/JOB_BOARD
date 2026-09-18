'use strict';

/**
 * services/embeddings.js
 * ───────────────────────
 * Reusable embedding service.
 *
 * Supports OpenAI `text-embedding-3-small` or Gemini `gemini-embedding-001` (3072-dim).
 * If no API key is provided or in test environment, generates a semantic mock vector.
 */

const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

const KEYWORD_BUCKETS = [
  { keywords: ['frontend', 'react', 'typescript', 'css', 'web', 'ui', 'components'], start: 0, end: 100 },
  { keywords: ['data', 'scientist', 'ml', 'machine', 'learning', 'neural', 'python', 'ai', 'predictive', 'models'], start: 200, end: 300 },
  { keywords: ['devops', 'kubernetes', 'terraform', 'aws', 'cloud', 'docker', 'infrastructure', 'containers', 'ci/cd'], start: 400, end: 500 },
];

/**
 * Generates a mock 3072-dimensional vector embedding with weighted keyword feature buckets for testing.
 * @param {string} text
 * @returns {number[]}
 */
const generateMockEmbedding = (text = '') => {
  const dim = 3072;
  const embedding = new Array(dim).fill(0.01);
  const lower = text.toLowerCase();

  // Baseline pseudo-random distribution from text hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let i = 0; i < dim; i++) {
    const val = Math.sin(hash + i);
    embedding[i] = parseFloat((val * 0.05).toFixed(6));
  }

  // Frequency-weighted keyword bucket activation
  for (const bucket of KEYWORD_BUCKETS) {
    let matchCount = 0;
    for (const kw of bucket.keywords) {
      if (lower.includes(kw)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      for (let i = bucket.start; i < bucket.end; i++) {
        embedding[i] += 0.5 * matchCount;
      }
    }
  }

  // Normalize vector to unit length
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += embedding[i] * embedding[i];
  }
  norm = Math.sqrt(norm) || 1;

  for (let i = 0; i < dim; i++) {
    embedding[i] = parseFloat((embedding[i] / norm).toFixed(6));
  }

  return embedding;
};

/**
 * Takes a text string and returns a vector embedding (array of numbers).
 *
 * @param {string} text – text to embed
 * @returns {Promise<number[]>} – vector embedding array
 */
const generateEmbedding = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Text parameter is required for generating embeddings');
  }

  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error('Text parameter cannot be empty');
  }

  // 1. If in test mode, return semantic mock embedding
  if (process.env.NODE_ENV === 'test') {
    return generateMockEmbedding(trimmedText);
  }

  // 2. OpenAI Embedding
  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: trimmedText,
      });
      return response.data[0].embedding;
    } catch (err) {
      console.error('❌ OpenAI embedding generation failed:', err.message);
      throw err;
    }
  }

  // 3. Gemini Embedding
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: trimmedText,
      });
      return response.embeddings[0].values;
    } catch (err) {
      console.error('❌ Gemini embedding generation failed:', err.message);
      throw err;
    }
  }

  // 4. Fallback if no keys configured
  console.warn('⚠️ No OPENAI_API_KEY or GEMINI_API_KEY set. Falling back to mock vector embedding.');
  return generateMockEmbedding(trimmedText);
};

module.exports = { generateEmbedding, generateMockEmbedding };
