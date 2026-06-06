# Privacy Facts — Vercel Deployment Guide

Everything you need to go from code to a live extension in ~15 minutes.

---

## What you will need

| Thing | Where to get it | Cost |
|---|---|---|
| GitHub account | github.com | Free |
| Vercel account | vercel.com | Free |
| Neon account (PostgreSQL) | neon.tech | Free |
| Firecrawl API key (optional) | firecrawl.dev | Free tier available |

---

## Step 1 — Push to GitHub

```bash
cd /path/to/privacy-facts   # your project root

git init                    # skip if already a repo
git add .
git commit -m "Initial commit"

# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/privacy-facts.git
git push -u origin main
```

---

## Step 2 — Create a Neon PostgreSQL Database

1. Go to **[neon.tech](https://neon.tech)** → Sign up / Log in → **Create Project**
2. Name it `privacy-facts` → choose the region closest to you → **Create**
3. In the dashboard, go to **Connection Details**
4. Copy the **Connection string** — it looks like:
   ```
   postgresql://neondb_owner:XXXX@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   **Save this. You will use it in Step 3.**

---

## Step 3 — Deploy the Backend to Vercel

1. Go to **[vercel.com](https://vercel.com)** → **Add New Project** → **Import Git Repository**
2. Select the `privacy-facts` repo you pushed in Step 1
3. In the **Configure Project** screen:
   - **Root Directory**: set to `server` ← very important
   - **Framework Preset**: Other
   - **Build Command**: *(leave blank — Vercel auto-detects from vercel.json)*
   - **Output Directory**: *(leave blank)*
4. Expand **Environment Variables** and add **all of the following**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string from Step 2 |
| `FIRECRAWL_API_KEY` | Your Firecrawl key (or leave empty for mock mode) |
| `EXTENSION_ORIGIN` | `*` |
| `CACHE_TTL_DAYS` | `7` |
| `MAX_DEPENDENCIES` | `3` |
| `MAX_DEPENDENCY_DEPTH` | `1` |
| `MOCK_MODE` | `false` (or `true` if no Firecrawl key) |
| `ADMIN_SECRET` | Any strong secret string you invent, e.g. `myS3cr3t!2026` |
| `VERCEL` | `1` |

5. Click **Deploy** → wait ~60 seconds

6. After deploy, note your backend URL. It will be something like:
   ```
   https://privacy-facts-abc123.vercel.app
   ```
   **Save this. You will use it in Step 4 and Step 5.**

---

## Step 4 — Run the Database Migration

This creates the 4 tables. You only run this once.

```bash
curl -X POST https://YOUR-BACKEND.vercel.app/admin/migrate \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{}'
```

Expected response:
```json
{ "ok": true, "message": "Migration completed" }
```

---

## Step 5 — Seed Demo Data (Recommended for Demo/Hackathon)

This inserts pre-analyzed profiles for 5 domains so the app works instantly without Firecrawl.

```bash
curl -X POST https://YOUR-BACKEND.vercel.app/admin/seed \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR_ADMIN_SECRET" \
  -d '{}'
```

Expected response:
```json
{ "ok": true, "seeded": ["example.com","randomshop.com","notion.so","stripe.com","google.com"] }
```

---

## Step 6 — Build the Extension for Production

Back on your local machine:

1. Create the production env file:
   ```bash
   cd extension
   cp .env.example .env.production
   ```

2. Edit `extension/.env.production` — set your deployed backend URL:
   ```env
   VITE_API_BASE=https://YOUR-BACKEND.vercel.app
   ```

3. Build:
   ```bash
   npm run build
   ```
   This produces `extension/dist/` — your installable extension.

---

## Step 7 — Install the Extension in Chrome

1. Open Chrome and go to: `chrome://extensions`
2. Toggle **Developer mode** ON (top-right corner)
3. Click **Load unpacked**
4. Browse to and select the `extension/dist/` folder
5. The **Privacy Facts** icon appears in your Chrome toolbar

---

## Step 8 — Test It

### Quick smoke test (browser)

Open these URLs — the extension badge should show a grade within a few seconds:

| Site | Expected Grade | Notes |
|---|---|---|
| `https://randomshop.com` | D | Seeded — Stripe + GA dependencies |
| `https://notion.so` | B | Seeded |
| `https://stripe.com` | B+ | Seeded |
| `https://google.com` | C | Seeded |
| `https://example.com` | F | Seeded — worst case |

### Click the extension icon

You should see:
- Large grade letter (A–F) in a color-coded card
- Overall score (e.g. 72/100)
- Adjusted score (if dependencies change it)
- 6 risk rows: Data Monetization, Precision Tracking, etc.
- Flags tab: red / amber / green flags with evidence
- 3rd Party tab: dependency service cards with their grades

### API health check

```bash
curl https://YOUR-BACKEND.vercel.app/health
# → { "ok": true, "service": "privacy-facts-api", "db": "connected" }
```

### Test a new domain via API

```bash
curl -X POST https://YOUR-BACKEND.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'
```

If `MOCK_MODE=false` and you have a Firecrawl key, this will trigger real analysis.
If `MOCK_MODE=true`, it returns a moderate mock result.

---

## API Keys Reference

### Firecrawl (for real policy scraping)

1. Go to [firecrawl.dev](https://firecrawl.dev) → Sign up → Dashboard → **API Keys**
2. Copy your key (starts with `fc-`)
3. Add to Vercel environment variables as `FIRECRAWL_API_KEY`
4. Set `MOCK_MODE=false`
5. Redeploy (Vercel > Deployments > Redeploy)

**Without a Firecrawl key:** set `MOCK_MODE=true` and the app uses built-in mock data for the 5 seeded domains. For any other domain it returns a generic moderate result.

### Admin Secret (your own invention)

`ADMIN_SECRET` is just a password you make up. It protects the `/admin/migrate` and `/admin/seed` endpoints. Use any strong string — store it somewhere safe.

---

## Redeploying After Changes

**Backend changes:** just push to GitHub — Vercel auto-deploys.

**Extension changes:**
```bash
cd extension
npm run build         # rebuild with production env
# Reload the extension in chrome://extensions → click the refresh icon
```

---

## Troubleshooting

**Vercel deploy fails:**
- Make sure **Root Directory** is set to `server` in Vercel project settings
- Check build logs in Vercel dashboard → Deployments → (latest) → Functions

**`/admin/migrate` returns 401:**
- The `x-admin-secret` header value must exactly match the `ADMIN_SECRET` env var on Vercel
- Go to Vercel → Project → Settings → Environment Variables to verify

**`/health` returns `"db": "error"`:**
- The `DATABASE_URL` is wrong or Neon is paused (free tier auto-pauses after inactivity)
- Open Neon dashboard → your project → click **Resume** if paused

**Extension shows "Analysis Failed":**
- Open DevTools in the extension popup (right-click → Inspect)
- Check that the `VITE_API_BASE` in `.env.production` matches your Vercel URL exactly (no trailing slash)
- Rebuild the extension after changing the env file

**Badge never updates from "...":**
- Means the backend returned `status: "processing"` but never finished
- Check Vercel function logs for errors
- If using Firecrawl, check your API key quota at firecrawl.dev dashboard

**CORS errors in extension console:**
- `EXTENSION_ORIGIN` should be `*` on Vercel env vars
- Redeploy after changing env vars

---

## Summary of All URLs

| What | URL |
|---|---|
| Backend health | `https://YOUR-BACKEND.vercel.app/health` |
| Analyze a domain | `POST https://YOUR-BACKEND.vercel.app/api/analyze` |
| Get a profile | `GET https://YOUR-BACKEND.vercel.app/api/profile/:domain` |
| Run migration | `POST https://YOUR-BACKEND.vercel.app/admin/migrate` |
| Seed demo data | `POST https://YOUR-BACKEND.vercel.app/admin/seed` |
| Check freshness | `POST https://YOUR-BACKEND.vercel.app/api/freshness/check/:domain` |
