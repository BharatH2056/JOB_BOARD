'use strict';

/**
 * services/llm.js
 * ───────────────
 * Reusable LLM service for text generation tasks (explanations, metadata extraction, NLU search parsing).
 *
 * Supports OpenAI (`gpt-4o-mini`) and Gemini (`gemini-3.6-flash`).
 * Falls back to deterministic mock generators in test mode or when no API keys are set.
 *
 * Usage:
 *   const { explainJobMatch, extractJobMetadata, parseNaturalLanguageSearch } = require('./services/llm');
 */

const { GoogleGenAI } = require('@google/genai');
const OpenAI = require('openai');

/**
 * Safely parses metadata JSON string returned by LLM with try/catch fallback.
 * @param {string} rawText
 * @returns {{ skills: string[], experienceLevel: string|null }}
 */
const safeParseMetadata = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return { skills: [], experienceLevel: null };
  }
  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    const skills = Array.isArray(parsed.skills)
      ? parsed.skills
          .filter((s) => typeof s === 'string' && s.trim().length > 0)
          .map((s) => s.trim())
      : [];

    let experienceLevel = null;
    if (typeof parsed.experienceLevel === 'string' && parsed.experienceLevel.trim()) {
      const level = parsed.experienceLevel.trim().toLowerCase();
      if (['junior', 'mid', 'senior'].includes(level)) {
        experienceLevel = level.charAt(0).toUpperCase() + level.slice(1);
      } else {
        experienceLevel = parsed.experienceLevel.trim();
      }
    }

    return { skills, experienceLevel };
  } catch (err) {
    console.error('⚠️ Failed to parse LLM metadata JSON, falling back to empty metadata:', err.message);
    return { skills: [], experienceLevel: null };
  }
};

/**
 * Safely parses natural language search JSON string returned by LLM with try/catch fallback.
 * @param {string} rawText
 * @param {string} originalMessage
 * @returns {{ role: string|null, location: string|null, jobType: string|null, semanticQuery: string }}
 */
const safeParseChatQuery = (rawText, originalMessage = '') => {
  if (!rawText || typeof rawText !== 'string') {
    return { role: null, location: null, jobType: null, semanticQuery: originalMessage };
  }
  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const parsed = JSON.parse(cleaned);

    return {
      role: typeof parsed.role === 'string' && parsed.role.trim() ? parsed.role.trim() : null,
      location: typeof parsed.location === 'string' && parsed.location.trim() ? parsed.location.trim() : null,
      jobType: typeof parsed.jobType === 'string' && parsed.jobType.trim() ? parsed.jobType.trim() : null,
      semanticQuery: typeof parsed.semanticQuery === 'string' && parsed.semanticQuery.trim() ? parsed.semanticQuery.trim() : originalMessage,
    };
  } catch (err) {
    console.error('⚠️ Failed to parse LLM chat query JSON, returning original message:', err.message);
    return { role: null, location: null, jobType: null, semanticQuery: originalMessage };
  }
};

/**
 * Generates mock explanation sentence for test/offline mode.
 */
const generateMockExplanation = (query = '', description = '') => {
  const snippet = description.replace(/\s+/g, ' ').slice(0, 60).trim();
  return `This role is a direct match for "${query}" as it focuses on ${snippet}.`;
};

/**
 * Generates mock skills and experience level for test/offline mode.
 */
const generateMockMetadata = (description = '') => {
  const lower = description.toLowerCase();
  const skills = [];

  const knownSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'PyTorch', 'Kubernetes', 'AWS', 'Docker', 'Redux', 'Terraform', 'gRPC'];
  for (const skill of knownSkills) {
    if (lower.includes(skill.toLowerCase())) {
      skills.push(skill);
    }
  }

  let experienceLevel = null;
  if (lower.includes('senior') || lower.includes('lead')) {
    experienceLevel = 'Senior';
  } else if (lower.includes('junior') || lower.includes('intern')) {
    experienceLevel = 'Junior';
  } else if (lower.includes('mid')) {
    experienceLevel = 'Mid';
  }

  return { skills, experienceLevel };
};

/**
 * Generates mock NLU search query filters for test/offline mode.
 */
const generateMockChatQuery = (message = '') => {
  const lower = message.toLowerCase();
  let role = null, location = null, jobType = null;

  if (lower.includes('frontend') || lower.includes('react')) role = 'Frontend';
  else if (lower.includes('backend') || lower.includes('node')) role = 'Backend';
  else if (lower.includes('devops') || lower.includes('cloud')) role = 'DevOps';

  if (lower.includes('london')) location = 'London';
  else if (lower.includes('new york')) location = 'New York';

  if (lower.includes('remote')) jobType = 'remote';
  else if (lower.includes('full-time') || lower.includes('full time')) jobType = 'full-time';
  else if (lower.includes('internship')) jobType = 'internship';

  return { role, location, jobType, semanticQuery: message };
};

/**
 * Generates a 1-sentence explanation of why a job matches a search query.
 */
const explainJobMatch = async ({ query, description }) => {
  if (!query || !description) {
    throw new Error('Both query and description are required for match explanation');
  }

  const prompt = `In one sentence, explain why this job matches the search query. Query: ${query}. Job description: ${description}. Be specific and concise.`;

  if (process.env.NODE_ENV === 'test') {
    return generateMockExplanation(query, description);
  }

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.3,
      });
      return response.choices[0].message.content.trim();
    } catch (err) {
      console.error('❌ OpenAI LLM explanation failed:', err.message);
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
      });
      return response.text.trim();
    } catch (err) {
      console.error('❌ Gemini LLM explanation failed:', err.message);
    }
  }

  return generateMockExplanation(query, description);
};

/**
 * Extracts required skills array and experience level from a job description using LLM.
 */
const extractJobMetadata = async (description) => {
  if (!description || typeof description !== 'string') {
    return { skills: [], experienceLevel: null };
  }

  const prompt = `Extract a JSON array of required skills and an experience level (junior/mid/senior) from this job description: ${description}. Return ONLY valid JSON in the format {"skills": [...], "experienceLevel": "..."}.`;

  if (process.env.NODE_ENV === 'test') {
    return generateMockMetadata(description);
  }

  let rawOutput = null;

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });
      rawOutput = response.choices[0].message.content;
    } catch (err) {
      console.error('❌ OpenAI metadata extraction failed:', err.message);
    }
  }

  if (!rawOutput) {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });
        rawOutput = response.text;
      } catch (err) {
        console.error('❌ Gemini metadata extraction failed:', err.message);
      }
    }
  }

  if (!rawOutput) {
    return generateMockMetadata(description);
  }

  return safeParseMetadata(rawOutput);
};

/**
 * Parses natural-language message into structured filters (role, location, jobType) AND a semantic query string using LLM.
 *
 * Prompt:
 * "Parse this into JSON: {role, location, jobType, semanticQuery}. Message: {message}"
 *
 * @param {string} message – natural language user message
 * @returns {Promise<{ role: string|null, location: string|null, jobType: string|null, semanticQuery: string }>}
 */
const parseNaturalLanguageSearch = async (message) => {
  if (!message || typeof message !== 'string') {
    return { role: null, location: null, jobType: null, semanticQuery: '' };
  }

  const prompt = `Parse this into JSON: {role, location, jobType, semanticQuery}. Message: ${message}`;

  if (process.env.NODE_ENV === 'test') {
    return generateMockChatQuery(message);
  }

  let rawOutput = null;

  if (process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });
      rawOutput = response.choices[0].message.content;
    } catch (err) {
      console.error('❌ OpenAI chat query parsing failed:', err.message);
    }
  }

  if (!rawOutput) {
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (geminiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
        });
        rawOutput = response.text;
      } catch (err) {
        console.error('❌ Gemini chat query parsing failed:', err.message);
      }
    }
  }

  if (!rawOutput) {
    return generateMockChatQuery(message);
  }

  return safeParseChatQuery(rawOutput, message);
};

module.exports = {
  explainJobMatch,
  extractJobMetadata,
  parseNaturalLanguageSearch,
  safeParseMetadata,
  safeParseChatQuery,
  generateMockExplanation,
  generateMockMetadata,
  generateMockChatQuery,
};
