# Privacy Facts — ToS & Privacy Translator

> A Chrome Extension that reads privacy policies so you don't have to.

Privacy Facts automatically analyzes the privacy policy and terms of service of any website you visit and shows you a clear, plain-English **Privacy Facts card** — like a nutrition label for your data. It calculates a letter grade (A+ to F), highlights red flags, and even scores the third-party services a website depends on.

---

## How It Works

When you visit a website, the extension sends the URL to a backend server. The server finds the privacy policy using Firecrawl, extracts structured risk data using AI, calculates a privacy score, and caches the result. Results are returned to the extension in seconds.

```
You visit a website
       │
       ▼
Chrome Extension  ──►  Backend (Vercel)  ──►  Firecrawl (scraping + AI)
                              │
                              ▼
                        PostgreSQL (Neon)
                        cached results
```

The extension **never** talks to Firecrawl directly — your API keys stay on the server.

---

## Deployment Guide (Vercel + Neon)

### What you need

| Account | Link | Cost |
|---|---|---|
| GitHub | github.com | Free |
| Vercel | vercel.com | Free |
| Neon (PostgreSQL) | neon.tech | Free |
| Firecrawl (optional) | firecrawl.dev | Free tier |

---

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push
```

---

### Step 2 — Create a Neon database

1. Go to [neon.tech](https://neon.tech) → **Create Project** → name it `privacy-facts`
2. From the dashboard, go to **Connection Details**
3. Copy the **Connection string** — it looks like:
   ```
   postgresql://neondb_owner:xxxx@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   Save this for Step 3.

---

### Step 3 — Deploy the backend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. In the configure screen, set **Root Directory** to `server`
3. Under **Environment Variables**, add all of these:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string from Step 2 |
| `FIRECRAWL_API_KEY` | Your Firecrawl key — or leave empty to use mock mode |
| `MOCK_MODE` | `true` if no Firecrawl key, `false` if you have one |
| `EXTENSION_ORIGIN` | `*` |
| `CACHE_TTL_DAYS` | `7` |
| `MAX_DEPENDENCIES` | `3` |
| `MAX_DEPENDENCY_DEPTH` | `1` |
| `ADMIN_SECRET` | Any strong password you make up (e.g. `mySecret2026!`) |
| `VERCEL` | `1` |

4. Click **Deploy** and wait about 30 seconds.

Your backend URL will be something like `https://privacy-facts-xyz.vercel.app`. Save it.

---

### Step 4 — Set up the database (run once)

Replace `YOUR-BACKEND-URL` and `YOUR-ADMIN-SECRET` with your actual values:

```bash
# Create the database tables
curl -X POST https://YOUR-BACKEND-URL/admin/migrate \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR-ADMIN-SECRET" \
  -d '{}'
```

Expected response:
```json
{ "ok": true, "message": "Migration completed" }
```

---

### Step 5 — Seed demo data (recommended)

This pre-loads results for 5 demo domains so the extension works instantly:

```bash
curl -X POST https://YOUR-BACKEND-URL/admin/seed \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: YOUR-ADMIN-SECRET" \
  -d '{}'
```

Expected response:
```json
{ "ok": true, "seeded": ["example.com","randomshop.com","notion.so","stripe.com","google.com"] }
```

---

### Step 6 — Build the Chrome extension

```bash
cd extension

# Set your backend URL
echo "VITE_API_BASE=https://YOUR-BACKEND-URL" > .env.production

# Build
npm install
npm run build
```

Verify the URL was included:
```bash
grep -o '"https://[^"]*vercel[^"]*"' dist/assets/grade-*.js
```

---

### Step 7 — Install the extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder

The Privacy Facts icon appears in your Chrome toolbar.

---

### Step 8 — Test it

Visit these seeded sites and click the extension icon:

| Website | Expected Grade | Notes |
|---|---|---|
| `https://notion.so` | B | Perpetual content license flag |
| `https://stripe.com` | B+ | Strong security practices |
| `https://google.com` | C | Cross-site tracking, advertising |
| `https://randomshop.com` | D | Stripe + Google Analytics dependencies |
| `https://example.com` | F | Worst-case scenario |

---

### Redeploying after changes

**Backend changes** → push to GitHub, Vercel auto-deploys.

**Extension changes:**
```bash
cd extension && npm run build
# Then in chrome://extensions → click the refresh icon on Privacy Facts
```

---

## Features

- **Privacy grade** — A+ to F score based on 7 categories
- **Plain-English flags** — red, amber, and green flags with evidence quotes from the policy
- **Third-party dependency analysis** — scores the services your site depends on (Stripe, Google Analytics, etc.)
- **Adjusted score** — main score penalized by risky dependencies
- **Policy change detection** — detects when a privacy policy changes and re-analyzes
- **Mock mode** — works fully without a Firecrawl API key (great for demos)

---

## Local Development

### Requirements

- Node.js 18+
- Docker (for local Postgres)

### Setup

```bash
# Start local database
docker-compose up -d

# Backend
cd server
cp .env.example .env     # set MOCK_MODE=true for local dev
npm install
npm run migrate
npm run seed
npm run dev              # runs at http://localhost:4000

# Extension (in a new terminal)
cd extension
npm install
npm run dev
```

Load the extension from `extension/dist/` in `chrome://extensions`.

---

## API Keys Reference

| Key | Where to get it | Where to add it |
|---|---|---|
| `DATABASE_URL` | Neon dashboard → Connection Details | Vercel env vars |
| `FIRECRAWL_API_KEY` | [firecrawl.dev](https://firecrawl.dev) → Dashboard → API Keys | Vercel env vars |
| `ADMIN_SECRET` | Make it up (any strong string) | Vercel env vars + your `curl` commands |

> **No Firecrawl key?** Set `MOCK_MODE=true` and `FIRECRAWL_API_KEY=` (empty). The app uses built-in mock data and works fully for demos.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Extension shows "Analysis Failed" | Check that `VITE_API_BASE` in `.env.production` is your real Vercel URL (not the placeholder). Rebuild. |
| `/admin/migrate` returns 401 | The `x-admin-secret` header must exactly match `ADMIN_SECRET` in Vercel env vars |
| `/health` shows `"db":"error"` | Neon free tier auto-pauses. Open Neon dashboard → Resume the project |
| Badge stuck on "..." | Visit one of the 5 seeded domains, or enable `MOCK_MODE=true` on Vercel |
| Analysis works in `curl` but not extension | Remove the extension in Chrome and re-add it (don't just click refresh — fully remove and reload unpacked) |

---

## Project Details

### Scoring

Privacy score starts at **100** and applies deductions and bonuses across 7 categories:

| Category | Max Deduction | Max Bonus |
|---|---|---|
| Data Collection | −25 | — |
| Data Sharing | −30 | — |
| Data Retention | −10 | +2 |
| Tracking & Surveillance | −10 | — |
| Legal Fairness | −10 | — |
| User Rights | — | +15 |
| Security Practices | — | +10 |

**Grade scale:**

| Grade | Score |
|---|---|
| A+ | 90–100 |
| A | 85–89 |
| B+ | 75–79 |
| B | 70–74 |
| C | 55–59 |
| D | 40–49 |
| F | 0–39 |

Three additional scores are shown alongside the main grade:
- **Transparency Score** (0–100) — how clearly the policy explains itself
- **Data Sensitivity Score** (0–100) — how sensitive the data types collected are
- **Adjusted Score** — main score minus penalty for risky third-party dependencies (max −15)

### Third-Party Dependency Analysis

1. Firecrawl extracts a list of third-party services from the policy text (e.g. Stripe, Google Analytics)
2. Up to 3 services are analyzed — prioritizing high-risk categories: payments, analytics, advertising, identity verification, AI processing
3. Each dependency's own privacy policy is analyzed (depth 1 only, no further recursion)
4. Dependency grades apply penalties to the main domain's adjusted score:

| Dependency type | Condition | Penalty |
|---|---|---|
| Advertising | Grade C or worse | −5 |
| Analytics | Grade C or worse | −3 |
| AI Processing | Grade C or worse | −4 |
| Identity Verification | Grade C or worse | −4 |
| Payments | Grade D or worse | −3 |
| Data Storage | Grade D or worse | −2 |

Maximum total dependency penalty: **−15 points**

### Policy Change Detection

1. When a policy is first analyzed, its content is normalized (whitespace, "last updated" lines removed) and hashed with SHA-256
2. When a cached profile becomes stale (after `CACHE_TTL_DAYS`), the policy is re-scraped
3. If the hash is unchanged → only `last_checked_at` is updated (cheap)
4. If the hash changed → a version snapshot is saved, full re-extraction runs, score is updated
5. The extension shows "Policy changed [date]" when a change is detected

### Project Structure

```
privacy-facts/
├── server/                     # Node.js + Express backend
│   ├── api/index.ts            # Vercel serverless entry point
│   ├── vercel.json             # Vercel routing config
│   ├── migrations/001_init.sql # Database schema
│   └── src/
│       ├── index.ts            # Express app
│       ├── db.ts               # PostgreSQL pool
│       ├── env.ts              # Typed config
│       ├── types.ts            # Shared TypeScript interfaces
│       ├── normalize.ts        # URL/domain normalization
│       ├── hash.ts             # Policy text hashing
│       ├── policyPicker.ts     # URL relevance scoring
│       ├── firecrawl.ts        # Firecrawl API client
│       ├── extractionSchema.ts # AI extraction schema + prompt
│       ├── scoringPolicy.ts    # Scoring rules (exact policy)
│       ├── scoring.ts          # Score calculator
│       ├── analyzeDomain.ts    # Main analysis orchestrator
│       ├── dependencyAnalyzer.ts
│       ├── freshness.ts        # Cache & change detection
│       ├── mockData.ts         # Mock responses for dev/demo
│       ├── seed.ts             # Database seeder
│       └── routes/
│           ├── analyze.ts      # POST /api/analyze, GET /api/profile/:domain
│           ├── health.ts       # GET /health
│           └── admin.ts        # POST /admin/migrate, /admin/seed
└── extension/                  # Chrome Extension (React + Vite + MV3)
    ├── public/manifest.json
    └── src/
        ├── background.ts       # Service worker (badge updates)
        ├── popup/Popup.tsx     # Main popup logic
        └── components/
            ├── PrivacyFactsCard.tsx
            ├── RiskRow.tsx
            ├── FlagList.tsx
            ├── DependencyCard.tsx
            ├── LoadingState.tsx
            └── ErrorState.tsx
```

### Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome MV3, React, TypeScript, Vite, Tailwind CSS, @crxjs/vite-plugin |
| Backend | Node.js, Express, TypeScript, Zod, dotenv |
| Database | PostgreSQL (Neon / Supabase / Railway / local Docker) |
| Scraping | Firecrawl (map + scrape with AI JSON extraction) |
| Hosting | Vercel (serverless) |

---

## License

MIT
