// ABOUT: Centralized Claude API configuration
// ABOUT: Update CLAUDE_MODEL_VERSION here when Anthropic releases new models

/**
 * Claude API Model Configuration
 *
 * This constant defines which Claude model version to use for all API calls.
 * Update this when Anthropic releases new model versions.
 *
 * History:
 * - claude-sonnet-4-20250514: Current (Sonnet 4.5, January 2025)
 * - claude-3-5-sonnet-20241022: Deprecated December 2024
 * - claude-3-5-sonnet-20240620: Deprecated October 2024
 *
 * See: https://docs.anthropic.com/en/docs/about-claude/models
 */
export const CLAUDE_MODEL_VERSION = 'claude-sonnet-4-20250514';

/**
 * Claude API Version Header
 * This rarely changes - only update if Anthropic releases a new API version
 */
export const CLAUDE_API_VERSION = '2023-06-01';

/**
 * Default token limits for Claude API requests
 */
export const CLAUDE_MAX_TOKENS = {
  EXTRACTION: 4000,      // Restaurant extraction from URLs
  REVIEW_SUMMARY: 1000,  // Google Maps review summarization
} as const;
