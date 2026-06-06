# TermSight

https://gemini.google.com/share/c76c44e10ecf

https://chatgpt.com/share/6a235c88-b1c4-83ea-93f6-77942bf9f867

A Chrome Extension + Node.js backend that automatically analyzes the privacy policies and terms of service of any website you visit, calculates a privacy score, and displays a clear "Privacy Facts" card — like a nutrition label for your data.

---

## Architecture

```
Chrome Extension (React + Vite + MV3)
        │
        │  POST /api/analyze  /  GET /api/profile/:domain
        ▼
  Node.js / Express Backend (TypeScript)
        │
        ├──► PostgreSQL (cache layer)
        └──► Firecrawl API (web scraping + AI extraction)
```

The extension **never** talks to Firecrawl directly. All API keys stay on the backend.

---

## Project Structure

```
privacy-facts/
├── README.md
├── .gitignore
├── docker-compose.yml
├── package.json
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── migrations/
│   │   └── 001_init.sql
│   └── src/
│       ├── index.ts              # Express app entry
│       ├── db.ts                 # PostgreSQL pool
│       ├── env.ts                # Typed config
│       ├── types.ts              # Shared TypeScript types
│       ├── normalize.ts          # URL/domain normalization
│       ├── hash.ts               # Policy text hashing
│       ├── policyPicker.ts       # URL relevance scoring
│       ├── firecrawl.ts          # Firecrawl API client
│       ├── extractionSchema.ts   # JSON extraction schema
│       ├── scoringPolicy.ts      # Scoring rules (exact policy)
│       ├── scoring.ts            # Score calculator
│       ├── analyzeDomain.ts      # Main analysis orchestrator
│       ├── dependencyAnalyzer.ts # Third-party service analysis
│       ├── freshness.ts          # Cache staleness / change detection
│       ├── mockData.ts           # Mock responses for dev mode
│       ├── seed.ts               # Database seeder
│       ├── scripts/
│       │   └── migrate.ts        # Migration runner
│       └── routes/
│           ├── analyze.ts
│           └── health.ts
└── extension/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   ├── manifest.json
    │   └── icons/
    │       ├── icon16.png
    │       ├── icon48.png
    │       └── icon128.png
    └── src/
        ├── background.ts
        ├── styles.css
        ├── main.tsx
        ├── popup/
        │   └── Popup.tsx
        ├── components/
        │   ├── PrivacyFactsCard.tsx
        │   ├── RiskRow.tsx
        │   ├── FlagList.tsx
        │   ├── DependencyCard.tsx
        │   ├── LoadingState.tsx
        │   └── ErrorState.tsx
        └── lib/
            ├── api.ts
            ├── grade.ts
            └── domain.ts
```

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- npm 9+
- Docker (for local PostgreSQL) — or a managed Postgres URL

### 1. Clone & Install

```bash
git clone <your-repo>
cd privacy-facts

# Install root workspace tools (optional helper scripts)
npm install
```

### 2. Start PostgreSQL

```bash
docker-compose up -d
```

This starts Postgres on `localhost:5432` with:
- Database: `privacy_facts`
- User: `postgres`
- Password: `postgres`

### 3. Configure Backend

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/privacy_facts
FIRECRAWL_API_KEY=         # Leave empty for mock mode
EXTENSION_ORIGIN=*
CACHE_TTL_DAYS=7
MAX_DEPENDENCIES=3
MAX_DEPENDENCY_DEPTH=1
MOCK_MODE=true             # Set to true for demo without Firecrawl
```

### 4. Run Database Migration

```bash
cd server
npm install
npm run migrate
```

### 5. Seed Demo Data

```bash
npm run seed
```

This inserts pre-analyzed profiles for:
- `randomshop.com` — poor score, has Stripe + Google Analytics dependencies
- `notion.so` — moderate score
- `stripe.com` — decent score
- `google.com` — advertising/analytics risk
- `example.com` — F score

### 6. Start Backend

```bash
npm run dev
```

Backend runs at `http://localhost:4000`.

### 7. Build & Load Extension

```bash
cd ../extension
npm install
npm run dev    # development build with HMR via Vite
# or
npm run build  # production build
```

Then in Chrome:
1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist` folder (after `npm run build`) or the `extension` folder (with `npm run dev` — see Vite/CRXJS docs)

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend HTTP port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `FIRECRAWL_API_KEY` | — | Firecrawl API key (empty = mock mode) |
| `EXTENSION_ORIGIN` | `*` | CORS allowed origin for extension |
| `CACHE_TTL_DAYS` | `7` | Days before a cached profile is considered stale |
| `MAX_DEPENDENCIES` | `3` | Max third-party services to analyze per domain |
| `MAX_DEPENDENCY_DEPTH` | `1` | Max recursion depth for dependency analysis |
| `MOCK_MODE` | `false` | `true` = skip Firecrawl, use mock data |

---

## Mock / Demo Mode

Set `MOCK_MODE=true` in `server/.env` to run the entire stack without a Firecrawl API key.

Mock data is defined in `server/src/mockData.ts` and covers:
- `example.com` → F score, many red flags
- `randomshop.com` → D score, Stripe + Google Analytics dependencies
- `notion.so` → B score, moderate privacy
- `stripe.com` → B+ score
- `google.com` → C score, advertising risk

---

## Database Setup

### Local Docker (Recommended for Dev)

```bash
docker-compose up -d
```

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Get the connection string from Settings → Database → Connection string (URI mode, port 5432)
3. Set `DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`

### Neon

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard
3. Set `DATABASE_URL=<neon-connection-string>`

### Railway

1. Add a PostgreSQL service
2. Copy the `DATABASE_URL` from the Variables tab

---

## Backend Commands

```bash
cd server
npm install         # Install dependencies
npm run migrate     # Run database migrations
npm run seed        # Seed demo data
npm run dev         # Start dev server (tsx watch)
npm run build       # Compile TypeScript
npm start           # Start compiled server
```

---

## Extension Commands

```bash
cd extension
npm install         # Install dependencies
npm run dev         # Start Vite dev server (HMR)
npm run build       # Production build → extension/dist/
npm run preview     # Preview production build
```

---

## Loading the Extension in Chrome

1. Run `npm run build` in `extension/`
2. Open `chrome://extensions`
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked**
5. Select `extension/dist/`
6. The Privacy Facts icon appears in your toolbar

For **development with hot reload** using CRXJS:
1. Run `npm run dev` in `extension/`
2. Load unpacked from `extension/dist/` (CRXJS outputs there)
3. Changes reload automatically

---

## How to Deploy Backend

### Render

1. Create a new **Web Service** from your repo
2. Set **Root Directory** to `server`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. Add environment variables in the Render dashboard
6. Add a **PostgreSQL** database service and copy the `DATABASE_URL`

### Railway

1. New project → Deploy from GitHub repo
2. Add a PostgreSQL plugin
3. Set the environment variables
4. Railway auto-detects Node.js — set start command to `npm start`

---

## How Scoring Works

The privacy score starts at **100** and applies deductions/bonuses across 7 categories:

| Category | Max Deduction | Max Bonus |
|---|---|---|
| Data Collection | -25 | — |
| Data Sharing | -30 | — |
| Data Retention | varies | +2 |
| Tracking & Surveillance | -10 | — |
| Legal Fairness | -10 | — |
| User Rights | — | +15 |
| Security Practices | — | +10 |

**Grade Mapping:**
- A+ = 90–100
- A = 85–89
- B = 70–74
- C = 55–59
- D = 40–49
- F = 0–39

Three additional scores are calculated:
- **Transparency Score** (0–100): How clearly the policy explains itself
- **Data Sensitivity Score** (0–100): How sensitive the data collected is
- **Adjusted Score**: Main score minus penalties for risky third-party dependencies

---

## How Third-Party Dependency Analysis Works

1. Firecrawl extracts a list of `third_party_services` from the policy text
2. The dependency analyzer filters for high-risk service categories (payments, analytics, advertising, identity verification, AI processing, data storage)
3. Up to `MAX_DEPENDENCIES` (default 3) services are analyzed
4. Each dependency's own privacy policy is analyzed at depth 1 (no further recursion)
5. Dependency scores penalize the main domain's **adjusted score**:
   - Advertising partner with grade C or worse: -5
   - Analytics partner with grade C or worse: -3
   - Payments partner with grade D/F: -3
   - AI processing with grade C or worse: -4
6. Maximum total penalty from dependencies: 15 points

---

## How Policy Change Detection Works

1. Every domain profile stores hashes of its policy documents in `policy_documents`
2. When a profile is stale (older than `CACHE_TTL_DAYS`), a freshness check is triggered
3. The backend scrapes the policy page again (markdown only, `maxAge: 0` to bypass Firecrawl cache)
4. The new markdown is normalized (whitespace, lowercase, "last updated" lines removed) and hashed with SHA-256
5. If the hash **matches**, only `last_checked_at` is updated (cheap operation)
6. If the hash **changed**, a `policy_versions` snapshot is saved and full re-extraction runs
7. The extension sees `is_stale: true` and `freshness_status: "checking_for_updates"` while the background refresh is in flight

---

## API Reference

### `GET /health`
```json
{ "ok": true, "service": "privacy-facts-api" }
```

### `POST /api/analyze`
```json
{ "url": "https://example.com/any/page" }
```
Returns the domain profile (may be `status: "processing"` on first request).

### `GET /api/profile/:domain`
Returns full profile including dependencies.

### `POST /api/analyze-now`
Developer route — forces immediate full re-analysis.
```json
{ "url": "https://example.com" }
```

### `POST /api/freshness/check/:domain`
Developer route — triggers a freshness/change-detection check.

---

## Troubleshooting

**Extension shows "Error" state**
- Confirm backend is running: `curl http://localhost:4000/health`
- Check `EXTENSION_ORIGIN` allows the extension origin (use `*` for dev)

**"processing" never becomes "ready"**
- Check server logs for Firecrawl errors
- Enable `MOCK_MODE=true` to bypass Firecrawl

**Migration fails**
- Ensure Postgres is running: `docker-compose ps`
- Check `DATABASE_URL` is correct

**Extension not reflecting localhost backend in production**
- Update `API_BASE` in `extension/src/lib/api.ts` to your deployed backend URL
- Rebuild the extension

**CORS errors**
- Set `EXTENSION_ORIGIN=*` in server `.env` for development

---

## Demo Script for Judges

```bash
# 1. Start everything
docker-compose up -d
cd server && npm install && npm run migrate && npm run seed && npm run dev &
cd extension && npm install && npm run build

# 2. Load extension in Chrome (chrome://extensions → Load unpacked → extension/dist)

# 3. Visit these sites to demo:
#    - randomshop.com (D grade, Stripe + GA dependencies)
#    - google.com     (C grade, advertising flags)
#    - notion.so      (B grade, moderate)
#    - stripe.com     (B+ grade)
#    - example.com    (F grade, red flags)

# 4. Show the Privacy Facts popup card
# 5. Point out: red/amber/green flags, adjusted score, dependency cards
# 6. Show policy change detection:
curl -X POST http://localhost:4000/api/freshness/check/notion.so
```

---

## License

MIT
