# E-Commerce Sales Analytics — Full Stack (FastAPI + PostgreSQL + React)

```
ecommerce_fullstack/
├── backend/
│   ├── main.py            <- FastAPI app: REST endpoints
│   ├── database.py         <- SQLAlchemy engine/session setup
│   ├── models.py            <- Order table definition
│   ├── analytics.py         <- CRUD + analytics (SQL queries)
│   ├── docker-compose.yml   <- local PostgreSQL for development
│   ├── .env.example
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx          <- responsive dashboard UI
        ├── api.js           <- fetch() wrapper for the backend
        └── index.css        <- includes mobile/tablet/desktop breakpoints
```

Data is now stored in **PostgreSQL** (previously in-memory) — orders survive
backend restarts. The UI is **responsive**: full dashboard layout on
desktop/laptop, 2-column metrics on tablets, and the orders table collapses
into stacked cards on phones.

---

## Run it locally

### 1. Start a local PostgreSQL

```bash
cd backend
docker compose up -d
cp .env.example .env
```

(No Docker? Install PostgreSQL directly and create a database named
`sales_analytics`, then point `DATABASE_URL` in `.env` at it.)

### 2. Run the backend

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

First run auto-creates the `orders` table and seeds it with 3 starter rows.
Docs: http://localhost:8000/docs

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173).

---

## Deploying to a live URL

Three pieces to deploy: the **database** (PostgreSQL), the **backend**
(FastAPI), and the **frontend** (static React build). Recommended free
combo — Neon (database) + Render (backend) + Vercel (frontend):

### Step 1 — Push your code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
```
Create a new repo on GitHub and push (`git remote add origin ...`, `git push`).

### Step 2 — Create a free PostgreSQL database on Neon

Render's free Postgres expires after 30 days; Neon's free tier does not, so
it's the better choice for something you want to keep running.

1. Go to https://neon.tech → sign up → **Create a project**.
2. Copy the connection string it gives you (starts with `postgresql://`).
3. Change it to the SQLAlchemy driver format: replace
   `postgresql://` with `postgresql+psycopg2://` at the start.
   Keep `?sslmode=require` at the end if Neon included it.

### Step 3 — Deploy the backend on Render

1. Go to https://render.com → sign up (no card needed for the free tier) →
   **New +** → **Web Service** → connect your GitHub repo.
2. Set:
   - **Root directory**: `backend`
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Under **Environment**, add:
   - `DATABASE_URL` = the Neon connection string from Step 2
   - `CORS_ORIGINS` = `*` for now (you'll tighten this in Step 5)
4. Click **Create Web Service**. Render builds and deploys automatically.
   Note the URL it gives you, e.g. `https://your-app.onrender.com`.
5. Confirm it works: open `https://your-app.onrender.com/health` in a browser.

> Free-tier note: the service spins down after 15 minutes idle and takes
> 30–60 seconds to wake up on the next request. That's fine for a demo;
> upgrade to a paid Starter instance (~$7/mo) if you need it always-on.

### Step 4 — Deploy the frontend on Vercel

1. In `frontend/src/api.js`, change:
   ```js
   const API_URL = 'http://localhost:8000'
   ```
   to your Render URL:
   ```js
   const API_URL = 'https://your-app.onrender.com'
   ```
   Commit and push this change.
2. Go to https://vercel.com → sign up → **Add New** → **Project** →
   import the same GitHub repo.
3. Set:
   - **Root directory**: `frontend`
   - **Framework preset**: Vite (auto-detected)
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
4. Click **Deploy**. Vercel gives you a live URL like
   `https://your-app.vercel.app`.

### Step 5 — Lock down CORS

Back in Render, update the `CORS_ORIGINS` env var to your real Vercel URL
instead of `*`:
```
CORS_ORIGINS=https://your-app.vercel.app
```
Save — Render redeploys automatically. This ensures only your frontend
(not just anyone) can call your API.

### You're live

Visit your Vercel URL — it's now a real, publicly reachable app talking to
a FastAPI backend on Render, backed by a persistent Postgres database on
Neon.

### Alternatives worth knowing

- **Railway** (https://railway.app) — similar to Render, one-click Postgres
  + web service, usage-based pricing with a starter credit.
- **Fly.io** — more control, requires a Dockerfile and their CLI; a good
  next step once you outgrow Render's free tier.
- **Netlify** — a solid alternative to Vercel for the frontend; same
  workflow (connect repo, set build command/output dir).

Always re-check current free-tier limits on each provider's pricing page
before committing — they change fairly often.
