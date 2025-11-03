# Claude Model Version Updates

## Current Model Version

**Current Model:** `claude-sonnet-4-20250514` (Sonnet 4.5)
**Last Updated:** January 2025

## How to Update Claude Model Version

When Anthropic releases a new model version, follow these steps:

### 1. Update the Centralized Config (Recommended)

For **TypeScript services** (review enrichment, future features):

**File:** `src/config/claude.ts`

```typescript
export const CLAUDE_MODEL_VERSION = 'claude-sonnet-4-XXXXXXXX'; // Update here
```

This automatically updates:
- `src/services/claudeExtractor.ts`
- `src/services/reviewEnrichmentService.ts`
- Any future TypeScript services that import this config

### 2. Update Server Files Manually

For **Node.js/JavaScript files**, update the constant in each file:

**File:** `server.cjs` (local development)
```javascript
const CLAUDE_MODEL_VERSION = 'claude-sonnet-4-XXXXXXXX'; // Update here
```

**File:** `src/worker.js` (CloudFlare Workers production)
```javascript
const CLAUDE_MODEL_VERSION = 'claude-sonnet-4-XXXXXXXX'; // Update here
```

### 3. Verify Updates

After updating, verify all occurrences are changed:

```bash
# Search for old model references (should only find docs/comments)
grep -r "claude-3-5-sonnet" --include="*.ts" --include="*.js" --include="*.cjs"

# Verify new model is in place
grep -r "claude-sonnet-4" --include="*.ts" --include="*.js" --include="*.cjs"
```

### 4. Deploy to Production

After testing locally:

```bash
# Build and deploy
npm run build
git add .
git commit -m "Update Claude model to claude-sonnet-4-XXXXXXXX"
git push origin main
# 🚀 GitHub Actions automatically deploys to production
```

## Model Version History

| Model Version | Period | Notes |
|---------------|--------|-------|
| `claude-sonnet-4-20250514` | Jan 2025 - Present | Sonnet 4.5, current version |
| `claude-3-5-sonnet-20241022` | Oct 2024 - Dec 2024 | Deprecated Dec 2024 |
| `claude-3-5-sonnet-20240620` | Jun 2024 - Oct 2024 | Deprecated Oct 2024 |

## Where Claude API is Used

### Restaurant Extraction (`/api/extract-restaurant`)
- **Purpose:** Extract restaurant data from URLs
- **Files:** `server.cjs`, `src/worker.js`, `src/services/claudeExtractor.ts`
- **Max Tokens:** 4000
- **Features:**
  - Business type detection
  - Multi-location extraction
  - Cuisine and dish identification

### Review Summarization (`/api/claude`)
- **Purpose:** Summarize Google Maps reviews
- **Files:** `src/services/reviewEnrichmentService.ts`
- **Max Tokens:** 1000
- **Features:**
  - Review sentiment analysis
  - Popular dish extraction
  - Balanced summary generation

## Troubleshooting

### "Model not found" errors
- Check that all files are updated with the same model version
- Verify the model name matches Anthropic's official naming (check [Anthropic docs](https://docs.anthropic.com/en/docs/about-claude/models))

### Production deployment issues
- Ensure `npm run build` completes successfully before deploying
- Check CloudFlare Workers logs: `npx wrangler tail`
- Verify GitHub Actions deployment succeeded

### Local development issues
- Restart both dev servers after model updates:
  - `npm run dev` (frontend)
  - `npm run api` (backend)

## Future Improvements

Consider these enhancements for easier model management:

1. **Environment Variable:** Move model version to `.env` for easier updates without code changes
2. **Automated Tests:** Add tests to verify Claude API responses with new models
3. **Version Monitoring:** Set up alerts when Anthropic announces model deprecations

---

**Related Documentation:**
- [Anthropic Model Documentation](https://docs.anthropic.com/en/docs/about-claude/models)
- [Claude API Reference](https://docs.anthropic.com/en/api/messages)
