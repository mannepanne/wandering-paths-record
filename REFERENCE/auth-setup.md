# Authentication setup

Wandering Paths uses **Cloudflare Access + Google OAuth** for admin authentication. There is no client-side auth SDK — auth is handled entirely in the Worker via JWT verification.

---

## How it works

1. User hits `/auth/login` → redirected to Cloudflare Access login page
2. Cloudflare Access authenticates via Google OAuth
3. On success, Cloudflare sets a `CF_Authorization` cookie (underscore) on the app domain
4. The browser includes this cookie on subsequent requests
5. The Worker reads the cookie and verifies the JWT on each protected endpoint
6. If the JWT is valid **and** the email matches `AUTHORIZED_ADMIN_EMAIL`, the request proceeds
7. Logout via `/cdn-cgi/access/logout` — Cloudflare clears the cookie

The public restaurant list is entirely unauthenticated. Only admin API endpoints (create, update, delete, visits) check the cookie.

---

## JWT verification in the Worker

```javascript
// src/worker.js

function getCFToken(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/CF_Authorization=([^;]+)/);
  return match ? match[1] : null;
}

async function verifyCFAccessJWT(token, env) {
  // 1. Decode header and payload
  const header = JSON.parse(atob(parts[0]));
  const payload = JSON.parse(atob(parts[1]));

  // 2. Check audience (CF_ACCESS_AUD env var)
  if (!payload.aud.includes(env.CF_ACCESS_AUD)) return false;

  // 3. Check expiry
  if (payload.exp < Math.floor(Date.now() / 1000)) return false;

  // 4. Check email matches authorized admin
  if (payload.email !== env.AUTHORIZED_ADMIN_EMAIL) return false;

  // 5. Fetch JWKS from Cloudflare team domain and verify RS256 signature
  const certsResp = await fetch(`${env.CF_TEAM_DOMAIN}/cdn-cgi/access/certs`);
  const { keys } = await certsResp.json();
  const key = keys.find(k => k.kid === header.kid);
  // ... crypto.subtle.verify (RS256 / RSASSA-PKCS1-v1_5)
}
```

Key points:
- Algorithm: RS256 (RSASSA-PKCS1-v1_5 + SHA-256)
- Public keys fetched live from `CF_TEAM_DOMAIN/cdn-cgi/access/certs` (JWKS endpoint)
- Email check is enforced in the Worker, not at the Cloudflare Access policy level
- No session storage — every protected request re-verifies the JWT

---

## Cookie name gotcha

The cookie is named `CF_Authorization` with an **underscore**. Cloudflare documentation and many examples show it with a hyphen (`CF-Authorization`) — this is wrong and will silently break all authentication. The Worker regex must use the underscore form:

```javascript
cookie.match(/CF_Authorization=([^;]+)/)
```

If you're debugging auth issues, open browser DevTools → Application → Cookies and confirm the cookie name is `CF_Authorization` (underscore).

---

## Why JWT-only, no edge enforcement

Cloudflare Access can enforce authentication at the edge (before the Worker even runs), but that would block the public restaurant list. The choice was made to handle auth in Worker code only, so:

- Public routes (`GET /api/restaurants`, map view, etc.) are accessible without login
- Admin routes check the JWT themselves
- The Cloudflare Access application is configured to allow all traffic through; enforcement is purely in the Worker

This is documented in ADR — see `REFERENCE/decisions/` for the auth architecture decision.

---

## Environment configuration

Set in `wrangler.toml [vars]` (not secrets — these are non-sensitive identifiers):

```toml
[vars]
CF_ACCESS_AUD    = "24c0d43..."   # Application audience tag from CF Access dashboard
CF_TEAM_DOMAIN   = "https://herrings.cloudflareaccess.com"
AUTHORIZED_ADMIN_EMAIL = "magnus.hultberg@gmail.com"
```

No secrets needed for auth — the public key is fetched from Cloudflare's JWKS endpoint at verification time.

---

## Setting up a new CF Access application

If you need to recreate the Cloudflare Access application (e.g., for a new environment):

1. Go to Cloudflare Zero Trust dashboard → Access → Applications
2. Create a new **Self-hosted** application
3. Set the application domain to `restaurants.hultberg.org`
4. Add a policy: allow the admin email address
5. Under **Authentication**, enable Google as an identity provider (requires Google OAuth credentials in Zero Trust → Settings → Authentication)
6. Copy the **Application Audience (AUD) tag** — this goes into `CF_ACCESS_AUD` in `wrangler.toml`
7. The team domain is your Zero Trust organisation domain (shown in Settings → Custom Pages or the dashboard URL)

---

## Auth flow for the frontend

The React app checks authentication state by calling `GET /api/auth/me`. The Worker verifies the JWT and returns the user's email if valid.

```typescript
// src/services/restaurants.ts (or auth service)
const res = await apiFetch('/api/auth/me', { credentials: 'include' });
```

All `apiFetch()` calls use `credentials: 'include'` so the `CF_Authorization` cookie is sent cross-origin if needed.

Sign-out:
```typescript
window.location.href = '/cdn-cgi/access/logout';
```

---

**Related:**
- `src/worker.js` — `getCFToken()`, `verifyCFAccessJWT()`, `isAuthenticated()`
- `wrangler.toml` — `CF_ACCESS_AUD`, `CF_TEAM_DOMAIN`, `AUTHORIZED_ADMIN_EMAIL`
- `REFERENCE/d1-setup.md` — Protected API endpoints
- `REFERENCE/decisions/` — ADR for auth architecture choice
