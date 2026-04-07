# Environment and secrets setup

Configuration reference for local development and Cloudflare Workers production.

---

## Local development

Create a `.env` file in the project root:

```bash
# AI extraction (used by local API server, server.cjs)
VITE_CLAUDE_API_KEY=your_anthropic_api_key

# Google Maps — geocoding and place lookups
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Mapbox — interactive map display
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

**There are no Supabase variables.** The database is Cloudflare D1, which is bound to the Worker server-side. No client-side database config exists.

Restart dev servers after changing `.env`:
```bash
pkill -f vite && pkill -f node && npm run dev
# Terminal 2:
npm run api
```

---

## Cloudflare Worker secrets

Set via Wrangler CLI. These are encrypted and stored in Cloudflare, not in the repo.

```bash
wrangler secret put CLAUDE_API_KEY          # Anthropic API key
wrangler secret put GOOGLE_MAPS_API_KEY     # Google Maps API key
wrangler secret put MAPBOX_ACCESS_TOKEN     # Mapbox token

# List current secrets
wrangler secret list

# Update a secret
wrangler secret put <NAME>

# Delete a secret
wrangler secret delete <NAME>
```

After adding secrets, redeploy:
```bash
npx wrangler deploy
```

---

## wrangler.toml vars (non-sensitive)

These are committed to the repo in `wrangler.toml`. Not secrets — safe to be public.

```toml
[vars]
CF_ACCESS_AUD        = "24c0d43..."     # CF Access application audience tag
CF_TEAM_DOMAIN       = "https://herrings.cloudflareaccess.com"
AUTHORIZED_ADMIN_EMAIL = "magnus.hultberg@gmail.com"
```

**CF_ACCESS_AUD** and **CF_TEAM_DOMAIN** are used by the Worker to verify Cloudflare Access JWTs. See `REFERENCE/auth-setup.md` for details.

---

## D1 database binding

D1 is configured in `wrangler.toml` as a binding, not an environment variable:

```toml
[[d1_databases]]
binding = "DB"
database_name = "wandering-paths"
database_id = "f928b168-fb21-4420-bff8-2f9320d3f22e"
```

The Worker accesses it as `env.DB`. No connection string, no SDK initialisation. This is entirely server-side — the React app never talks to D1 directly.

---

## Where to get API keys

**Claude API (Anthropic):**
- https://console.anthropic.com/settings/keys
- Current model: `claude-sonnet-4-20250514` (configured in `src/config/claude.ts`)

**Google Maps:**
- https://console.cloud.google.com/google/maps-apis/credentials
- Enable: Geocoding API, Places API

**Mapbox:**
- https://account.mapbox.com/access-tokens/

---

## GitHub Actions secrets

Required for automated CI/CD deployment:

```
CLOUDFLARE_API_TOKEN    — Cloudflare Workers deployment access
CLOUDFLARE_ACCOUNT_ID   — Your Cloudflare account ID
```

The Worker secrets (Claude, Google Maps, Mapbox) are stored in Cloudflare directly and don't need to be in GitHub.

---

## Security checklist

- Never commit `.env` to git (it's in `.gitignore`)
- Rotate API keys if they may have been exposed
- Use `wrangler secret put` for all sensitive production values — never put them in `wrangler.toml`
- Restrict Google Maps API keys by HTTP referrer in Google Cloud Console
- Monitor usage: Anthropic Console, Google Cloud Console, Mapbox account

---

**Related:**
- `REFERENCE/auth-setup.md` — CF_ACCESS_AUD, CF_TEAM_DOMAIN usage
- `REFERENCE/d1-setup.md` — D1 binding and database
- `REFERENCE/troubleshooting.md` — Common config issues
